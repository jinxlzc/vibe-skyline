import {
  validateMesh,
  validateSpatial,
  type Mesh,
} from "@vibeskyline/geometry";
export function exportSTL(mesh: Mesh): Uint8Array {
  const spatial = validateSpatial([mesh]);
  if (!spatial.valid) throw Error(spatial.errors.join(", "));
  const check = validateMesh(mesh);
  if (!check.valid) throw Error(check.errors.join(", "));
  const bytes = new Uint8Array(84 + (mesh.triangles.length / 3) * 50),
    view = new DataView(bytes.buffer);
  bytes.set(
    new TextEncoder().encode("VibeSkyline / mm / unqualified physical print"),
  );
  view.setUint32(80, mesh.triangles.length / 3, true);
  for (let t = 0; t < mesh.triangles.length; t += 3) {
    const at = 84 + (t / 3) * 50,
      vertices = mesh.triangles
        .slice(t, t + 3)
        .map((i) => mesh.vertices.slice(i * 3, i * 3 + 3));
    const [a, b, c] = vertices,
      u = b.map((n, i) => n - a[i]),
      v = c.map((n, i) => n - a[i]),
      n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ],
      length = Math.hypot(...n);
    [...n.map((x) => x / length), ...vertices.flat()].forEach((x, i) =>
      view.setFloat32(at + i * 4, x, true),
    );
  }
  return bytes;
}
export function readSTL(bytes: Uint8Array): Mesh {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 84) throw Error("Truncated STL");
  const count = d.getUint32(80, true);
  if (bytes.length !== 84 + count * 50) throw Error("Invalid STL length");
  const vertices: number[] = [],
    triangles: number[] = [];
  for (let i = 0; i < count; i++)
    for (let j = 0; j < 9; j++) {
      vertices.push(d.getFloat32(84 + i * 50 + 12 + j * 4, true));
      if (j % 3 === 0) triangles.push(triangles.length);
    }
  return { vertices, triangles };
}
