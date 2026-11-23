> Historical private-name measurement labels are redacted. Numeric results are unchanged; current public defaults and evidence are in [M2_DEFAULTS_REPORT.md](M2_DEFAULTS_REPORT.md). Earlier binary packets are retained only in Git history.

# M2 public-readiness report

Historical M2 measurements and artifacts below are retained. The [identity fix](M2_FIX_REPORT.md) supersedes the default name sizing, contrast and coupon.

**Private engineering slice, not a public release or print-ready product.** Work starts at bddcc6a on feat/m2-public-readiness. No merge, PR, deployment, npm publish, visibility change, global configuration change, personal-log access or printer/slicer connection occurred.

**Real logos ON by default remains NOT satisfied.** All 18 official terms were reviewed for public MIT-repository redistribution and modified/recolored printable derivatives: 15 restricted, 3 unclear (Gitee, Cursor, TRAE), no permissive grant found. No official vector was vendored. Original CC0 segmented monogram arrangements are replaceable assets. The local SVG compiler is implemented separately; acknowledgement supplies no legal grant. [Review](../licenses/TRADEMARKS.md) · [manifest](../packages/logos/manifest.json).

## Implemented and evidence scope

- **CJK geometry:** bundled renamed OFL Noto SC Bold subset, all 3,755 GB2312 L1 scalars plus Latin, digits, punctuation and 曦 (4,141 mapped scalars). NFC and grapheme-aware limits, explicit missing-character messages and browser-only local static TTF/OTF fallback. TrueType overlap uses nonzero winding. Contextual shaping is a disclosed fallback: isolated Han/NFC Latin scalars, not HarfBuzz; unsupported sequences fail instead of losing glyphs.
- **Measured enlargement/reflow:** starts at 8 mm for CJK, enlarges for sampled stroke ≥0.80 / gap ≥0.60 mm, then wraps or widens within A1 clearance. [private calibration name] selects 35.9 mm (stroke 3.0615, gap 0.6103); 量曦餐 selects 76.3 mm and a wider plinth; mixed [private Latin calibration ID] [private calibration name] reflows; fullwidth punctuation has golden tests. Actual footer dimensions follow the geometry's revised plan. Each year/name and materialized original/local tile has measurement metadata. Geometry is validated; nothing was physically printed.
- **Calibration:** actual browser STL/3MF/slot downloads of the 115×70×3.8 mm coupon. Its bars and gaps are independently measured from exported STL coordinates, not assumed from the input recipe. Original monograms use measured 1.20 mm walls/gaps. Exact final dimensions/hashes are in the artifact summary.
- **A1 intent:** roles base/text/logo/source can map to physical slots 1–4; same color in different slots stays distinct. A shared resolver reserves explicitly chosen slots before filling defaults. Conflicting colors in one slot fail clearly. Per-slot grams come from region meshes. Core 3MF contains materials.json, slots.json, features.json and bilingual A1-MAPPING.txt; no printer/process/project configuration is written. Purge/time stay unknown until sliced. No optional experimental project writer was implemented.
- **Local SVG compiler:** bounded XML allowlist rejects executable/external/raster/effect/mask/unoutlined-text inputs and entities. Handles affine transforms, curves, stroke expansion, fill rules, holes/islands, integer-micron outline normalization, measured enlargement and layout. Root transform plus declared viewport, unsupported style/paint/effects and unresolved numeric/complexity cases fail with recovery instructions. Synthetic malicious, ring, tapered-neck, stroke and nesting regressions cover review defects.
- **Acquisition:** Claude final usage revisions plus bounded same-session/message/time replay suppression, explicit --claude-dir reader; Gemini full/append-only JSON(L); Cursor and manual CSV with profile/column preview, UTF-8/BOM/GB18030 sniffing and selected timezone. Duplicate/ambiguous histories are rejected, not silently summed. Unknown usage components are rejected or remain absent, not zero. Gemini patch/rewind/checkpoint records require a full export. Every new parser has privacy canaries; CLI doctor reads registry status/evidence before any collection.
- **Web/privacy:** browser-local fonts, SVG and imports; worker parsing and recoverable errors; bilingual privacy page and docs. No telemetry or raw-upload endpoint. Only explicit public calendar fetches send handles/year to the restricted proxy; static assets stay local. Export metadata excludes raw activity/path/name text, while engraved identity remains visible in geometry.
- **Performance:** SVG landing defers renderer, manifold worker and font fetching until Studio. CJK font is fetched only for CJK/coupon use. Measured before/after gzip figures are in acceptance/m2-performance.json; browser acceptance asserts no Scene/WASM/CJK request on landing. Renderer bundle remains large once Studio opens.

