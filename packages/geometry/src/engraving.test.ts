import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { findNameLayoutAlternatives, layoutName, layoutPlinth } from "./layout";
import opentype from "opentype.js";
import { buildPlan, legacyRecipe as defaultRecipe, demoBundle } from "../../core/src/index";
import { exportSTL, readSTL } from "../../exporters/stl/src/index";
import { export3MF, validate3MF } from "../../exporters/three-mf/src/index";
import {
  generateCalibrationCoupon,
  generateGeometry,
  layoutText,
  measureFeatures,
  validateMesh,
  validateSpatial,
} from "./index";

const font = Uint8Array.from(
  await readFile(new URL("../assets/VibeSkylineGrid-Regular.ttf", import.meta.url)),
).buffer;
function fixture(name: string) {
  const bundle = demoBundle(2026,4);
  for (const source of bundle.sources)
    source.days = source.days.map((day, i) => ({
      ...day,
      value: i === 0 ? 3 : 0,
      state: i === 0 ? "observed" : "known-zero",
    }));
  return buildPlan(bundle, { ...defaultRecipe, slotAssignments: undefined, name });
}
it("maps all 3,755 GB2312 Level 1 scalars plus the dense example, ASCII and fullwidth punctuation", () => {
  const face = opentype.parse(font),
    decoder = new TextDecoder("gb18030", { fatal: true });
  const chars = new Set<string>();
  for (let row = 0xb0; row <= 0xd7; row++)
    for (let cell = 0xa1; cell <= (row === 0xd7 ? 0xf9 : 0xfe); cell++)
      chars.add(decoder.decode(Uint8Array.of(row, cell)));
  expect(chars.size).toBe(3755);
  for (const ch of [...chars, ..."sample-user 0123456789，。！？（）曦馨罐"])
    expect(face.charToGlyphIndex(ch)).toBeGreaterThan(0);
  expect(face.charToGlyphIndex("龘")).toBe(0);
});
it("measures stroke and enclosed gap independently at physical size", () => {
  const ring = measureFeatures([
    [
      [0, 0],
      [2.2, 0],
      [2.2, 4],
      [0, 4],
    ],
    [
      [0.8, 0.8],
      [1.4, 0.8],
      [1.4, 3.2],
      [0.8, 3.2],
    ],
  ]);
  expect(ring.minStrokeMm).toBeCloseTo(0.8, 6);
  expect(ring.minGapMm).toBeCloseTo(0.6, 6);
});
it.each(["林小川", "量曦餐", "sample-user 林小川", "，。！？（）"])(
  "enlarges and reflows %s in a manifold printable-scale specimen",
  async (name) => {
    const plan = fixture(name);
    plan.recipe.nameSize = name==="量曦餐"?"small":"large";
    if(name==="量曦餐") plan.recipe.namePlacement="rear";
    const g = await generateGeometry(plan, font);
    expect(g.identity.name.text).toBe(name);
    expect(g.identity.name.lines.join("")).toBe(name);
    expect(g.identity.name.sizeMm).toBeGreaterThanOrEqual(8);
    for (const t of [g.identity.year, g.identity.name]) {
      expect(t.minStrokeMm).toBeGreaterThanOrEqual(0.8);
      expect(t.minGapMm).toBeGreaterThanOrEqual(0.6);
      expect(t.qualified).toBe(false);
    }

    expect(g.plan).not.toHaveProperty("fitsA1");
    expect(validateMesh(g.mono, g.plan).errors).toEqual([]);
    expect(validateSpatial([g.mono]).errors).toEqual([]);
    expect(validateSpatial(g.regions.map((r) => r.mesh)).errors).toEqual([]);
  },
);
it("normalizes NFC, rejects unshaped graphemes, lists missing characters and accepts local TTF/OTF byte fallback", async () => {
  expect(layoutText("e\u0301", font, {}, 4, 100).report.text).toBe("é");
  expect(() => layoutText("क्‍ष", font, {}, 4, 100)).toThrow(
    /Unsupported shaping/,
  );
  expect(() => layoutText("龘龘", font, {}, 8, 120)).toThrow(
    /龘.*local static TTF\/OTF/,
  );
  // Synthetic local font deliberately maps one rare scalar to a rectangular proof outline.
  const path = new opentype.Path();
  path.moveTo(30, 30);
  path.lineTo(930, 30);
  path.lineTo(930, 930);
  path.lineTo(30, 930);
  path.close();
  const face = new opentype.Font({
    familyName: "Fixture",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 950,
    descender: -50,
    glyphs: [
      new opentype.Glyph({
        name: ".notdef",
        advanceWidth: 1000,
        path: new opentype.Path(),
      }),
      new opentype.Glyph({
        name: "fixture",
        unicode: 0x9f98,
        advanceWidth: 1000,
        path,
      }),
    ],
  });
  const plan=fixture("李龘");
  plan.recipe.namePlacement="rear";
  const g = await generateGeometry(plan, font, {
    localFontBytes: face.toArrayBuffer(),
  });
  expect(validateMesh(g.mono, g.plan).errors).toEqual([]);
});
it("exports a two-material coupon and measures the actual raised calibration bar edges in the STL", async () => {
  const g = await generateCalibrationCoupon(font),
    mesh = readSTL(exportSTL(g.mono));
  const bounds = { width: g.coupon.width, depth: g.coupon.height, height: 3.8 };
  expect(validateMesh(mesh, bounds).errors).toEqual([]);
  expect(validateSpatial(g.regions.map((r) => r.mesh)).errors).toEqual([]);
  expect(validate3MF(export3MF(g)).budget.count).toBe(2);
  expect(g.regions.map((r) => r.slot)).toEqual([1, 2]);
  expect(g.regions[0].color).not.toBe(g.regions[1].color);
  expect(g.coupon.specimens).toHaveLength(7);
  expect(g.coupon.specimens.filter(s => s.measurement.text === "曦馨罐")).toHaveLength(1);
  for (const specimen of g.coupon.specimens) {
    const expected = layoutName(specimen.measurement.text, font, {}, specimen.size, 220);
    expect(specimen.measurement).toEqual(expected.report);
    expect(specimen.widthMm).toBeCloseTo(expected.width);
    expect(specimen.heightMm).toBeCloseTo(expected.height);
  }
  expect(g.coupon.annotations.map((a) => a.measurement.text)).toEqual([
    "S",
    "M",
    "L",
    "0123456789",
  ]);
  for (const text of ["天际线", "jinxlzc"]) {
    const specimens = g.coupon.specimens.filter(
      (s) => s.measurement.text === text,
    );
    expect(specimens.map((s) => s.size)).toEqual(["small", "medium", "large"]);
    expect(specimens[1].heightMm).toBeGreaterThan(specimens[0].heightMm);
    expect(specimens[2].heightMm).toBeGreaterThan(specimens[1].heightMm);
    for (const s of specimens) {
      expect(s.measurement.minStrokeMm).toBeGreaterThanOrEqual(0.8);
      expect(s.measurement.minGapMm).toBeGreaterThanOrEqual(0.6);
      expect(s.xMm + s.widthMm).toBeLessThan(g.coupon.width);
      expect(s.yMm + s.heightMm).toBeLessThan(g.coupon.height);
    }
  }
  const xs = new Set<number>();
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const [x, y, z] = mesh.vertices.slice(i, i + 3);
    if (x >= 45 && x < 55 && y < 12 && Math.abs(z - 3.8) < 1e-5) xs.add(x);
  }
  const walls = [...xs].sort((a, b) => a - b);
  expect(walls).toHaveLength(8);
  for (let i = 1; i < walls.length; i++)
    expect(walls[i] - walls[i - 1]).toBeCloseTo(i % 2 ? 0.8 : 0.6, 4);
});
it("prints the standalone Lato outlines and measurements in all three Latin coupon rows", async () => {
  const latinBytes = Uint8Array.from(
    await readFile(new URL("../assets/Lato-Bold.ttf", import.meta.url)),
  ).buffer;
  const { coupon, regions } = await generateCalibrationCoupon(font, {
    couponLatinFontBytes: latinBytes,
  });
  const relief = regions.find((r) => r.slot === 2)!.mesh;
  for (const specimen of coupon.specimens.filter(
    (s) => s.measurement.text === "jinxlzc",
  )) {
    const expected = layoutName("jinxlzc", latinBytes, {}, specimen.size, 220);
    expect(specimen.measurement).toEqual(expected.report);
    expect(specimen.widthMm).toEqual(expected.width);
    expect(specimen.heightMm).toEqual(expected.height);

    // Compare the actual raised mesh top to the area enclosed by the standalone
    // contours. Signed path area subtracts the oppositely wound counters.
    const area = Math.abs(
      expected.paths.reduce(
        (sum, path) =>
          sum +
          path.reduce((a, [x, y], i) => {
            const next = path[(i + 1) % path.length];
            return a + (x * next[1] - next[0] * y) / 2;
          }, 0),
        0,
      ),
    );
    let capArea = 0;
    for (let i = 0; i < relief.triangles.length; i += 3) {
      const points = relief.triangles
        .slice(i, i + 3)
        .map((id) => relief.vertices.slice(id * 3, id * 3 + 3));
      if (
        points.some(
          ([x, y, z]) =>
            Math.abs(z - 3.8) > 0.0001 ||
            x < specimen.xMm - 0.0001 ||
            x > specimen.xMm + specimen.widthMm + 0.0001 ||
            y < specimen.yMm - 0.0001 ||
            y > specimen.yMm + specimen.heightMm + 0.0001,
        )
      )
        continue;
      const [a, b, c] = points;
      capArea +=
        Math.abs(
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
        ) / 2;
    }
    expect(Math.abs(capArea - area)).toBeLessThan(0.001);
  }
  for (const annotation of coupon.annotations) {
    const isDigits = annotation.region === "digits";
    expect(annotation.measurement).toEqual(
      layoutText(
        annotation.measurement.text,
        latinBytes,
        {},
        isDigits ? 5 : 6,
        isDigits ? 220 : 30,
      ).report,
    );
  }
});
it("keeps equal-color spools distinct and rejects conflicting colors for a shared slot", async () => {
  const p = fixture("2026");
  p.recipe.textColor = p.recipe.baseColor;
  p.recipe.logoColor = p.recipe.baseColor;
  p.recipe.slotAssignments = { base: 1, text: 2, logo: 2 };
  const g = await generateGeometry(p, font);
  expect(g.regions.find((r) => r.slot === 2)?.color).toBe(
    g.regions.find((r) => r.slot === 1)?.color,
  );
  expect(g.budget.materials.find((m) => m.slot === 2)?.roleKeys).toEqual([
    "text",
    "logo",
  ]);
  p.recipe.slotAssignments = { "source:github": 1, base: 1 };
  await expect(generateGeometry(p, font)).rejects.toThrow("conflicting colors");
});
it('reflow removes positive bearing overflow and reports inter-row gaps',()=>{
 const p=new opentype.Path();p.moveTo(300,0);p.lineTo(1100,0);p.lineTo(1100,900);p.lineTo(300,900);p.close();
 const face=new opentype.Font({familyName:'SyntheticBearing',styleName:'Bold',unitsPerEm:1000,ascender:950,descender:-50,glyphs:[new opentype.Glyph({name:'.notdef',advanceWidth:1200,path:new opentype.Path()}),new opentype.Glyph({name:'a',unicode:97,advanceWidth:1200,path:p})]});
 const result=layoutText('aa',face.toArrayBuffer(),{},8,8);
 expect(result.width).toBeLessThanOrEqual(8);expect(result.report.lines).toHaveLength(2);expect(result.report.minGapMm).toBe(1.5);
});

