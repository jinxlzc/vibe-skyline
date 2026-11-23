import { slotIntent, mappingInstructions } from "./slots";
import { zipSync, strToU8 } from "fflate";
import type { Geometry } from "@vibeskyline/geometry";
import { validateMesh } from "@vibeskyline/geometry";
export function export3MF(geometry: Geometry, _unrestricted = false) {
  if (!validateMesh(geometry.mono).valid) throw Error("Invalid geometry");
  const { regions, budget } = geometry;
  const objects = regions
    .map(
      (r, i) =>
        `<object id="${i + 2}" type="model" name="Material ${i + 1} ${r.color}" pid="1" pindex="${i}"><mesh><vertices>${Array.from({ length: r.mesh.vertices.length / 3 }, (_, n) => `<vertex x="${r.mesh.vertices[n * 3]}" y="${r.mesh.vertices[n * 3 + 1]}" z="${r.mesh.vertices[n * 3 + 2]}"/>`).join("")}</vertices><triangles>${Array.from({ length: r.mesh.triangles.length / 3 }, (_, n) => `<triangle v1="${r.mesh.triangles[n * 3]}" v2="${r.mesh.triangles[n * 3 + 1]}" v3="${r.mesh.triangles[n * 3 + 2]}"/>`).join("")}</triangles></mesh></object>`,
    )
    .join("");
  const rootId = regions.length + 2,
    xml = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">${geometry.coupon ? "PRIVATE CALIBRATION — owner identity — " : ""}VibeSkyline Core 3MF — mapping not verified</metadata><resources><basematerials id="1">${regions.map((r, i) => `<base name="Material ${i + 1}" displaycolor="${r.color}FF"/>`).join("")}</basematerials>${objects}<object id="${rootId}" type="model" name="VibeSkyline assembly"><components>${regions.map((_, i) => `<component objectid="${i + 2}"/>`).join("")}</components></object></resources><build><item objectid="${rootId}"/></build></model>`;
  const measure=(m:NonNullable<Geometry['identity']>['name'])=>{const {sizeMm,minStrokeMm,minGapMm,method,qualified}=m;return {sizeMm,minStrokeMm,minGapMm,method,qualified};};
  const text=geometry.coupon ? [
    ...geometry.coupon.specimens.map((s,i)=>({region:`name-${i+1}`,preset:s.size,...measure(s.measurement)})),
    ...(geometry.coupon.annotations??[]).map(a=>({region:a.region,...measure(a.measurement)})),
  ] : geometry.identity ? [{region:'year',...measure(geometry.identity.year)},{region:'name',preset:geometry.identity.nameSize,placement:geometry.identity.namePlacement,...measure(geometry.identity.name)}] : [];
  const files = {
    "[Content_Types].xml":
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="json" ContentType="application/json"/><Default Extension="txt" ContentType="text/plain"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
    "3D/3dmodel.model": xml,
    "materials.json": JSON.stringify(budget, null, 2),
    "material-groups.json": JSON.stringify(slotIntent(geometry), null, 2),
    "features.json": JSON.stringify({audience:geometry.coupon?"private calibration — contains owner identity":"user export",qualification:"geometry measurements, not physically printed",text,logos:geometry.logoMeasurements??[]},null,2),
    "MATERIAL-MAPPING.txt": mappingInstructions,
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([k, v]) => [
        k,
        [strToU8(v), { mtime: new Date("2026-01-01T00:00:00Z") }],
      ]),
    ),
    { level: 6 },
  );
}
export { validate3MF } from "./validate";

export {slotIntent,mappingInstructions} from "./slots";