## Acceptance

Final commands, durations and counts are recorded in [acceptance/m2.json](acceptance/m2.json). The original m2 example packet was retired from this public snapshot (it included an owner-identifying engraving). The packet contained synthetic activity data only; live source responses are never retained.

Node **v22.22.2**, pnpm 10; complete acceptance run on 2026-11-20:

| Command | Result | Evidence count / duration |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | 0.50 s |
| `pnpm -r typecheck` | PASS | 10.07 s |
| `pnpm -r lint` | PASS | 3.22 s |
| `pnpm -r test` | PASS | **96 tests / 16 files**, 21.83 s |
| `pnpm -r build` | PASS | 13.20 s |
| `pnpm exec tsc --noEmit` | PASS | 2.99 s |
| `pnpm exec eslint .` | PASS | 1.30 s |
| `pnpm test:e2e` | PASS | **8 tests**, 43.90 s including server lifecycle |
| `LIVE=1 pnpm test:live` | PASS | **4 checks**, 4.71 s: GitHub and Gitee, each through CLI and actual dev proxy |

The standalone live command owns and closes its Vite listener. It uses only the allowed public handle and a synthetic Codex fixture directory. No fetched responses or totals are retained. Cosmetic control styling and more complete summary metadata were then rechecked with a build, root TypeScript/ESLint and the full browser suite; the additional results are retained in the JSON.

Earlier acceptance attempts exposed an extensionless native module import, Float32-degenerate STL triangles along aligned neutral-glyph edges, and strict JSON sniffing incorrectly rejecting a malformed Codex line. These were fixed and the final suite passed. The geometry fix shares an exactly representable XY lattice before booleans (maximum displacement 0.00000763 mm); it does not relax the independent validator. Review fixes additionally prevent stale export after failed geometry, slot collisions, misleading SVG-neck measurements and incomplete output measurement arrays.

The browser suite covers CJK export and missing glyph, slot assignment and sidecar, safe/malicious SVG, coupon exports, Claude/Gemini/Cursor drops and mapping preview, statuses, proxy/import errors and stale-export rejection, privacy, zh-CN/mobile, existing theme/year/week-start/Two-Tone downloads and compressed Codex import. Review regressions also cover partial slot collisions, empty/mixed bundles, timestamp conflicts, metadata matching actual geometry and upstream status categories.

## Persisted browser examples

All files were saved by Playwright `download.saveAs`, then their saved bytes were parsed and independently checked. Everything is **SYNTHETIC-DEMO**, except the physical-verification coupon with the approved public name. These are engineering examples, not owner activity or print-ready output. All examples together are below 4 MB and are committed.

| Example | Actual W × D × H mm (rounded) | Materials | Mesh volume cm³ | PLA mass g |
| --- | --- | --- | --- | --- |
| `a1-four-source.3mf` / `cjk-name.stl` | 171.800 × 135.100 × 21.200 | 4 / mono union | 122.580320 | 151.999597 |
| `byo-logo.3mf` | 173.800 × 135.100 × 21.200 | 4 | 123.446747 | 153.073966 |
| `synthetic-demo.3mf` / `.stl` | 171.800 × 111.000 × 21.200 | 4 / mono union | 114.414840 | 141.874402 |
| `synthetic-demo-two-tone.3mf` | 171.800 × 111.000 × 21.200 | 2 | 114.414840 | 141.874402 |
| `calibration-coupon.3mf` / `.stl` | 115.000 × 70.000 × 3.800 | 2 / mono union | 27.100052 | 33.604065 |