const contourFont = Uint8Array.from(
  await readFile(new URL("../test-fixtures/synthetic-contours.ttf",import.meta.url)),
).buffer;
it("preserves TrueType overlapping ink and its counter in the measured layout and exported solid",async()=>{
  const options={localFontBytes:contourFont}, input=fixture("龘");
  const g=await generateGeometry(input,font,options);
  expect(g.identity.name.sizeMm).toBe(8);
  expect(g.identity.name.minGapMm).toBeCloseTo(1.6,5);
  // The 0.2 mm overlap disappears under even-odd; the real 1.6 mm counter survives.
  const empty=await generateGeometry({...input,recipe:{...input.recipe,name:""}},font,options);
  expect(g.plan.depth).toBe(empty.plan.depth);
  const solid=readSTL(exportSTL(g.mono));
  const checked=validateMesh(solid,g.plan);
  expect(checked.errors).toEqual([]);
  // Two overlapping rectangles form a 1.2 x 1.0 em block with a 0.2 x 0.4 em hole.
  expect(checked.volume-validateMesh(empty.mono).volume).toBeCloseTo((1.2-.2*.4)*8**2*.6,3);
  const origin=8+layoutText("2026",font,{},5,input.width-16).width+3;
  function covered(x:number,y:number){
    for(let i=0;i<solid.triangles.length;i+=3){
      const points=solid.triangles.slice(i,i+3).map(v=>solid.vertices.slice(v*3,v*3+3));
      if(points.some(p=>Math.abs(p[2]-3.8)>1e-5))continue;
      const signs=points.map((a,j)=>{const b=points[(j+1)%3];return (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);});
      if(signs.every(n=>n>=-1e-7)||signs.every(n=>n<=1e-7))return true;
    }
    return false;
  }
  expect(covered(origin+.8875*8,3+.48*8)).toBe(true);
  expect(covered(origin+.30*8,3+.48*8)).toBe(false);
});
it.each([
  {name:"甲",inkWidth:152,widen:false},
  {name:"乙",inkWidth:184,widen:true},
])("uses the feasible plinth band for a $inkWidth mm local glyph",async({name,inkWidth,widen})=>{
  const input=fixture(name),options={localFontBytes:contourFont};
  await expect(generateGeometry(input,font,options)).rejects.toThrow(/Name layout.*Large.*rear/);
  input.recipe.namePlacement="rear";
  const g=await generateGeometry(input,font,options);
  const yearWidth=layoutText("2026",font,{},5,input.width-16).width;
  expect(inkWidth).toBeGreaterThan(input.width-8-yearWidth-3-3);
  expect(inkWidth>input.width-12).toBe(widen);
  expect(g.plan.width).toBeCloseTo(widen?input.width*2:input.width);
  expect(g.identity.name.sizeMm).toBe(8);
  expect(g.identity.name.lines).toEqual([name]);
  expect(validateMesh(g.mono,g.plan).errors).toEqual([]);
});


