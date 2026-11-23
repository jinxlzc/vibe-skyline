import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { MaterialBudget } from "@vibeskyline/contracts";
import {
  validateMesh,
  validateSpatial,
  type Mesh,
} from "@vibeskyline/geometry";
export function validate3MF(bytes: Uint8Array) {
  const files = unzipSync(bytes),
    parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
    });
  const read = (key: string) => {
    if (!files[key]) throw Error("Missing package part " + key);
    const text = strFromU8(files[key]);
    if (XMLValidator.validate(text) !== true) throw Error("Invalid XML");
    return parser.parse(text);
  };
  const types = read("[Content_Types].xml"),
    rels = read("_rels/.rels"),
    model = read("3D/3dmodel.model").model;
  if (
    types.Types["@xmlns"] !==
      "http://schemas.openxmlformats.org/package/2006/content-types" ||
    rels.Relationships.Relationship["@Target"] !== "/3D/3dmodel.model" ||
    model["@unit"] !== "millimeter" ||
    model["@xmlns"] !==
      "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  )
    throw Error("Invalid package namespaces, units or relationships");
  const list = (v: any): any[] => (Array.isArray(v) ? v : [v]);
  const bases = list(model.resources.basematerials.base),
    objects = list(model.resources.object),
    ids = objects.map((o) => o["@id"]);
  if (
    new Set(ids).size !== ids.length ||
    ids.includes(model.resources.basematerials["@id"])
  )
    throw Error("Duplicate resource ID");
  const meshes: Mesh[] = [];
  for (const o of objects) {
    if (!o["@name"]) throw Error("Unnamed region");
    if (!o.mesh) continue;
    if (
      o["@pid"] !== model.resources.basematerials["@id"] ||
      !bases[Number(o["@pindex"])]
    )
      throw Error("Invalid material assignment");
    const mesh = {
      vertices: list(o.mesh.vertices.vertex).flatMap((v) => [
        Number(v["@x"]),
        Number(v["@y"]),
        Number(v["@z"]),
      ]),
      triangles: list(o.mesh.triangles.triangle).flatMap((t) => [
        Number(t["@v1"]),
        Number(t["@v2"]),
        Number(t["@v3"]),
      ]),
    };
    const result = validateMesh(mesh, undefined, false);
    if (!result.valid) throw Error(result.errors.join(", "));
    meshes.push(mesh);
  }
  const root = objects.find((o) => o["@id"] === model.build.item["@objectid"]);
  if (
    !root?.components ||
    list(root.components.component).some((c) => !ids.includes(c["@objectid"]))
  )
    throw Error("Invalid build assembly");
  const placements = list(root.components.component);
  const meshIds = objects.filter((o) => o.mesh).map((o) => o["@id"]);
  if (model.build.item["@transform"] || placements.some((c) => c["@transform"]))
    throw Error(
      "Component transforms are outside the supported M1 placement profile",
    );
  if (
    placements.length !== meshIds.length ||
    new Set(placements.map((c) => c["@objectid"])).size !== meshIds.length ||
    placements.some((c) => !meshIds.includes(c["@objectid"]))
  )
    throw Error("Invalid or repeated material placement");
  if (bases.some((b) => !/^#[0-9A-F]{8}$/i.test(b["@displaycolor"])))
    throw Error("Invalid color");
  const budget = MaterialBudget.parse(
    JSON.parse(strFromU8(files["materials.json"])),
  );
  if (budget.count !== meshes.length) throw Error("Budget mismatch");
  const spatial = validateSpatial(meshes);
  if (!spatial.valid) throw Error(spatial.errors.join(", "));
  const volumes = meshes.map(
    (mesh) => validateMesh(mesh, undefined, false).volume / 1000,
  );
  volumes.forEach((volume, i) => {
    if (
      Math.abs(volume - budget.materials[i].volumeCm3) > 1e-4 ||
      Math.abs(volume * budget.density - budget.materials[i].grams) > 1e-4
    )
      throw Error("Mesh/budget volume or mass mismatch");
  });
  if (
    Math.abs(volumes.reduce((a, b) => a + b, 0) - budget.totalVolumeCm3) >
      1e-4 ||
    Math.abs(budget.totalVolumeCm3 * budget.density - budget.totalGrams) > 1e-4
  )
    throw Error("Budget total mismatch");
  return { valid: true, meshes, budget, spatial };
}
