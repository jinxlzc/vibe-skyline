# Milestone 2 public defaults evidence

These are **SYNTHETIC-DEMO** engineering examples downloaded from the built local app using Playwright. Public examples use `skyline-demo`, a mocked `synthetichandle`, or the manual test label `custom-maker`. They do not contain owner activity, real usage logs, or fetched upstream calendar data.

**PRIVATE CALIBRATION: all three `private-calibration-coupon*` files contain the owner-requested identity specimens. They are private calibration artifacts, not public samples or public defaults. Inspect and exclude them before sharing this packet.**

Every model and slot sidecar was produced by an actual browser download and persisted through `Download.saveAs`. The test reopened the saved bytes for independent STL / Core 3MF topology and spatial validation. `summary.json` records SHA-256, byte count, dimensions, volumes, material mass estimates, slots, feature measurements and validation results. `recipe-source.json` describes the synthetic provenance, defaults, mocked names and six theme checks.

| File | Purpose | Dimensions (mm) | Volume (cm³) | PLA estimate (g) | Materials |
| --- | --- | --- | --- | --- | --- |
| [default.3mf](default.3mf) | Immediate unchanged public defaults; four explicit slots | 171.8 × 87.2 × 21.2 | 83.74261 | 103.84084 | 4 |
| [slots.json](slots.json) | Default slot intent; matches embedded 3MF sidecar | — | — | — | — |
| [default-mono.stl](default-mono.stl) | Connected mono version of the default model | 171.8 × 87.2 × 21.2 | 83.74261 | 103.84084 | 1 |
| [alternate-theme.3mf](alternate-theme.3mf) | Obsidian theme using default slot assignments | 171.8 × 87.2 × 21.2 | 83.74261 | 103.84084 | 4 |
| [github-handle.3mf](github-handle.3mf) | Mocked GitHub username engraved automatically | 171.8 × 39.6 × 21.2 | 21.41470 | 26.55423 | 2 |
| [manual-custom.3mf](manual-custom.3mf) | Manual name preserved after adding a mocked Gitee source | 171.8 × 63.4 × 21.2 | 33.95743 | 42.10721 | 3 |
| [private-calibration-coupon.stl](private-calibration-coupon.stl) | PRIVATE owner-identity calibration; mono | 131.0 × 90.0 × 3.8 | 38.81369 | 48.12898 | 1 |
| [private-calibration-coupon.3mf](private-calibration-coupon.3mf) | PRIVATE owner-identity calibration; two materials | 131.0 × 90.0 × 3.8 | 38.81369 | 48.12898 | 2 |
| [private-calibration-coupon-slots.json](private-calibration-coupon-slots.json) | PRIVATE calibration slot intent | — | — | — | — |

Mass uses geometric solid volume at 1.24 g/cm³; it is not a slicer estimate. The default text/base contrast is 5.8105:1 and text uses a different slot from the base. All six theme defaults passed the browser checks for at most four materials and text/base contrast at least 3:1. Serialized text measurements pass stroke ≥ 0.80 mm and defined gap ≥ 0.60 mm. These measurements do not establish complete physical feature qualification.

The GitHub-name and manual-name browser exports were compared against independently generated expected meshes; the manual-name export also differs from geometry generated with the source username. Raw activity, source identities as metadata, paths and usage logs are not attached to models; engraved names remain visible in their geometry.

No slicing, printer connection, physical print, Bambu Studio filament mapping verification or official-logo rights qualification was performed. Purge and print time remain **unknown until sliced**. Core 3MF material slots are recorded as intent and require verification in the target slicer. Default logo tiles are original replaceable assets.

Screenshots are in [the matching screenshot packet](../../screenshots/m2-defaults/). The browser suite is `pnpm test:e2e`; the focused acceptance is `pnpm exec playwright test tests/defaults.spec.ts` after `pnpm -r build`.
