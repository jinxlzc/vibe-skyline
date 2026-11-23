import { FIRST, firstEditionLockup } from "./first-edition";
import Module from "manifold-3d";
import type { Manifold, ManifoldToplevel, Vec2 } from "manifold-3d";
import type { BuildPlan, MaterialBudget } from "@vibeskyline/contracts";
import {
  layoutText,
  type EngravingOptions,
  type IdentityMeasurement,
  type TextMeasurement,
} from "./engraving";
import type { NameSize } from "./layout";
export { findNameLayoutAlternatives } from "./layout";
import { layoutName, layoutPlinth, offset, originalTile } from "./layout";
export { measureFeatures } from "./features";
export { layoutText } from "./engraving";
export type {
  EngravingOptions,
  TextMeasurement,
  IdentityMeasurement,
} from "./engraving";
export type Mesh = { vertices: number[]; triangles: number[] };
export type Geometry = {
  lockup?: Pick<ReturnType<typeof firstEditionLockup>, "logo" | "name" | "year">;
  mono: Mesh;
  regions: { color: string; mesh: Mesh; roleKeys?: string[]; slot?: number }[];
  budget: MaterialBudget;
  plan?: BuildPlan;
  coupon?: {
    width: number;
    height: number;
    strokeMm: number;
    gapMm: number;
    name: TextMeasurement;
    latin: TextMeasurement;
    annotations: Array<{ region: string; measurement: TextMeasurement }>;
    specimens: Array<{
      size: NameSize;
      measurement: TextMeasurement;
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
    }>;
  };
  identity?: IdentityMeasurement;
  logoMeasurements?: Array<{
    discardedSubmicronIslands?: number;
    minStrokeMm: number | null;
    minGapMm: number | null;
    method: string;
    sizeMm: number;
    qualified: boolean;
  }>;
};
let runtime: Promise<ManifoldToplevel> | undefined;
export function initGeometry(wasmURL?: string) {
  runtime ??= Module(wasmURL ? { locateFile: () => wasmURL } : undefined).then(
    (m) => {
      m.setup();
      return m;
    },
  );
  return runtime;
}
function meshOf(m: Manifold): Mesh {
  if (m.status() !== "NoError")
    throw Error("Manifold boolean failed: " + m.status());
  const g = m.getMesh(),
    vertices: number[] = [];
  for (let i = 0; i < g.vertProperties.length; i += g.numProp)
    vertices.push(...g.vertProperties.slice(i, i + 3));
  return { vertices, triangles: Array.from(g.triVerts) };
}
// On the 256 mm bed, every 2^-16 mm XY coordinate is exactly representable
// by both the section clipper and the exported Float32 mesh. Snap the physical
// endpoints once, before booleans, so nominally aligned boundaries cannot
// form thin cap triangles that collapse during serialization.
const planarCoord = (mm: number) => Math.round(mm * 65536) / 65536;
function solids(m: ManifoldToplevel, assignments?: Record<string, number>) {
  const owned: { delete(): void }[] = [];
  function own<T extends { delete(): void }>(item: T) {
    owned.push(item);
    return item;
  }
  const parts = new Map<
    string,
    { color: string; solids: Manifold[]; roles: Set<string>; slot?: number }
  >();
  function add(role: string, color: string, solid: Manifold) {
    const slot = assignments?.[role],
      key = slot === undefined ? color.toUpperCase() : "slot:" + slot;
    let group = parts.get(key);
    if (!group) {
      group = { color, solids: [], roles: new Set(), slot };
      parts.set(key, group);
    }
    if (group.color.toUpperCase() !== color.toUpperCase())
      throw Error(
        "Slot " +
          slot +
          " has conflicting colors. Align the colors or choose another slot.",
      );
    group.roles.add(role);
    group.solids.push(solid);
  }
  function extrude(
    paths: Vec2[][],
    height: number,
    z: number,
    fill: "EvenOdd" | "NonZero" = "EvenOdd",
  ) {
    const aligned = paths.map(path =>
      path.map(([x, y]): Vec2 => [planarCoord(x), planarCoord(y)]),
    );
    const section = own(new m.CrossSection(aligned, fill));
    if (section.isEmpty()) throw Error("Empty outline after boolean fill");
    return own(own(section.extrude(height)).translate([0, 0, z]));
  }
  function box(x: number, y: number, z: number, w: number, d: number, h: number) {
    const x0 = planarCoord(x), y0 = planarCoord(y);
    const shape = own(m.Manifold.cube([planarCoord(x + w) - x0, planarCoord(y + d) - y0, h]));
    return own(shape.translate([x0, y0, z]));
  }
  function finish(density: number, boundary: number | null): Geometry {
    const groups = [...parts.values()].map((g) => ({
      ...g,
      body: own(m.Manifold.union(g.solids)),
    }));
    const regions = groups.map((g) => ({
      color: g.color,
      roleKeys: [...g.roles],
      ...(g.slot === undefined ? {} : { slot: g.slot }),
      mesh: meshOf(g.body),
    }));
    const mono = meshOf(own(m.Manifold.union(groups.map((g) => g.body))));
    const materials = regions.map(({ mesh, ...metadata }, id) => {
      const volumeCm3 = Math.abs(meshVolume(mesh)) / 1000;
      return { ...metadata, id, volumeCm3, grams: volumeCm3 * density };
    });
    const totalVolumeCm3 = materials.reduce((n, m) => n + m.volumeCm3, 0);
    return {
      mono,
      regions,
      budget: {
        count: materials.length,
        overCapacity: false,
        density,
        materials,
        totalVolumeCm3,
        totalGrams: totalVolumeCm3 * density,
        purge: "unknown until sliced",
        printTime: "unknown until sliced",
        twoToneBoundary: boundary,
      },
    };
  }
  return {
    own,
    add,
    extrude,
    box,
    finish,
    dispose: () => {
      for (const item of owned.reverse()) item.delete();
    },
  };
}
export async function generateGeometry(
  input: BuildPlan,
  fontBytes: ArrayBuffer,
  options: EngravingOptions = {},
) {
  if(input.recipe.layout === "first-edition") return generateFirstEdition(input,fontBytes,options);
  const { plan, identity, yearPaths, namePaths, tiles } = layoutPlinth(
    input,
    fontBytes,
    options,
  );
  const m = await initGeometry(),
    builder = solids(m, plan.recipe.slotAssignments);
  const { own, add, extrude, box } = builder;
  try {
    const base = extrude(
      [
        [
          [6, 0],
          [plan.width, 0],
          [plan.width, plan.depth],
          [0, plan.depth],
          [0, 6],
        ],
      ],
      3.2,
      0,
    );
    const cuts = plan.solids
      .filter((s) => s.kind === "recess")
      .map((s) => box(s.x, s.y, 2.8, s.w, s.d, 0.6));
    add(
      "base",
      plan.recipe.baseColor,
      cuts.length ? own(base.subtract(own(m.Manifold.union(cuts)))) : base,
    );
    for (const s of plan.solids)
      if (s.kind === "tower") {
        const district = plan.districts.find(
          (d) => s.y >= d.y - 0.001 && s.y < d.y + 19.6,
        );
        if (!district) throw Error("Tower lies outside source district");
        add(
          "source:" + district.id,
          s.color,
          box(s.x, s.y, s.z, s.w, s.d, s.h),
        );
      }
    for (const paths of [yearPaths, namePaths])
      if (paths.length)
        add("text", plan.recipe.textColor, extrude(paths, 0.6, 3.2, "NonZero"));
    tiles.forEach((tile, i) => {
      if (tile)
        add(
          "logo",
          plan.recipe.logoColor,
          extrude(
            offset(tile.paths, 4, plan.districts[i].y),
            0.6,
            3.2,
            tile.fillRule,
          ),
        );
    });
    const result=builder.finish(plan.recipe.density,plan.recipe.tier === 'two-tone' ? 3.2 : null);
    plan.diagnostics=plan.diagnostics.filter(d=>!d.includes('Material capacity'));
    return {...result,plan,identity,logoMeasurements:tiles.flatMap(t=>t?.measurements?[t.measurements]:[])};

  } finally {
    builder.dispose();
  }
}
async function generateFirstEdition(input:BuildPlan,bytes:ArrayBuffer,options:EngravingOptions):Promise<Geometry & {plan:BuildPlan;identity:IdentityMeasurement}> {
 const lock = firstEditionLockup(input,bytes,options),m=await initGeometry(),b=solids(m,input.recipe.slotAssignments);
 const {own,add,extrude,box}=b, {width:w,depth:d}=input, {side,front,height:h}=FIRST;
 try {
  const base=own(m.Manifold.hull([[0,0,0],[w,0,0],[w,d,0],[0,d,0],
    [side,front,h],[w-side,front,h],[w-side,d-side,h],[side,d-side,h]]));
  const frontMark=(paths:Vec2[][],fill:"EvenOdd"|"NonZero"="NonZero")=>own(own(extrude(paths,1.1,-.3,fill).rotate([60,0,0])).translate([0,0,0]));
  const marks=[frontMark(lock.namePaths),frontMark(lock.yearPaths),...(lock.logoPaths.length?[frontMark(lock.logoPaths,lock.tile?.fillRule??"EvenOdd")]:[])];
  const recesses=input.solids.filter(s=>s.kind==='recess').map(s=>box(s.x,s.y,13.6,s.w,s.d,.8));
  // Subtract embedded relief from the base: separate material volumes never overlap.
  const cuts=own(m.Manifold.union([...marks,...recesses]));
  add('base',input.recipe.baseColor,own(base.subtract(cuts)));
  const towers=input.solids.filter(s=>s.kind==='tower').map(s=>{const solid=box(s.x,s.y,14,s.w,s.d,s.h);add('source:'+input.districts[0].id,s.color,solid);return solid;});
  add('text',input.recipe.textColor,marks[0]);add('text',input.recipe.textColor,marks[1]);
  if(marks[2]) add('logo',input.recipe.logoColor,marks[2]);
  const result=b.finish(input.recipe.density,null);
  // Use the original overlapping solids for the mono union, avoiding cancellation slivers from subtracting then re-adding tilted relief.
  const monoBase=recesses.length?own(base.subtract(own(m.Manifold.union(recesses)))):base;
  result.mono=meshOf(own(m.Manifold.union([monoBase,...marks,...towers])));
  const bounds=validateMesh(result.mono).bounds;
  const plan={...input,width:bounds[0],depth:bounds[1],height:bounds[2]};
  return {...result,plan,lockup:{logo:lock.logo,name:lock.name,year:lock.year},
    identity:{name:lock.nameText.report,year:lock.yearText.report,frontBandMm:lock.face,namePlacement:'front',nameSize:input.recipe.nameSize},
    logoMeasurements:lock.tile?.measurements?[lock.tile.measurements]:[]};
 } finally {b.dispose();}
}
export async function generateCalibrationCoupon(
  fontBytes: ArrayBuffer,
  options: EngravingOptions = {},
) {
  const sizes: NameSize[] = ["small", "medium", "large"];
  const latinBytes = options.couponLatinFontBytes ?? fontBytes;
  const rows = sizes.map((size) => ({
    size,
    label: layoutText(size[0].toUpperCase(), latinBytes, options, 6, 30),
    han: layoutName("天际线", fontBytes, options, size, 220),
    latin: layoutName("jinxlzc", latinBytes, options, size, 220),
  }));
  const digits = layoutText("0123456789", latinBytes, options, 5, 220);
  const dense = layoutName("曦馨罐", fontBytes, options, "medium", 220);
  const hanX = 8 + Math.max(...rows.map((row) => row.label.width));
  const latinX = hanX + 4 + Math.max(...rows.map((row) => row.han.width));
  const width = Math.ceil(
    Math.max(
      56 + digits.width,
      4 + dense.width,
      latinX + Math.max(...rows.map((row) => row.latin.width)),
    ) + 4,
  );
  const heights = rows.map(
    ({ label, han, latin }) =>
      Math.max(label.height, han.height, latin.height) + 4,
  );
  const height = Math.ceil(
    8 + Math.max(12, digits.height) + dense.height + heights.reduce((a, b) => a + b, 0) + 4,
  );
  const m = await initGeometry(),
    builder = solids(m, { base: 1, text: 2, logo: 2, calibration: 2 });
  const { extrude, add } = builder;
  try {
    if (width > 246 || height > 246)
      throw Error("Calibration coupon exceeds the A1 bed clearance");
    add(
      "base",
      "#DAD4C6",
      extrude(
        [
          [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height],
          ],
        ],
        3.2,
        0,
      ),
    );
    const relief = (role: string, paths: Vec2[][]) =>
      add(role, "#25354A", extrude(paths, 0.6, 3.2, "NonZero"));
    let top = height - 4;
    const specimens: NonNullable<Geometry["coupon"]>["specimens"] = [];
    for (const [i, row] of rows.entries()) {
      const y = top - heights[i] + 4;
      relief("text", offset(row.label.paths, 4, y));
      for (const [item, x] of [
        [row.han, hanX],
        [row.latin, latinX],
      ] as const) {
        relief("text", offset(item.paths, x, y));
        specimens.push({
          size: row.size,
          measurement: item.report,
          xMm: x,
          yMm: y,
          widthMm: item.width,
          heightMm: item.height,
        });
      }
      top -= heights[i];
    }
    const denseY = top - dense.height;
    relief("text", offset(dense.paths, 4, denseY));
    specimens.push({
      size: "medium", measurement: dense.report, xMm: 4, yMm: denseY,
      widthMm: dense.width, heightMm: dense.height,
    });
    relief("text", offset(digits.paths, 56, 3));
    const { han, latin } = rows[1];
    const annotations = [
      ...rows.map((row) => ({
        region: "label-" + row.size,
        measurement: row.label.report,
      })),
      { region: "digits", measurement: digits.report },
    ];
    for (const [i, id] of ["github", "codex", "gemini"].entries())
      relief("logo", offset(originalTile(id).paths, 4 + i * 12, 3));
    const bars: Vec2[][] = Array.from({ length: 4 }, (_, i) => {
      const x = 46 + i * 1.4;
      return [
        [x, 3],
        [x + 0.8, 3],
        [x + 0.8, 11],
        [x, 11],
      ];
    });
    relief("calibration", bars);
    return {
      ...builder.finish(1.24, 3.2),
      identity: { year: latin.report, name: han.report, frontBandMm: height },
      logoMeasurements: ["github", "codex", "gemini"].flatMap((id) => {
        const t = originalTile(id);
        return t.measurements ? [t.measurements] : [];
      }),
      coupon: {
        width,
        height,
        strokeMm: 0.8,
        gapMm: 0.6,
        name: han.report,
        latin: latin.report,
        specimens,
        annotations,
      },
    };
  } finally {
    builder.dispose();
  }
}
export function meshVolume(mesh: Mesh) {
  let v = 0;
  const p = mesh.vertices;
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const a = mesh.triangles[i] * 3,
      b = mesh.triangles[i + 1] * 3,
      c = mesh.triangles[i + 2] * 3;
    v +=
      (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) +
        p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) +
        p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) /
      6;
  }
  return v;
}
import { validateMesh } from "./validate";
export { validateMesh };
export { validateSpatial } from "./spatial";
