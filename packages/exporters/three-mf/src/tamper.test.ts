import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { validate3MF } from "./validate";
const sample = await readFile(
  new URL("../../../../docs/examples/m1/synthetic-demo.3mf", import.meta.url),
);
it("rejects closed material regions translated into the plinth in persisted 3MF XML", () => {
  const files = unzipSync(sample);
  const xml = strFromU8(files["3D/3dmodel.model"]);
  files["3D/3dmodel.model"] = strToU8(
    xml.replace(/<object id="3"[^>]*>[\s\S]*?<\/object>/, (part) =>
      part.replace(/z="([^"]+)"/g, (_, z: string) => `z="${Number(z) - 0.2}"`),
    ),
  );
  expect(() => validate3MF(zipSync(files))).toThrow(/interiors/);
});
it("rejects tampered budget mass independently of mesh topology", () => {
  const files = unzipSync(sample),
    budget = JSON.parse(strFromU8(files["materials.json"]));
  budget.materials[0].grams += 1;
  files["materials.json"] = strToU8(JSON.stringify(budget));
  expect(() => validate3MF(zipSync(files))).toThrow(/mass mismatch/);
});
it("rejects unhandled component transforms and duplicate placements instead of validating unplaced meshes", () => {
  for (const replacement of [
    '<component objectid="3" transform="1 0 0 0 1 0 0 0 1 0 0 -0.2"/>',
    '<component objectid="3"/><component objectid="3"/>',
  ]) {
    const files = unzipSync(sample);
    files["3D/3dmodel.model"] = strToU8(
      strFromU8(files["3D/3dmodel.model"]).replace(
        '<component objectid="3"/>',
        replacement,
      ),
    );
    expect(() => validate3MF(zipSync(files))).toThrow(/placement|transform/i);
  }
});
