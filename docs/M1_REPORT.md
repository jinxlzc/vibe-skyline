# Milestone 1 implementation report

This is a working local engineering slice, **not a print-qualified release**. No deployment, npm publish, pull request, merge, or visibility change was performed. `main` contains only the small bootstrap; implementation is on `feat/m1-vertical-slice`.

> **Real-logo requirement NOT satisfied.** The GitHub/Codex/Gemini/DeepSeek review found restricted terms for redistributed, recolored printable assets. No official SVG was vendored. The logo compiler is still a skeleton, not a finished feature. See [official-source review](../licenses/TRADEMARKS.md).

## Review round — persisted acceptance packet

This round continues from `34e393e20df83117da181d3fd59715365d828dc6` on the same feature branch. It adds actual browser-downloaded examples under [docs/examples/m1](examples/m1/README.md), each embossed/labeled **SYNTHETIC-DEMO**, never owner activity or print-ready. Playwright uses `download.saveAs`, then validates the bytes read from the saved files. Companion JSON records recipes, source description, exact SHA-256 hashes, material counts, mesh-derived volume/mass and bounds.

| Actual browser artifact | Bounds mm (rounded) | Materials | Mesh volume cm³ | PLA mass g |
|---|---|---:|---:|---:|
| `synthetic-demo.stl` | 171.8000 × 111.0000 × 21.2000 | 1 | 114.331895 | 141.771550 |
| `synthetic-demo.3mf` | 171.8000 × 111.0000 × 21.2000 | 4 | 114.331895 | 141.771550 |
| `synthetic-demo-two-tone.3mf` | 171.8000 × 111.0000 × 21.2000 | 2 | 114.331895 | 141.771550 |

The packet is about 3.2 MB, below the 20 MB limit, and is committed in this repository. `materials.json` and `materials-two-tone.json` come from the downloaded 3MF budgets and are checked against the meshes. Density is 1.24 g/cm³. Two-Tone mesh Z ranges meet at 3.20000005 mm (Float32), within tolerance of 3.20 mm. No slicer/printer connection was made. Purge, time, filament mapping and physical proof remain unknown/unqualified.

Changes and failures caught in this round:

- **Standalone live command:** reproduced `ECONNREFUSED` at port 5173 with both CLI paths passing and both proxy paths failing. The prior command assumed a separately started server; Playwright owns a different preview lifecycle. `LIVE=1 pnpm test:live` now starts the actual Vite dev middleware on an ephemeral loopback port, runs both CLI source entrypoints and real proxy routes, and closes its server in `finally`. It needs installed dependencies, not a pre-existing server or CLI build. Proxy failures identify HTTP/listener/timeout/schema categories without response content or handles. A real-server lifecycle test checks listener cleanup.
- **Two-Tone material collapse:** persisting a Two-Tone download caught a retained Multi-color “share base” choice collapsing both materials to one. Sharing resolutions now apply only to Multi-color; the selector is disabled for other tiers. The saved two-material file and a core regression prove the fix.
- **Independent spatial checks:** `packages/geometry/src/spatial.ts` uses triangle-derived Z sections, segment intersections and winding sweeps, without the mesher or boolean library. The 24-case grid/source matrix, saved STL and saved material meshes are checked. Hand-authored fixtures include a connected self-intersecting positive-volume prism, overlapping closed shells, duplicate shells, material containment/coincidence/crossings, legal touching boundaries and unsupported slopes.
- **Tampered 3MF:** regression tests modify saved XML to penetrate the plinth, change mass, introduce a component transform and repeat a placement. The validator rejects them. Mesh volume/mass and total budget are cross-checked. Transform application is not implemented: any transform, nesting or repeated/unreferenced material placement outside the flat M1 assembly profile fails closed.
- **zh-CN audit:** reviewed the complete desktop screenshot; translated studio/edition/layout labels, source units/status explanations, nozzle/layers, Mono/Two-Tone choices, boundary instructions, official-mark notice, brim and Core 3MF mapping caveat. Technical names and the mandated bilingual Sample badge remain. Unsupported CJK names show an explicit Chinese error and disable export; no silent glyph omission. Desktop/mobile screenshots are regenerated.

