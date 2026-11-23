import type { Mesh } from "./index";
// Independent triangle section sweep, including tilted first-edition relief.
// Vertex and triangle-intersection heights partition intervals where section
// topology is constant. Zero-volume cap contacts are permitted. EPS = 0.0001 mm.
const EPS = 1e-4;
type P = [number, number, number];
type Segment = { a: P; b: P; region: number };
type Side = {
  p: P[];
  lo: number;
  hi: number;
  nx: number;
  ny: number;
  region: number;
};
const cross = (a: P, b: P, c: P) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const distance = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const unique = (values: number[]) =>
  values
    .sort((a, b) => a - b)
    .filter((v, i, all) => !i || v - all[i - 1] > EPS);
// Intersections add critical heights: sampling only vertex intervals can miss
// two tilted shells that overlap for a narrow band between their vertices.
function intersectionLevels(faces: P[][]): number[] {
 const bounds=faces.map(p=>({p,lo:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi:[0,1,2].map(k=>Math.max(...p.map(v=>v[k])))})).sort((a,b)=>a.lo[0]-b.lo[0]);
 const levels:number[]=[];
 const sub=(a:P,b:P):P=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
 const cross3=(a:P,b:P):P=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a:P,b:P)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 function hits(edges:P[],face:P[]) {
  const e1=sub(face[1],face[0]),e2=sub(face[2],face[0]);
  for(let k=0;k<3;k++) {
   const a=edges[k],direction=sub(edges[(k+1)%3],a),h=cross3(direction,e2),det=dot(e1,h);
   if(Math.abs(det)<1e-10) continue;
   const delta=sub(a,face[0]),u=dot(delta,h)/det;
   if(u<0||u>1) continue;
   const q=cross3(delta,e1),v=dot(direction,q)/det,t=dot(e2,q)/det;
   if(v>=0&&u+v<=1&&t>=0&&t<=1) levels.push(a[2]+direction[2]*t);
  }
 }
 for(let i=0;i<bounds.length;i++) {
  const a=bounds[i];
  for(let j=i+1;j<bounds.length&&bounds[j].lo[0]<=a.hi[0]+EPS;j++) {
   const b=bounds[j];
   if([1,2].some(k=>a.lo[k]>b.hi[k]+EPS||b.lo[k]>a.hi[k]+EPS)) continue;
   if(a.hi[2]-a.lo[2]<EPS||b.hi[2]-b.lo[2]<EPS) continue; // already vertex heights
   hits(a.p,b.p);hits(b.p,a.p);
  }
 }
 return levels;
}
export function validateSpatial(meshes: Mesh[]) {
  const fail = (message: string, supported = true) => ({
    valid: false,
    supported,
    errors: [message],
    toleranceMm: EPS,
  });
  const sides: Side[] = [],
    levels: number[] = [], faces: P[][] = [];
  for (const [region, mesh] of meshes.entries()) {
    for (let i = 0; i < mesh.triangles.length; i += 3) {
      const p = mesh.triangles
        .slice(i, i + 3)
        .map((id) => mesh.vertices.slice(id * 3, id * 3 + 3) as P);
      if (
        p.length !== 3 ||
        p.some((v) => v.length !== 3 || v.some((n) => !Number.isFinite(n)))
      )
        return fail("Invalid triangle", false);
      const lo = Math.min(...p.map((v) => v[2])),
        hi = Math.max(...p.map((v) => v[2]));
      levels.push(lo, hi);
      if (hi - lo < 1e-9) continue;
      const [a, b, c] = p,
        ux = b[0] - a[0],
        uy = b[1] - a[1],
        uz = b[2] - a[2],
        vx = c[0] - a[0],
        vy = c[1] - a[1],
        vz = c[2] - a[2];
      const nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz;
      faces.push(p);
      sides.push({ p, lo, hi, nx, ny, region });
    }
  }
  const tilted = sides.some(s=>{const [a,b,c]=s.p;const nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);return Math.abs(nz)>1e-9*Math.hypot(s.nx,s.ny,nz);});
  const zs = unique(tilted ? [...levels,...intersectionLevels(faces)] : levels);
  let slabs = 0;
  for (let zi = 1; zi < zs.length; zi++) {
    const z = (zs[zi - 1] + zs[zi]) / 2,
      segments: Segment[] = [];
    for (const side of sides) {
      if (z <= side.lo || z >= side.hi) continue;
      const hits: P[] = [];
      for (let i = 0; i < 3; i++) {
        const a = side.p[i],
          b = side.p[(i + 1) % 3];
        if (a[2] < z === b[2] < z) continue;
        const t = (z - a[2]) / (b[2] - a[2]);
        hits.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), z]);
      }
      if (hits.length !== 2 || distance(hits[0], hits[1]) < 1e-9) continue;
      let [a, b] = hits;
      if ((b[0] - a[0]) * -side.ny + (b[1] - a[1]) * side.nx < 0)
        [a, b] = [b, a];
      segments.push({ a, b, region: side.region });
    }
    if (!segments.length) continue;
    slabs++;
    // Sweep x bounds: reject proper contour crossings. Same-region coincident
    // segments indicate duplicated/interpenetrating shells, not shared materials.
    segments.sort(
      (a, b) => Math.min(a.a[0], a.b[0]) - Math.min(b.a[0], b.b[0]),
    );
    for (let i = 0; i < segments.length; i++) {
      const a = segments[i],
        maxX = Math.max(a.a[0], a.b[0]);
      for (let j = i + 1; j < segments.length; j++) {
        const b = segments[j];
        if (Math.min(b.a[0], b.b[0]) > maxX + EPS) break;
        if (
          Math.min(a.a[1], a.b[1]) > Math.max(b.a[1], b.b[1]) + EPS ||
          Math.min(b.a[1], b.b[1]) > Math.max(a.a[1], a.b[1]) + EPS
        )
          continue;
        const lengthA = distance(a.a, a.b),
          lengthB = distance(b.a, b.b),
          d1 = cross(a.a, a.b, b.a) / lengthA,
          d2 = cross(a.a, a.b, b.b) / lengthA,
          d3 = cross(b.a, b.b, a.a) / lengthB,
          d4 = cross(b.a, b.b, a.b) / lengthB;
        if (
          d1 * d2 < 0 &&
          d3 * d4 < 0 &&
          Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)) > EPS
        )
          return fail(
            a.region === b.region
              ? "Self-intersecting section"
              : "Material interiors cross",
          );
        if (
          a.region === b.region &&
          Math.max(Math.abs(d1), Math.abs(d2)) < EPS
        ) {
          const axis =
            Math.abs(a.b[0] - a.a[0]) > Math.abs(a.b[1] - a.a[1]) ? 0 : 1;
          const overlap =
            Math.min(
              Math.max(a.a[axis], a.b[axis]),
              Math.max(b.a[axis], b.b[axis]),
            ) -
            Math.max(
              Math.min(a.a[axis], a.b[axis]),
              Math.min(b.a[axis], b.b[axis]),
            );
          if (overlap > EPS)
            return fail("Duplicated or overlapping section boundaries");
        }
      }
    }
    // No proper crossings remain. Between consecutive vertex y values the
    // ordering of boundaries is fixed, so a midpoint scan detects containment,
    // identical regions, and nested same-region shells without random sampling.
    const ys = unique(segments.flatMap((s) => [s.a[1], s.b[1]]));
    for (let yi = 1; yi < ys.length; yi++) {
      const y = (ys[yi - 1] + ys[yi]) / 2;
      const events: { x: number; region: number; delta: number }[] = [];
      for (const { a, b, region } of segments)
        if (a[1] < y !== b[1] < y)
          events.push({
            x: a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]),
            region,
            delta: a[1] < b[1] ? -1 : 1,
          });
      events.sort((a, b) => a.x - b.x);
      const winding = new Array<number>(meshes.length).fill(0);
      for (let i = 0; i < events.length; ) {
        const x = events[i].x;
        do {
          const e = events[i++];
          winding[e.region] += e.delta;
        } while (i < events.length && events[i].x - x < EPS);
        if (i < events.length && events[i].x - x > EPS) {
          if (winding.some((w) => Math.abs(w) > 1))
            return fail("Self-overlapping section interior");
          if (winding.filter((w) => w !== 0).length > 1)
            return fail("Material interiors overlap");
        }
      }
      if (winding.some((w) => w !== 0)) return fail("Open section contour");
    }
  }
  return {
    valid: true,
    supported: true,
    errors: [] as string[],
    toleranceMm: EPS,
    slabs,
  };
}
