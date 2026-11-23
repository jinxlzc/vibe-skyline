import type { BuildPlan } from "@vibeskyline/contracts";
import type { Vec2 } from "manifold-3d";
export type NameSize = "small" | "medium" | "large";
import {measureFeatures} from "./features";
import { layoutText, type EngravingOptions } from "./engraving";

export function offset(paths: Vec2[][], x: number, y: number): Vec2[][] {
  return paths.map((p) => p.map(([px, py]) => [px + x, py + y]));
}
type Tile = NonNullable<EngravingOptions["logoTiles"]>[string];
// Original block, stair and twin bars, with no third-party mark outlines.
export function originalTile(id: string, neutral = false): Tile {
  const codes:Record<string,string>={github:'GH',gitee:'GE',gitlab:'GL',codex:'OX',claude:'CL',gemini:'GM',antigravity:'AG',cursor:'CU',copilot:'CP',deepseek:'DS',kimi:'KM',qwen:'QW',doubao:'DB',glm:'ZP',minimax:'MX',trae:'TR',codebuddy:'CB',lingma:'LM'};
  if(!neutral&&codes[id]){
    // Original segmented monogram arrangements, not official brand silhouettes.
    const letters:Record<string,string>={A:'abcefg',B:'cdefg',C:'adef',D:'bcdeg',E:'adefg',G:'acdefg',H:'bcefg',K:'efg',L:'def',M:'abcef',O:'abcdef',P:'abefg',Q:'abcfg',R:'eg',S:'acdfg',T:'defg',U:'bcdef',W:'bcde',X:'bcefg',Z:'abdeg'};
    const bars:Record<string,[number,number,number,number]>={a:[0,7.2,4.8,1.2],g:[0,3.6,4.8,1.2],d:[0,0,4.8,1.2],f:[0,4.8,1.2,2.4],e:[0,1.2,1.2,2.4],b:[3.6,4.8,1.2,2.4],c:[3.6,1.2,1.2,2.4]};
    const paths:Vec2[][]=[];
    for(const [i,char] of [...codes[id]].entries())for(const segment of letters[char]){const [x,y,w,h]=bars[segment],ox=x+i*6;paths.push([[ox,y],[ox+w,y],[ox+w,y+h],[ox,y+h]]);}
    const values=measureFeatures(paths,'NonZero');
    return {paths,width:10.8,height:8.4,fillRule:'NonZero',measurements:{...values,sizeMm:8.4,method:'original segmented monogram, opposing-wall calipers',qualified:false}};
  }
  const variant = neutral
    ? 0
    : Array.from(id).reduce((n, c) => n + c.codePointAt(0)!, 0) % 3;
  const paths: Vec2[][] =
    variant === 0
      ? [
          [
            [0, 0],
            [8, 0],
            [8, 8],
            [4, 8],
            [4, 4],
            [0, 4],
          ],
        ]
      : variant === 1
        ? [
            [
              [0, 0],
              [8, 0],
              [8, 3],
              [5, 3],
              [5, 6],
              [2, 6],
              [2, 8],
              [0, 8],
            ],
          ]
        : [
            [
              [0, 0],
              [3, 0],
              [3, 6],
              [0, 6],
            ],
            [
              [5, 0],
              [8, 0],
              [8, 8],
              [5, 8],
            ],
          ];
  return { paths, width: 8, height: 8, fillRule: "EvenOdd" };
}
function tileFor(id: string, plan: BuildPlan, options: EngravingOptions) {
  if (plan.recipe.logoMode === "none") return undefined;
  const tile =
    plan.recipe.logoMode === "neutral"
      ? originalTile("", true)
      : (options.logoTiles?.[id] ?? originalTile(id));
  if (
    !Number.isFinite(tile.width) ||
    !Number.isFinite(tile.height) ||
    tile.width <= 0 ||
    tile.height <= 0 ||
    !tile.paths.length ||
    tile.paths.some(
      (p) =>
        p.length < 3 ||
        p.some(
          ([x, y]) =>
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            x < -0.001 ||
            y < -0.001 ||
            x > tile.width + 0.001 ||
            y > tile.height + 0.001,
        ),
    )
  )
    throw Error("Invalid physical tile bounds: " + id);
  return tile;
}
export function layoutName(
  text: string,
  bytes: ArrayBuffer,
  options: EngravingOptions,
  size: NameSize,
  maxWidth: number,
) {
  const han = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(text);
  function atSize(start: number) {
    try {
      return layoutText(text, bytes, options, start, maxWidth);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Text size exceeds")
      )
        throw Error("Name size: " + error.message);
      throw error;
    }
  }
  const small = atSize(han ? 6.4 : 3.2);
  if (size === "small" || !small.paths.length) return small;
  const factor = size === "medium" ? 1.14 : 1.6;
  return atSize(Math.max(han ? 8 : 4, small.report.sizeMm * factor));
}
export function layoutPlinth(
  input: BuildPlan,
  bytes: ArrayBuffer,
  options: EngravingOptions,
) {
  const tiles = input.districts.map((d) => tileFor(d.id, input, options));
  const districtShiftX = Math.max(
    0,
    ...tiles.map((t) => (t ? 4 + t.width + 2 - 18 : 0)),
  );
  const width = input.width + districtShiftX;
  const year = layoutText(
    String(input.recipe.year),
    bytes,
    options,
    5,
    width - 16,
  );
  const size = input.recipe.nameSize ?? "medium";
  const placement = input.recipe.namePlacement ?? "front";
  const canExpand = size === "large" || placement === "rear";
  const yearX = 8;
  const narrowNameX = yearX + year.width + 3;
  function identityRows(w: number) {
    const full = layoutName(input.recipe.name, bytes, options, size, w - 12);
    if (placement === "rear")
      return { name: full, nameX: 8, nameY: 2, inkHeight: year.height + 4 };
    const stacked = {
      name: full,
      nameX: 8,
      nameY: 3 + year.height + 2,
      inkHeight: year.height + full.height + 7,
    };
    try {
      const narrow = layoutName(
        input.recipe.name,
        bytes,
        options,
        size,
        w - narrowNameX - 3,
      );
      const inkHeight = Math.max(year.height + 5, narrow.height + 3);
      if (stacked.inkHeight < inkHeight) return stacked;
      return {
        name: narrow,
        nameX: narrowNameX,
        nameY: Math.max(1.5, Math.min(3, 16 - 1.5 - narrow.height)),
        inkHeight,
      };
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes("Glyph exceeds"))
        throw e;
      return stacked;
    }
  }
  const fitError = () =>
    Error(
      "Name layout: measured lettering cannot fit the selected front band. Choose Large or the rear apron, or edit the name.",
    );
  let chosenWidth = width,
    layout: ReturnType<typeof identityRows>;
  try {
    layout = identityRows(width);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes("Glyph exceeds")) throw e;
    if (!canExpand) throw fitError();
    chosenWidth = width * 2;
    layout = identityRows(chosenWidth);
  }
  const rowGrowth = tiles.map((t) => Math.max(0, (t?.height ?? 0) - 19.6));
  const districtGrowth = rowGrowth.reduce((a, b) => a + b, 0);
  const band = (height: number) => Math.ceil(height * 10) / 10;
  const front = () => Math.max(16, band(layout.inkHeight));
  const rear = () =>
    placement === "rear" && layout.name.paths.length
      ? Math.max(0, band(layout.name.height + 4) - 4)
      : 0;
  const totalDepth = () => input.depth + front() - 16 + rear() + districtGrowth;
  if (!canExpand && front() > 16) throw fitError();
  const frontBandMm = front(),
    rearBandMm = rear() + 4,
    depth = totalDepth();
  let shiftY = frontBandMm - 16;
  const shifts = input.districts.map((_, i) => {
    const current = shiftY;
    shiftY += rowGrowth[i];
    return current;
  });
  const plan: BuildPlan = {
    ...input,
    width: chosenWidth,
    depth,
    districts: input.districts.map((d, i) => ({ ...d, y: d.y + shifts[i] })),
    solids: input.solids.map((s) => {
      const i = input.districts.findIndex(
        (d) => s.y >= d.y - 0.001 && s.y < d.y + 19.6,
      );
      if (i < 0) throw Error("Solid has no source district");
      return { ...s, x: s.x + districtShiftX, y: s.y + shifts[i] };
    }),
  };
  return {
    plan,
    tiles,
    yearPaths: offset(year.paths, yearX, 3),
    namePaths: offset(
      layout.name.paths,
      layout.nameX,
      placement === "rear" ? depth - rearBandMm + layout.nameY : layout.nameY,
    ),
    identity: {
      year: year.report,
      name: layout.name.report,
      frontBandMm,
      rearBandMm,
      nameSize: size,
      namePlacement: placement,
    },
  };
}

/** Measure other explicit recipe choices with the same layout and bed checks as generation. */
export function findNameLayoutAlternatives(input: BuildPlan, bytes: ArrayBuffer, options: EngravingOptions = {}) {
  const alternatives = [];
  for (const namePlacement of ["front", "rear"] as const) {
    for (const nameSize of ["small", "medium", "large"] as const) {
      if (nameSize === (input.recipe.nameSize ?? "medium") && namePlacement === (input.recipe.namePlacement ?? "front")) continue;
      try {
        const {plan} = layoutPlinth({...input, recipe: {...input.recipe, nameSize, namePlacement}}, bytes, options);
        alternatives.push({nameSize, namePlacement, width: plan.width, depth: plan.depth});
      } catch {
        // Missing/unsupported glyphs and out-of-bed layouts cannot be offered.
      }
    }
  }
  return alternatives;
}