**Exact spatial guarantee limit:** checks apply to closed, oriented M1 meshes whose surfaces are horizontal caps or vertical walls, with 0.0001 mm numerical tolerance. Within open Z bands they detect proper section crossings, duplicated boundaries, multiple winding and positive-area material-interior overlap, including containment. They do **not** establish a general arbitrary-triangle self-intersection proof, zero-volume nonadjacent contacts confined to a horizontal cap, sub-tolerance defects, minimum printable features or physical process tolerances. Sloped meshes are rejected as unsupported. No claim of full physical qualification is made.

Fresh command outcomes and counts are recorded in [acceptance/m1-review.json](acceptance/m1-review.json). The prior intermediate failures were diagnosed and fixed; final results below reflect the completed rerun. Source statuses remain honest: GitHub/Gitee have fixture and real-request evidence; Codex/GitLab remain in-progress, and the sample Gemini/DeepSeek districts are synthetic unsupported adapters.

## Implemented

- pnpm monorepo with all requested M1 packages, strict TypeScript, Zod contracts, ESLint browser/Node boundaries, Vitest/fast-check and Playwright. No fake adapter packages.
- Versioned bundles with provenance and coverage; safe integer accounting; cache/reasoning subsets; distinct metric units; unknown vs zero. Tool and provider fields stay separate.
- GitHub tooltips (whole-series activity-level fallback preserves units), Gitee text-only parser with boundary trim, GitLab rolling JSON; restricted dev **and preview** proxy, fixed hosts, handles/year validation, redirects rejected, no header/token forwarding, 12-second timeout, 2 MiB response limit and bounded 64-entry cache.
- Codex local discovery, native zstd with fzstd fallback, browser fzstd worker, cancellation, daily timezone buckets, archive and snapshot deduplication. Unknown opening cumulative balance is never credited. Synthetic malformed lines, archive copy, compressed copy and privacy canaries are tested. CLI bin, dry-run, JSON, export, offline, year/timezone/provider flags and NO_COLOR receipt.
- Responsive bilingual studio, sample specimen, all four tabs, public calendars, file drag/drop, six themes, per-part colors, year/name/week-start/height/gamma/logo controls, live exact-mesh preview, coverage dates, source badges and persistent dimensions/material/A1 footer.
- Annual Districts 1–6 sources, Sunday/Monday and 53/54 columns; independent log/nearest-rank P95/gamma normalization, 0.20 mm quantization, known-zero flat cells, unknown 0.40 mm recesses, 6×6 mm clipped corner, real Lato Bold font outlines and original replaceable district identity.
- Explicit A1 material choices, no automatic capacity merge; mesh-derived per-material cm³/grams and configurable density. Default 4-source specimen is 171.8 × 111.0 × 21.2 mm, 5 materials. XY margins include a 5 mm brim. Two-Tone splits at Z=3.20 mm. Purge and time are unknown until sliced.
- Binary union STL and deterministic Core 3MF assembly with named material-region objects, base colors, OPC content/relationship parts and `materials.json`. Independent triangle validation checks closed edges, orientation, positive signed volume, bounds ±0.01 mm, Z layers, and connectivity; 3MF checks XML/package/reference/material rules. This is not full slicer certification.

## Validation record

Runtime: Node 22.22.2, pnpm 10.22.0. Dependency lockfile committed. Cached Chromium reused; no server browser download needed.

| Check | Result |
|---|---|
| `pnpm install` / frozen-lockfile install | Passed |
| `pnpm -r typecheck` | Passed |
| `pnpm -r lint` | Passed |
| `pnpm -r test` | Passed: 28 tests in 10 suites; package suites cover contracts, calendars, core, Codex reader/parser, CLI, geometry/exporters and logos |
| `pnpm -r build` | Passed; library declarations, bundled CLI, Vite production assets |
| Root `pnpm exec tsc --noEmit` / `pnpm exec eslint .` | Passed, including test/config/script sources |
| `pnpm test:e2e` | Passed: 4 Chromium tests, including actual compressed-file drop and validated downloads |

