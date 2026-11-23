import type { Vec2 } from "manifold-3d";
import * as opentype from "opentype.js";
import { measureFeatures } from "./features";

export type TextMeasurement = {
  text: string;
  startMm: number;
  sizeMm: number;
  minStrokeMm: number | null;
  minGapMm: number | null;
  lines: string[];
  method: string;
  qualified: false;
};
export type IdentityMeasurement = {
  year: TextMeasurement;
  name: TextMeasurement;
  frontBandMm: number;
  rearBandMm?: number;
  namePlacement?: "front" | "rear";
  nameSize?: "small" | "medium" | "large";
};
export type EngravingOptions = {
  localFontBytes?: ArrayBuffer;
  couponLatinFontBytes?: ArrayBuffer;
  logoTiles?: Record<
    string,
    {
      paths: Vec2[][];
      width: number;
      height: number;
      fillRule?: "EvenOdd" | "NonZero";
      measurements?:{discardedSubmicronIslands?:number;minStrokeMm:number|null;minGapMm:number|null;sizeMm:number;method:string;qualified:boolean};
    }
  >;
};
export type EngravedText = {
  fillRule: "NonZero";
  paths: Vec2[][];
  width: number;
  height: number;
  report: TextMeasurement;
};
const flattenTolerance = 0.0003; // em. At the 96 mm size limit this is below 0.03 mm.
const method =
  "eight-direction opposing-wall calipers; pointed terminals and unsampled irregular walls unverified";
const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
const supported =
  /^[\p{Script=Latin}\p{Script=Han}\p{Number}\p{Punctuation}\p{Symbol}\p{Space_Separator}]$/u;
