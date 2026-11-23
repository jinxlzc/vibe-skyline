// Run from the repository root with pnpm tsx packages/geometry/scripts/lettering-matrix.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deepStrictEqual } from "node:assert";
import { buildPlan, defaultRecipe, demoBundle } from "../../core/src/index";
import { generateGeometry, validateMesh, validateSpatial } from "../src/index";
import { findNameLayoutAlternatives, layoutName, layoutPlinth, type NameSize } from "../src/layout";
import type { TextMeasurement } from "../src/engraving";

type MatrixInput = { name: string; nameSize: NameSize; namePlacement: "front" | "rear" };
type MeasuredRow = MatrixInput & Pick<TextMeasurement, "sizeMm" | "minStrokeMm" | "minGapMm" | "lines"> & {
  fits: true;
  widthMm: number;
  depthMm: number;
  inkWidthMm: number;
  inkHeightMm: number;
  frontBandMm: number;
  rearBandMm: number;
  geometryChecks: "passed";
  physicallyQualified: false;
};
type RejectedRow = MatrixInput & {
  fits: false;
  reason: string;
  fullBandMeasurement?: TextMeasurement & { widthMm: number; heightMm: number };
  alternatives: ReturnType<typeof findNameLayoutAlternatives>;
};

const font = Uint8Array.from(readFileSync(new URL("../assets/VibeSkylineGrid-Regular.ttf", import.meta.url))).buffer;
const out = new URL("../../../docs/acceptance/", import.meta.url);
const corpus = [
  "张伟", "山川", "陈小山", "林小川", "陈小明", "欧阳子轩", "司马小明", "诸葛明月",
  "欧阳林小川", "司马山川明月", "戴薛", "曦馨罐", "陈小山_dev9", "sample-user",
  "skyline_dev2026", "build-agent_123", "alexanderbuilds", "2026_01-05", "WIDE_username_2026_build",
  "欧阳司马诸葛上官夏侯东方南宫长孙", "龘",
];
const bundle = demoBundle(2026,4);
for (const source of bundle.sources) source.days = source.days.map((d, i) => ({
  ...d, state: i === 0 ? "observed" : "known-zero", value: i === 0 ? 3 : 0,
}));
const round = (value: number) => Number(value.toFixed(4));
function rejectionReason(error: unknown): string {
  if (error instanceof Error && /^(Missing CJK \/ Latin glyphs:|Unsupported shaping for graphemes:|Name layout:|Name size: Text size exceeds the supported range:)/u.test(error.message)) {
    return error.message;
  }
  throw error;
}

const caseRows: (MeasuredRow | RejectedRow)[] = [];
const markdown = [
  "# Lettering measurements", "",
  "Four synthetic sources on the 111.0 mm baseline plan. All passing dimensions below come from the selected VibeSkyline Grid outlines. Small and Medium front keep that baseline. Large and rear permit explicit growth. Missing characters are reported before meshing.", "",
  "Each successful case passed independent mesh bounds, volume, closure and connectivity checks on the mono solid, closure on each material, and the layered spatial checks on mono and material solids. The calipers sample eight directions and do not certify terminals or physical print quality. No physical print evidence is available.", "",
  "Cells show total depth in millimetres. Each rejected cell has its exact reason and its measured alternatives in the [JSON measurements](lettering-matrix.json).", "",
  "| Name | Front S | Front M | Front L | Rear S | Rear M | Rear L |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
];
for (const name of corpus) {
  const summary = [name];
  for (const namePlacement of ["front", "rear"] as const) {
    for (const nameSize of ["small", "medium", "large"] as const) {
      const input = buildPlan(bundle, { ...defaultRecipe, slotAssignments: undefined, name, nameSize, namePlacement });
      let layout;
      try {
        layout = layoutPlinth(input, font, {});
      } catch (error) {
        const reason = rejectionReason(error);
        const alternatives = findNameLayoutAlternatives(input, font);
        let fullBandMeasurement;
        try {
          const ink = layoutName(name, font, {}, nameSize, input.width - 12);
          fullBandMeasurement = { ...ink.report, widthMm: round(ink.width), heightMm: round(ink.height) };
        } catch (measurementError) {
          // A known font-coverage or size rejection can prevent even an unplaced measurement.
          rejectionReason(measurementError);
        }
        caseRows.push({ name, nameSize, namePlacement, fits: false, reason, fullBandMeasurement, alternatives });
        summary.push("—");
        continue;
      }
      const g = await generateGeometry(input, font);
      const errors = [
        ...validateMesh(g.mono, layout.plan).errors,
        ...g.regions.flatMap(region => validateMesh(region.mesh, undefined, false).errors),
        ...validateSpatial([g.mono]).errors,
        ...validateSpatial(g.regions.map(region => region.mesh)).errors,
      ];
      if (errors.length) throw new Error(name + " " + nameSize + " " + namePlacement + " " + errors.join(", "));
      const points = layout.namePaths.flat();
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const { identity, plan } = layout;
      caseRows.push({
        name, nameSize, namePlacement, fits: true, widthMm: round(plan.width), depthMm: round(plan.depth),
        inkWidthMm: round(Math.max(...xs) - Math.min(...xs)), inkHeightMm: round(Math.max(...ys) - Math.min(...ys)),
        sizeMm: identity.name.sizeMm, minStrokeMm: identity.name.minStrokeMm, minGapMm: identity.name.minGapMm,
        lines: identity.name.lines, frontBandMm: identity.frontBandMm, rearBandMm: identity.rearBandMm,
        geometryChecks: "passed", physicallyQualified: false,
      });
      summary.push(plan.depth.toFixed(1));
    }
  }
  markdown.push("| " + summary.join(" | ") + " |");
}
markdown.push("", "## Measured features", "",
  "Each cell lists minimum measured stroke / gap in millimetres, rounded to three decimals. Values use the front layout if it fits and otherwise the same preset on the rear. The JSON records placement-specific measurements and line breaks.", "",
  "| Name | Small | Medium | Large |", "| --- | ---: | ---: | ---: |");
for (const name of corpus) {
  const features = (["small", "medium", "large"] as const).map(size => {
    const trial = caseRows.find(c => c.name === name && c.nameSize === size && c.fits);
    if (!trial?.fits) return "—";
    return [trial.minStrokeMm, trial.minGapMm].map(v => v?.toFixed(3) ?? "unmeasured").join(" / ");
  });
  markdown.push("| " + [name, ...features].join(" | ") + " |");
}
const expectedRejections = new Set([
  "曦馨罐 medium front", "陈小山_dev9 medium front",
  "WIDE_username_2026_build small front", "WIDE_username_2026_build medium front",
  "欧阳司马诸葛上官夏侯东方南宫长孙 small front", "欧阳司马诸葛上官夏侯东方南宫长孙 medium front",
  "龘 small front", "龘 medium front", "龘 large front",
  "龘 small rear", "龘 medium rear", "龘 large rear",
]);
const rejected = caseRows.filter(row => !row.fits).map(row => [row.name, row.nameSize, row.namePlacement].join(" "));
deepStrictEqual(new Set(rejected), expectedRejections, "Review changed fit outcomes before updating the acceptance matrix.");
const record = { font: "VibeSkylineGrid-Regular.ttf", fontSha256: createHash("sha256").update(new Uint8Array(font)).digest("hex"), thresholdMm: { stroke: 0.8, gap: 0.6 }, baselineDepthMm: 111, cases: caseRows };
writeFileSync(new URL("lettering-matrix.json", out), JSON.stringify(record, null, 2) + "\n");
writeFileSync(new URL("lettering-matrix.md", out), markdown.join("\n") + "\n");