Geometry matrix: **24 combinations** (1–6 sources × 53/54 columns × Sunday/Monday), plus dense four-source export round trips, Two-Tone boundary, deliberately damaged mesh rejection, unknown-recess volume and explicit unsupported-glyph failure. STL downloads are parsed back and compared to displayed dimensions. 3MF downloads are unzipped and validated independently of the writer's XML construction.

Browser acceptance: load demo → theme → name/year/week start/logo mode → resolve capacity → download STL and 3MF; actual compressed-file drag/drop; mocked public-calendar proxy route; mobile horizontal-overflow check. Desktop screenshots are 1440px wide; mobile is 390px. Synthetic data only.

Optional live run used `LIVE=1 pnpm test:live`: GitHub and Gitee were checked via both CLI and a lifecycle-managed Vite dev proxy. Both adapters have fixture and live evidence and are marked verified. No fetched response or usage totals were saved or committed. GitLab and Codex remain in-progress because their M1 evidence is synthetic-only. All other registry sources are unsupported, even when their identity appears in the sample.

During implementation, a browser ESM font import mismatch, a Vite middleware return-hook issue, test discovery glob, typed-array test comparison and two coverage selectors were fixed. A stale-preview race was fixed by tying readiness/export enablement to the exact current plan. No failed checks are hidden by skipped package tests: packages without standalone suites are exercised by integration/consumer suites; web acceptance runs separately.

## Screenshots

- [Landing](screenshots/m1/landing.png)
- [Four-source Porcelain](screenshots/m1/studio-porcelain.png)
- [Four-source Obsidian](screenshots/m1/studio-obsidian.png)
- [Colors](screenshots/m1/colors.png)
- [A1 five-material over-capacity](screenshots/m1/print-over-capacity.png)
- [zh-CN](screenshots/m1/zh-cn.png)
- [Mobile](screenshots/m1/mobile.png)

## Honest gaps and limits

- **CJK in-progress**: unsupported characters stop export with an explicit message. Latin uses OFL Lato Bold instead of the proposed Inter; shaping, full CJK subsets, print-size stroke/gap coupons and physical legibility are not qualified.
- **Real-logo requirement NOT satisfied**: four initial-specimen entries reviewed/restricted and fourteen unchecked; original neutral glyphs/replaceable letter assets only. The real-logo pipeline is a fail-closed schema/gate skeleton, not a working SVG compiler.
- **Bambu Studio / A1 filament mapping not yet verified**: no Bambu/Orca metadata, no sliced time/purge estimates, no physical proof. Core structural tests are not a complete XSD/interoperability certification. The owner fixture unlock procedure is in ROADMAP.md.
- **Manufacturing limits**: geometric topology/connectivity is tested; layered-prism spatial checks now run independently; arbitrary surfaces, horizontal-cap-only contacts, minimum printable strokes/gaps and physical tolerances remain to qualify. Distinct materials are identified by color in M1; two physical spools of the same color cannot yet be modeled separately. Footer bed margins exclude a prime tower and slicer exclusion zones.
- **Performance**: build emits a large renderer-chunk warning and a harmless Emscripten Node-module externalization warning. Entry JS is about 100 kB gzip; lazy R3F renderer about 242 kB gzip, plus geometry/parse workers, WASM and 657 kB font. Combined landing-JS target is exceeded. On-demand rendering avoids continuous software-GPU redraws. Mesh regeneration is asynchronous and exports wait for the matching plan; the 300 ms interaction target is not claimed.
- **Acquisition**: no ledger/signatures, real-session Codex qualification, GitLab live qualification, other native parsers, CSV/ZIP/aggregator imports or provider regrouping UI. Browser bundle/file imports replace the current workspace; overlapping histories are not silently summed. Limits exist, but streaming text and expansion-ratio warnings are future work.
- **Product scope**: Compact Stack and other layouts, social cards/reveal/look links, print-shop pack, hosted relay, accounts, real mobile/WeChat qualification, SBOM, and physical print campaign remain in the roadmap, ordered by DESIGN §12.

The repository contains only synthetic fixtures and redacted specification copies. The unrelated global auto-agent-report instructions were not used. No real Codex sessions, GitHub credentials, owner activity totals, or official brand SVGs were read/copied into this implementation.
