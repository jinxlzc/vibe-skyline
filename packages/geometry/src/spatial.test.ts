import { it, expect } from "vitest";
import { validateMesh } from "./validate";
import { validateSpatial } from "./spatial";
import type { Mesh } from "./index";
// Hand-authored outward box; no generator/boolean library in regression fixtures.
const box = (x = 0, y = 0, z = 0, w = 2, d = 2, h = 2): Mesh => ({
  vertices: [
    x,
    y,
    z,
    x + w,
    y,
    z,
    x + w,
    y + d,
    z,
    x,
    y + d,
    z,
    x,
    y,
    z + h,
    x + w,
    y,
    z + h,
    x + w,
    y + d,
    z + h,
    x,
    y + d,
    z + h,
  ],
  triangles: [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2,
    3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ],
});
const join = (a: Mesh, b: Mesh): Mesh => ({
  vertices: [...a.vertices, ...b.vertices],
  triangles: [
    ...a.triangles,
    ...b.triangles.map((v) => v + a.vertices.length / 3),
  ],
});
it("rejects crossing shells even when edge topology and volume pass", () => {
  const mesh = join(box(), box(1, 0.4, 0.4));
  expect(validateMesh(mesh, undefined, false).valid).toBe(true);
  expect(validateSpatial([mesh]).valid).toBe(false);
  // A single connected bow-tie prism also passes the old topology checker.
  const connected = box();
  const xy = [
    [0, 0],
    [3, 2],
    [0, 3],
    [2, 0],
  ];
  for (let i = 0; i < 8; i++) {
    connected.vertices[i * 3] = xy[i % 4][0];
    connected.vertices[i * 3 + 1] = xy[i % 4][1];
  }
  expect(validateMesh(connected).valid).toBe(true);
  expect(validateSpatial([connected]).valid).toBe(false);
});
it("rejects crossing, coincident and contained material interiors", () => {
  for (const b of [box(1, 0.4, 0.4), box(), box(0.4, 0.4, 0.4, 0.4, 0.4, 0.4)])
    expect(validateSpatial([box(), b]).valid).toBe(false);
});
it("permits shared boundary contact and disjoint districts", () => {
  for (const b of [box(2), box(0, 0, 2), box(3)])
    expect(validateSpatial([box(), b])).toMatchObject({ valid: true });
});
it("rejects coplanar duplicated shells within a region", () => {
  expect(validateSpatial([join(box(), box())]).valid).toBe(false);
});
it("checks sloped surfaces by sections", () => {
  const mesh = box();
  mesh.vertices[12] = 0.2;
  expect(validateSpatial([mesh])).toMatchObject({
    valid: true,
    supported: true,
  });
});

it('detects overlap between tilted solids, including intersections between vertex heights',()=>{
 const a=box(),b=box(1,.3,.3);
 for(const mesh of [a,b])for(let i=0;i<mesh.vertices.length;i+=3)mesh.vertices[i]+=mesh.vertices[i+2]*.4;
 expect(validateSpatial([a,b]).valid).toBe(false);
 const c=box(2);for(let i=0;i<c.vertices.length;i+=3)c.vertices[i]+=c.vertices[i+2]*.4;
 expect(validateSpatial([a,c]).valid).toBe(true);
});

it('detects thin tilted shells that cross away from the midpoint',()=>{
 const a=box(0,0,0,.0004,.01,1),b=box(0,0,0,.0004,.01,1);
 for(let i=0;i<a.vertices.length;i+=3){a.vertices[i]+=a.vertices[i+2]*.005;b.vertices[i]+=.001-b.vertices[i+2]*.005;}
 expect(validateMesh(a).valid).toBe(true);expect(validateMesh(b).valid).toBe(true);
 expect(validateSpatial([a,b]).valid).toBe(false);
});
