# SYNTHETIC-DEMO — engineering acceptance artifacts

**Entirely synthetic. Not the owner's activity. Not print-ready. No slicer or printer was connected.**

These files are actual Playwright browser downloads, persisted with `download.saveAs` by `tests/studio.spec.ts`. The saved bytes are read back and independently checked; they are not regenerated separately by a CLI export helper.

- `synthetic-demo.stl`: single-material union, millimeters.
- `synthetic-demo.3mf`: four-material Core 3MF, with explicit base/source sharing.
- `materials.json`: material budget extracted and parsed from that downloaded 3MF.
- `synthetic-demo-two-tone.3mf` and `materials-two-tone.json`: two-material variant; mesh Z ranges prove the material boundary at 3.20 mm.
- `recipe-source.json`: exact control choices and source description. The embossed name is SYNTHETIC-DEMO. Four deterministic synthetic sources, year 2024, Monday start, neutral glyphs, Obsidian theme.
- `summary.json`: persisted-byte SHA-256, file sizes, geometry dimensions, material counts, mesh-derived cm³ and PLA mass (1.24 g/cm³), plus topology/spatial results. STL volume/mass represents one spool; the multicolor budgets represent distinct color/spool regions.

Spatial validation is scoped to M1 layered vertical prisms at 0.0001 mm tolerance. It detects proper section crossings, duplicate section boundaries, nested same-region winding and positive-area material overlap. It is not a generic arbitrary-surface self-intersection proof: zero-volume contacts on layer caps, sub-tolerance defects, printable minimum features and physical process behavior remain unqualified. Sloped surfaces fail the supported-shape gate. Core 3MF validation accepts the flat untransformed M1 assembly profile only; component transforms and repeated placements fail closed. No print-time or flush estimate is invented.

Recreate with `pnpm -r build && pnpm test:e2e`. All retained examples together must remain below 20 MB. Materials JSON and summaries are human-readable companions to the unchanged browser-downloaded binaries.
