// Run prepare-font-comparison.py first, then run this with pnpm tsx from the root.
import { readFileSync, writeFileSync } from "node:fs";
import { layoutName } from "../src/layout";

const researchDirectory = ".superpowers/sdd/m2-cjk/";
const evidenceFile = "docs/acceptance/font-candidates.json";
const evidence = JSON.parse(readFileSync(evidenceFile, "utf8"));
const names = ["陈小山", "张伟", "林小川", "曦馨罐", "戴薛", "sample-user", "skyline_dev2026", "build-agent_123"];
for (const candidate of evidence.candidates) {
  candidate.measurements = [];
  for (const variant of candidate.variants) {
    const path = variant.includes("/") ? variant : researchDirectory + variant;
    const bytes = Uint8Array.from(readFileSync(path)).buffer;
    for (const name of names) {
      for (const size of ["small", "medium", "large"] as const) {
        const trial = { variant: variant.split("/").at(-1), name, size };
        try {
          const ink = layoutName(name, bytes, {}, size, 145);
          candidate.measurements.push({
            ...trial, emMm: ink.report.sizeMm, inkWidthMm: Number(ink.width.toFixed(3)),
            inkHeightMm: Number(ink.height.toFixed(3)), minStrokeMm: ink.report.minStrokeMm,
            minGapMm: ink.report.minGapMm, lines: ink.report.lines,
          });
        } catch (error) {
          candidate.measurements.push({ ...trial, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }
}
writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + "\n");
