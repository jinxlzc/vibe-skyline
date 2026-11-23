import type { Vec2 } from "manifold-3d";

/**
 * Caliper measurements on flattened physical outlines. At each orientation,
 * intersect a family of parallel lines with every contour. Pair consecutive
 * physical boundaries using the requested fill rule. Project each measured chord onto the wall normal
 * to correct its obliqueness. A pair qualifies only if the walls oppose within
 * 10 degrees and both normals are within 22.5 degrees of the measuring line.
 * This measures local parallel-sided features, including circular counters
 * near their diameter. Pointed terminals have no universal positive minimum.
 */
export function measureFeatures(paths: Vec2[][], fillRule: "EvenOdd" | "NonZero" = "EvenOdd") {
  let stroke = Infinity,
    gap = Infinity;
  const normalLimit = Math.cos(Math.PI / 8);
  const wallLimit = Math.cos(Math.PI / 18);
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 8,
      c = Math.cos(angle),
      s = Math.sin(angle);
    const contours = paths.map((path) =>
      path.map(([x, y]): Vec2 => [x * c + y * s, y * c - x * s]),
    );
    const edges = contours.flatMap((path) =>
      path
        .map((a, i) => {
          const b = path[(i + 1) % path.length],
            dx = b[0] - a[0],
            dy = b[1] - a[1];
          const length = Math.hypot(dx, dy);
          return {
            a,
            ymin: Math.min(a[1], b[1]),
            ymax: Math.max(a[1], b[1]),
            slope: dx / dy,
            tx: dx / length,
            ty: dy / length,
          };
        })
        .filter((e) => e.ymax - e.ymin > 1e-9),
    );
    if (!edges.length) continue;
    const ymin = Math.min(...edges.map((e) => e.ymin)),
      ymax = Math.max(...edges.map((e) => e.ymax));
    // Include a midpoint for every edge so short isolated islands receive a scan.
    const levels = new Set(edges.map((e) => (e.ymin + e.ymax) / 2));
    for (let n = 0; n < 128; n++)
      levels.add(ymin + ((ymax - ymin) * (n + 0.5)) / 128);
    for (const y of levels) {
      const hits = edges
        .filter((e) => y >= e.ymin && y < e.ymax)
        .map((e) => ({
          x: e.a[0] + (y - e.a[1]) * e.slope,
          tx: e.tx,
          ty: e.ty,
        }))
        .sort((a, b) => a.x - b.x);
      const walls = fillRule === "NonZero" ? nonzeroBoundaries(hits) : hits;
      for (let i = 1; i < walls.length; i++) {
        const a = walls[i - 1],
          b = walls[i];
        const projection = Math.min(Math.abs(a.ty), Math.abs(b.ty));
        if (
          projection < normalLimit ||
          Math.abs(a.tx * b.tx + a.ty * b.ty) < wallLimit
        )
          continue;
        const width = (b.x - a.x) * projection;
        if (i % 2) stroke = Math.min(stroke, width);
        else gap = Math.min(gap, width);
      }
    }
  }
  return {
    minStrokeMm: Number.isFinite(stroke) ? stroke : null,
    minGapMm: Number.isFinite(gap) ? gap : null,
  };
}


type Crossing = { x: number; tx: number; ty: number };

// A nonzero winding change within ink (for example +1 to +2) is an internal
// contour of the glyph, not a physical wall. Process coincident crossings as
// a single event to handle shared edges and oppositely wound counters.
function nonzeroBoundaries(hits: Crossing[]): Crossing[] {
  const walls: Crossing[] = [];
  let winding = 0;
  for (let i = 0; i < hits.length;) {
    const first = hits[i], wasFilled = winding !== 0;
    do { winding += Math.sign(hits[i++].ty); }
    while (i < hits.length && hits[i].x - first.x < 1e-10);
    if (wasFilled !== (winding !== 0)) walls.push(first);
  }
  return walls;
}
