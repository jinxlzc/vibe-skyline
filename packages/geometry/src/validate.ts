// Independent triangle-soup validator: no generator or boolean-library calls.
import type { Mesh } from "./index";
export function validateMesh(
  mesh: Mesh,
  expected?: { width: number; depth: number; height: number },
  requireConnected = true,
) {
  const errors: string[] = [],
    edges = new Map<
      string,
      { count: number; direction: number; faces: number[] }
    >(),
    adj: number[][] = [];
  const points = mesh.vertices;
  let volume = 0;
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  const key = (i: number) =>
    points
      .slice(i * 3, i * 3 + 3)
      .map((n) => Math.round(n * 1e5))
      .join(",");
  for (let i = 0; i < points.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const v = points[i + j];
      if (!Number.isFinite(v)) errors.push("Non-finite vertex");
      lo[j] = Math.min(lo[j], v);
      hi[j] = Math.max(hi[j], v);
      // Sloped relief is continuous mm geometry; layer height belongs to the slicer.
    }
  for (let t = 0; t < mesh.triangles.length; t += 3) {
    const ids = mesh.triangles.slice(t, t + 3),
      face = t / 3;
    adj[face] = [];
    const [a, b, c] = ids.map((id) => points.slice(id * 3, id * 3 + 3));
    if (!a || a.length !== 3 || b.length !== 3 || c.length !== 3) {
      errors.push("Invalid index");
      continue;
    }
    const ab = b.map((n, i) => n - a[i]),
      ac = c.map((n, i) => n - a[i]);
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    if (Math.hypot(...cross) < 1e-8) errors.push("Degenerate face");
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    for (let j = 0; j < 3; j++) {
      const u = key(ids[j]),
        v = key(ids[(j + 1) % 3]),
        k = u < v ? u + "|" + v : v + "|" + u,
        e = edges.get(k) ?? { count: 0, direction: 0, faces: [] };
      e.count++;
      e.direction += u < v ? 1 : -1;
      e.faces.push(face);
      edges.set(k, e);
    }
  }
  for (const e of edges.values()) {
    if (e.count !== 2) errors.push("Non-manifold / open edge");
    if (e.direction !== 0) errors.push("Inconsistent orientation");
    if (e.faces.length === 2) {
      adj[e.faces[0]].push(e.faces[1]);
      adj[e.faces[1]].push(e.faces[0]);
    }
  }
  if (volume <= 0) errors.push("Non-positive volume");
  let components = 0;
  const seen = new Set<number>();
  for (let f = 0; f < adj.length; f++) {
    if (seen.has(f)) continue;
    components++;
    const queue = [f];
    seen.add(f);
    while (queue.length) {
      const n = queue.pop()!;
      for (const next of adj[n])
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
    }
  }
  if (requireConnected && components !== 1)
    errors.push("Disconnected / floating component");
  const bounds = hi.map((v, i) => v - lo[i]);
  if (
    expected &&
    bounds.some(
      (v, i) =>
        Math.abs(v - [expected.width, expected.depth, expected.height][i]) >
        0.01,
    )
  )
    errors.push("Bounds mismatch");
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    bounds,
    volume,
    components,
  };
}