it.each(["small", "medium", "large"] as const)(
  "prints the %s generic CJK outlines at both apron positions",
  async (size) => {
    for (const placement of ["front", "rear"] as const) {
      const input = fixture("林小川");
      input.recipe.namePlacement = placement;
      input.recipe.nameSize = size;
      const g = await generateGeometry(input, font);
      expect(g.identity.namePlacement).toBe(placement);
      expect(g.identity.nameSize).toBe(size);
      expect(g.identity.name.method).toContain("opposing-wall calipers");
      expect(g.identity.name).toEqual(layoutName(input.recipe.name, font, {}, size, 140).report);
      expect(g.identity.name.minStrokeMm).toBeGreaterThanOrEqual(0.8);
      expect(g.identity.name.minGapMm).toBeGreaterThanOrEqual(0.6);
      expect(g.plan.districts).toHaveLength(4);
      if (size !== "large" && placement === "front")
        expect(g.plan.depth).toBeCloseTo(111, 5);
      if (placement === "rear") {
        expect(g.plan.districts).toEqual(input.districts);
        expect(g.identity.rearBandMm).toBeGreaterThan(4);
        const nameRegion = g.regions.find((r) => r.roleKeys?.includes("text"))!;
        const maxY = Math.max(
          ...nameRegion.mesh.vertices.filter((_, i) => i % 3 === 1),
        );
        expect(maxY).toBeGreaterThan(input.depth - 4);
      }
      expect(validateMesh(readSTL(exportSTL(g.mono)), g.plan).errors).toEqual(
        [],
      );
      expect(validateSpatial([g.mono]).errors).toEqual([]);
      expect(validateSpatial(g.regions.map((r) => r.mesh)).errors).toEqual([]);
    }
  },
);

