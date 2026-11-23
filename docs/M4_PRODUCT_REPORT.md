# M4 product redesign

Implemented on **feat/m4-product-redesign**, from the clean M3 checkout at **38afe219bd617d2e94f807edfbe59cc8b60c1295**. Implementation SHA: **56acb87df6c35565f73c22ccdd74c152c2039572**. The following evidence-only commit records this report, acceptance and generated artifacts. M3 history is unchanged. No merge, PR, deployment, publication, visibility change, printer/slicer connection or owner-machine access was performed.

## Interface

The interface uses **shadcn/ui + Tailwind CSS**, with **Base UI** Button and Tabs primitives. Button and Tabs source came from the official Base Nova registry, with local import/style adaptations. MIT attribution is retained in `licenses/shadcn-ui-MIT.txt` and `THIRD_PARTY_NOTICES.md`. No paid kit or Radix dependency was added.

Official references consulted:

- https://ui.shadcn.com/docs
- https://ui.shadcn.com/docs/installation/vite
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://github.com/shadcn-ui/ui/blob/main/LICENSE.md

The landing page now presents a real interactive 3D model as its dominant visual, beside a focused GitHub/Gitee username form. The studio exposes Input → Customize → Export navigation, a large persistent model stage, and full-width tab panels. New typography, green/neutral surfaces, palette previews, material controls, export measurements and responsive stacking apply throughout the interface. English and zh-CN remain available. Synthetic examples stay labeled; mocked calendar screenshots carry an explicit test-evidence banner.

Base UI provides keyboard tab navigation. Forms retain labels and focus outlines. Tests check controlled text/surface contrast, tab keyboard behavior, viewport overflow and minimum panel width. Visual inspection caught and corrected a tab-content squeeze and an invisible header wordmark. This is an accessibility smoke check, not a full assistive-technology audit.

GitHub/Gitee public calendars remain the primary route through the unchanged restricted relay. Existing qualification evidence is retained; GitLab is still Beta. M4 tests use synthetic mocked calendars, with no new live-source qualification claim. Default engraving remains the explicitly supplied source username or neutral `skyline-demo`; **VibeSkyline Grid** and its font notices remain intact. No legal name or private calibration coupon was added to public examples.

## Printer-agnostic output

Public defaults no longer generate physical spool assignments or assume an A1 bed, AMS lite, four-slot capacity or a specific slicer. The old 256 mm layout gate and printer-margin output are removed. Free color choices produce named material groups. An actual five-material browser download is reopened and validated in acceptance.

STL remains a connected monochrome union. Core 3MF remains a standard multi-part assembly with millimeter units, base materials/colors, and `materials.json`; `material-groups.json` and `MATERIAL-MAPPING.txt` replace printer-specific sidecars. The slicer owns filament mapping. No printer/process/project profile is emitted, and universal slicer compatibility is not claimed.

Mesh topology/connectivity, spatial validation, Float32 checks, lettering stroke/gap limits, volume and density-based mass calculations remain tested. UI measurements are geometry bounds, checked against exported meshes. Purge and print time remain unknown until sliced. Private coupon utilities remain internal and clearly private; the public UI no longer exposes them.

M3 has no persisted recipe store or recipe-file upload UI. The exported `migrateRecipe` compatibility helper preserves names, source colors and rendered sharing choices, then drops hardware assignments without silently recoloring. Tests cover this migration. Legacy slot-aware APIs remain for existing internal callers; they do not drive public defaults.

## Open activity protocol

File protocol: **vibeskyline.activity.v2**, an evolution of the existing bundle. Internal rendering still normalizes to the existing ActivityBundle representation. Supported v1 daily bundles have strict compatibility handling; supplied timezones survive, missing timezones remain unknown. Unsupported versions, unknown metrics, unsafe legacy fields and unrecognized accounting profiles fail closed.

Stable self-hostable paths, relative to the actual site origin:

| Path | Content |
| --- | --- |
| `/protocol/v2/spec.md` | Human-readable rules and compatibility policy |
| `/protocol/v2/activity.schema.json` | Closed JSON Schema, draft-07 |
| `/protocol/v2/synthetic.bundle.json` | Synthetic multi-source daily example |
| `/protocol/v2/offline-pack.zip` | Specification + schema + example |

No production public URL exists or is claimed. `scripts/protocol-pack.ts` creates the static assets and matching example artifacts reproducibly.

The contract distinguishes metric/unit, timezone, date/value, coverage, provenance and unknown versus zero. Tokens mean usage: input includes cache, output includes reasoning, and total is input + output only. Unsupported metrics never become tokens. Validation combines JSON Schema with cross-field semantic checks, safe integer accounting, actual IANA timezones, date/year/coverage checks and provenance references. Limits are 2 MiB, six sources, 366 records per source and 2196 total. Errors locate the failing JSON path without echoing rejected values. Arbitrary URLs, scripts, unsafe keys, raw-log fields and extra properties are rejected; file contents cannot trigger fetching or execution.

The secondary import panel offers a copyable agent prompt, format help, manual clipboard fallback and offline pack. The prompt uses the actual page origin, warns about localhost/LAN reachability, and embeds the complete schema and a synthetic example. It requires explicitly authorized scope on the user's machine, no raw-record upload, no tool installation/API keys/unrelated scans, no invented history, and a file for manual upload. Browser imports accept daily JSON only. Existing raw adapters and one-shot helper remain secondary and synthetic-fixture tested.

## Acceptance and artifacts

The final command results, durations, log hashes, implementation SHA, screenshot hashes and limitations are recorded in [m4-product.json](acceptance/m4-product.json).

| Command | Result | Duration |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Passed | 0.6 s |
| `pnpm -r typecheck` | Passed | 11.0 s |
| `pnpm -r lint` | Passed | 3.4 s |
| `pnpm -r test` | Passed | 23.1 s |
| `pnpm -r build` | Passed | 14.5 s |
| `pnpm exec tsc --noEmit` | Passed | 3.4 s |
| `pnpm exec eslint .` | Passed | 1.4 s |
| `pnpm test` | Passed | 21.3 s |
| `pnpm test:e2e` | Passed | 98.9 s |

Root tests: **194 passed across 21 files** (including 18 protocol tests). Browser acceptance: **20 passed, none skipped**.

All 20 browser tests remain in the adapted regression suite, including the three new M4 flows. Old printer-slot expectations were replaced with free material-group checks. Raw-log browser tests now assert rejection, while helper adapter tests remain. Calibration, mesh, fonts, custom SVG safety, stale geometry, source identity and relay boundary coverage remain in the appropriate unit/browser tests.

Screenshots: [docs/screenshots/m4-product](screenshots/m4-product/), including bilingual desktop landing, mobile landing/studio, synthetic demo, colors/materials, five-material export with mm dimensions, explicitly mocked GitHub/Gitee username/model flows, offline prompt, imported synthetic model and privacy. Examples: [docs/examples/m4-product](examples/m4-product/), containing schema, bundle, spec, offline ZIP, actual browser-downloaded STL/3MF and SHA-256 hashes in `summary.json`.

## Remaining limits

- No deployed origin; cross-machine agents should use the embedded prompt or offline pack until they can reach the self-hosted instance.
- Local-history completeness and real AI producer compatibility are not established. Fixtures are synthetic; arbitrary labels cannot cryptographically prove user authorization or non-sensitive content.
- Source scales remain independent. v2 supports known integer metrics only; estimated records and free-form v1 reconciliation are rejected.
- Some browser chunks exceed Vite's 500 kB warning threshold. The real landing preview loads the 3D/font/WASM assets; low-end/mobile performance has not been benchmarked.
- Slicer filament mapping, layer behavior, material interactions and physical printing are unqualified. Geometry checks are not a physical safety guarantee.
- **Real logos ON by default: NOT satisfied. Not sliced or physically printed.**