The CJK four-slot budget is **108.244334 / 14.696728 / 14.712317 / 14.346218 g**. Its name has sampled minimum stroke/gap **3.061522 / 0.610300 mm** at 35.9 mm; year **0.816846 / 0.869000 mm** at 11.0 mm. All four original tiles report 1.20 / 1.20 mm. The BYO frame has separate local-compiler measurements, and all four actual tile records survive export. The coupon contains both text records and all three tile records. Two-Tone's saved meshes meet at **Z=3.20 mm**. Density is 1.24 g/cm³; waste and time remain unknown.

Recipes and source description for the current public examples are listed in the [example README](examples/m2/README.md). The retired historical binaries and summary.json are not published here.

## Performance result

Production JS gzip level 9: M1 landing entry + immediately loaded Scene **341,791 bytes** → M2 initial entry **99,527 bytes** (**70.88% reduction**, below DESIGN's 250 KiB target). The renderer, geometry worker and fonts are deferred. The CJK font is 991,136 raw bytes and fetched only for CJK/coupon use. Per-asset raw/gzip numbers are in [m2-performance.json](acceptance/m2-performance.json).

This does not establish the other latency/memory targets. The deferred Scene still exceeds Vite's 500 kB raw chunk warning. Vite also warns about manifold's browser externalization of `node:module`; the actual browser worker/export paths pass. No real mobile, peak-memory or pinned CAD timing benchmark is claimed.

## Screenshots

Under docs/screenshots/m2/: cjk-close-up.png, glyph-validation.png, ams-slot-mapping.png, logo-panel.png, sources-mixed-statuses.png, error-state.png, privacy.png, zh-cn.png, mobile.png, plus landing.png, studio-porcelain.png, studio-obsidian.png, colors.png, print-over-capacity.png, zh-cn-latin.png and mobile-latin.png. The zh-CN and mobile screenshots were visually inspected; core text, A1 guidance and recovery controls are translated. Technical platform names, units and status vocabulary remain unchanged.

## Remaining blockers and limitations

- **Physical proof and slicer mapping:** absent. The exact owner files/version/settings/redaction and tests unlocked are listed in [BAMBU_A1_FIXTURES_NEEDED.md](BAMBU_A1_FIXTURES_NEEDED.md). Use the [Chinese](QUICKSTART_zh.md) / [English](QUICKSTART_en.md) guide and print the coupon first on the owner's own equipment. We did not connect to it.
- **Official marks:** full-scope grants not established; real logos ON by default is not complete. All 18 replaced by original assets; no third-party shortcut.
- **Feature proof:** text calipers sample eight directions and opposing walls. Pointed terminals and unsampled irregular walls remain unverified. SVG's local neck and contour-distance checks strengthen this but do not prove every arbitrary shape's global minimum. The 0.03 mm tolerance covers curves/centerlines, not an independently certified bound on all expanded stroke offsets. No full manufacturing qualification is claimed.
- **Topology scope:** independent checks cover horizontal caps/vertical walls, orientation, closed edges, positive volume, connectivity, layer quantization, bounds and positive-area interior overlaps. Arbitrary sloped surfaces, cap-only zero-volume contacts, sub-tolerance features and process tolerances remain open.
- **Fonts:** glyph coverage is not a guarantee that every name fits at its measured size. Font-dependent large names may exceed the A1 bed. HarfBuzz contextual scripts/variation sequences are future work; failures are explicit.
- **Data:** GitHub/Gitee are verified by fixtures plus real public CLI/proxy checks. Codex/Claude/Gemini/GitLab are fixture-tested; Cursor/manual CSV are manual. Other native sources remain unsupported. Public personal Cursor exact schema is not officially pinned. Qwen/aggregator imports, ledger, signatures and provider regrouping are not implemented.
- **Public launch:** remains blocked by the [public release checklist](PUBLIC_RELEASE_CHECKLIST.md), including physical/slicer evidence, source version qualification, broader malformed-input/device/accessibility audits and performance/memory benchmarks. The app is private and local only.