const minOrNull = (a: number[]) => (a.length ? Math.min(...a) : null);
const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function distanceToChord(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared),
      )
    : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function flatten(points: Vec2[], out: Vec2[], depth = 0) {
  const a = points[0],
    b = points[points.length - 1];
  if (
    depth >= 16 ||
    points
      .slice(1, -1)
      .every((p) => distanceToChord(p, a, b) <= flattenTolerance)
  ) {
    out.push(b);
    return;
  }
  let row = points;
  const left = [a],
    right = [b];
  while (row.length > 1) {
    row = row.slice(1).map((p, i) => mid(p, row[i]));
    left.push(row[0]);
    right.unshift(row[row.length - 1]);
  }
  flatten(left, out, depth + 1);
  flatten(right, out, depth + 1);
}
function outline(glyph: opentype.Glyph) {
  const paths: Vec2[][] = [];
  let path: Vec2[] = [];
  for (const c of glyph.getPath(0, 0, 1).commands) {
    if (c.type === "M") {
      path = [[c.x, -c.y]];
      paths.push(path);
    } else if (c.type === "L") path.push([c.x, -c.y]);
    else if (c.type === "Q")
      flatten([path[path.length - 1], [c.x1, -c.y1], [c.x, -c.y]], path);
    else if (c.type === "C")
      flatten(
        [path[path.length - 1], [c.x1, -c.y1], [c.x2, -c.y2], [c.x, -c.y]],
        path,
      );
  }
  if (paths.reduce((n, p) => n + p.length, 0) > 4096)
    throw Error("Font glyph exceeds the supported outline complexity.");
  return paths.filter((p) => p.length >= 3);
}
function bounds(paths: Vec2[][]) {
  const points = paths.flat(),
    xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  };
}
function readGlyph(font: opentype.Font, char: string) {
  const glyph = font.charToGlyph(char),
    paths = outline(glyph);
  const features = measureFeatures(paths, "NonZero");
  return {
    char,
    paths,
    bounds: bounds(paths),
    advance: (glyph.advanceWidth ?? font.unitsPerEm) / font.unitsPerEm,
    ...features,
  };
}
type Glyph = ReturnType<typeof readGlyph>;
type Typeface = { font: opentype.Font; cache: Map<string, Glyph> };
const fontCache = new WeakMap<ArrayBuffer, Typeface>();
function readFont(bytes: ArrayBuffer) {
  let face = fontCache.get(bytes);
  if (!face) {
    if (bytes.byteLength > 48 * 1024 * 1024)
      throw Error("Font exceeds 48 MiB. Choose a static TTF or OTF.");
    try {
      // Bundlers resolve the named ESM export. Native Node ESM exposes the
      // CommonJS package entry through its default namespace.
      const parse = opentype.parse ?? (Reflect.get(opentype, "default") as typeof opentype).parse;
      face = { font: parse(bytes), cache: new Map() };
    } catch {
      throw Error("Cannot read this font. Choose a static TTF or OTF.");
    }
    fontCache.set(bytes, face);
  }
  return face;
}
export function layoutText(
  input: string,
  bytes: ArrayBuffer,
  options: EngravingOptions,
  startMm: number,
  maxWidth: number,
): EngravedText {
  const text = input.normalize("NFC"),
    chars = Array.from(segmenter.segment(text), (s) => s.segment);
  const fonts = [readFont(bytes)];
  if (options.localFontBytes) fonts.unshift(readFont(options.localFontBytes));
  const missing = new Set<string>(),
    unsupported = new Set<string>();
  const glyphs: Glyph[] = [];
  for (const char of chars) {
    if (!supported.test(char)) {
      unsupported.add(char);
      continue;
    }
    const face = fonts.find((f) => f.font.charToGlyphIndex(char) !== 0);
    if (!face) {
      missing.add(char);
      continue;
    }
    let g = face.cache.get(char);
    if (!g) {
      g = readGlyph(face.font, char);
      face.cache.set(char, g);
    }
    if (!g.paths.length && !/^\p{Space_Separator}$/u.test(char))
      missing.add(char);
    glyphs.push(g);
  }
  if (missing.size)
    throw Error(
      "Missing CJK / Latin glyphs: " +
        [...missing].join(" ") +
        ". Choose a local static TTF/OTF or edit the name.",
    );
  if (unsupported.size)
    throw Error(
      "Unsupported shaping for graphemes: " +
        [...unsupported].join(" ") +
        ". Use Han, NFC Latin, digits or punctuation.",
    );
  let size = startMm;
  for (const glyph of glyphs) {
    if (!glyph.paths.length) continue;
    if (glyph.minStrokeMm === null || glyph.minStrokeMm <= 0)
      throw Error("Cannot measure a positive stroke for " + glyph.char);
    // Reserve 0.01 mm for numeric rounding and physical-coordinate quantization.
    size = Math.max(size, 0.81 / glyph.minStrokeMm);
    if (glyph.minGapMm !== null) size = Math.max(size, 0.61 / glyph.minGapMm);
  }
  size = Math.ceil(size * 10) / 10;
  if (!Number.isFinite(size) || size > 96)
    throw Error(
      "Text size exceeds the supported range: measured features require " +
        size +
        " mm, above 96 mm. Choose a different font or edit the name.",
    );
  const paths: Vec2[][] = [],
    lines: string[] = [],
    strokes: number[] = [],
    gaps: number[] = [];
  const rows: { start: number; end: number; low: number; high: number }[] = [];
  let row: { glyph: Glyph; x: number }[] = [],
    pen = 0,
    width = 0,
    height = 0,
    lastRight: number | undefined;
  const finish = () => {
    if (!row.length) return;
    const ink = row.filter((r) => r.glyph.paths.length);
    if (ink.length) {
      const low = Math.min(...ink.map(({ glyph }) => glyph.bounds.y0)) * size;
      const high = Math.max(...ink.map(({ glyph }) => glyph.bounds.y1)) * size;
      const start = paths.length;
      for (const { glyph, x } of ink)
        for (const path of glyph.paths)
          paths.push(
            path.map(([gx, gy]) => [x + gx * size, height + gy * size - low]),
          );
      rows.push({
        start,
        end: paths.length,
        low: height,
        high: height + high - low,
      });
      height += high - low + 1.5;
      width = Math.max(width, lastRight ?? 0);
    }
    lines.push(row.map((r) => r.glyph.char).join(""));
    row = [];
    pen = 0;
    lastRight = undefined;
  };
  for (const glyph of glyphs) {
    if (!glyph.paths.length) {
      row.push({ glyph, x: pen });
      pen += glyph.advance * size;
      continue;
    }
    const { x0, x1 } = glyph.bounds;
    if ((x1 - x0) * size > maxWidth)
      throw Error(
        "Glyph exceeds the plinth width at printable size: " + glyph.char,
      );
    let left = Math.max(0, pen + x0 * size, (lastRight ?? -0.8) + 0.8);
    if (left + (x1 - x0) * size > maxWidth) {
      finish();
      left = 0;
    }
    if (lastRight !== undefined) gaps.push(left - lastRight);
    const x = left - x0 * size;
    row.push({ glyph, x });
    pen = x + glyph.advance * size;
    lastRight = x + x1 * size;
    if (glyph.minStrokeMm !== null) strokes.push(glyph.minStrokeMm * size);
    if (glyph.minGapMm !== null) gaps.push(glyph.minGapMm * size);
  }
  finish();
  if(rows.length>1)gaps.push(1.5);
  height = Math.max(0, height - 1.5);
  // Put the first reading line at the top of the upright XY inscription.
  for (const row of rows)
    for (let i = row.start; i < row.end; i++)
      for (const point of paths[i]) point[1] += height - row.high - row.low;
  return {
    fillRule: "NonZero",
    paths,
    width,
    height,
    report: {
      text,
      startMm,
      sizeMm: size,
      minStrokeMm: minOrNull(strokes),
      minGapMm: minOrNull(gaps),
      lines,
      method,
      qualified: false,
    },
  };
}