it.each(["张伟", "林小川", "司马山川明月", "sample-user", "skyline_dev2026", "build-agent_123"])(
  "keeps %s at printable Medium on the 111 mm synthetic front plan", (name) => {
    const layout = layoutPlinth(fixture(name), font, {});
    const nameInk = layout.namePaths.flat();
    const yearInk = layout.yearPaths.flat();
    const minY = Math.min(...nameInk.map(p => p[1]));
    const maxY = Math.max(...nameInk.map(p => p[1]));
    const nameLeft = Math.min(...nameInk.map(p => p[0]));
    const yearRight = Math.max(...yearInk.map(p => p[0]));
    expect(layout.plan.depth).toBeCloseTo(111);
    expect(minY).toBeGreaterThanOrEqual(1.5);
    expect(maxY).toBeLessThanOrEqual(14.5 + 1e-9);
    expect(nameLeft - yearRight).toBeGreaterThanOrEqual(3 - 1e-9);
    expect(layout.identity.name.minStrokeMm).toBeGreaterThanOrEqual(0.8);
    expect(layout.identity.name.minGapMm).toBeGreaterThanOrEqual(0.6);
  },
);

it("offers only measured fitting alternatives and preserves the unmodified recipe", () => {
  const input = fixture("欧阳司马诸葛上官夏侯东方南宫长孙");
  expect(() => layoutPlinth(input, font, {})).toThrow(/Name layout/);
  const choices = findNameLayoutAlternatives(input, font);
  expect(choices.map(c => c.nameSize + "-" + c.namePlacement)).toEqual([
    "large-front", "small-rear", "medium-rear", "large-rear",
  ]);
  for (const choice of choices) {
    const plan = layoutPlinth({ ...input, recipe: { ...input.recipe, ...choice } }, font, {}).plan;
    expect(choice.width).toBe(plan.width);
    expect(choice.depth).toBe(plan.depth);
  }
  expect(input.recipe.namePlacement).toBe("front");
  expect(input.recipe.nameSize).toBe("medium");
  expect(findNameLayoutAlternatives(fixture("龘"), font)).toEqual([]);
});

it("requires the supplied font to cover every requested CJK name", async () => {
  const latinOnly = Uint8Array.from(await readFile(new URL("../assets/Lato-Bold.ttf", import.meta.url))).buffer;
  expect(() => layoutName("林小川", latinOnly, {}, "medium", 145)).toThrow(/Missing.*林 小 川/);
  expect(layoutName("林小川", font, {}, "medium", 145).report).toEqual(
    layoutText("林小川", font, {}, layoutText("林小川", font, {}, 6.4, 145).report.sizeMm * 1.14, 145).report,
  );
});
