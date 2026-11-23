> Historical private-name measurement labels are redacted. Numeric results are unchanged; current public defaults and evidence are in [M2_DEFAULTS_REPORT.md](M2_DEFAULTS_REPORT.md). Earlier binary packets are retained only in Git history.

# Generic CJK / Latin lettering report

Branch **feat/m2-generic-lettering**, based on **0ec002f**. Only synthetic activity was used. No personal logs, printer/slicer connections, merge, PR, deployment, publication, visibility or global configuration changes.

**Real logos ON by default: NOT satisfied.** Original replaceable assets and the local BYO SVG flow remain. The existing official-brand redistribution/derivative restrictions have not changed.

## What changed

The hand-drawn, name-specific `display-name.ts` implementation is removed. Every name now goes through the same static OpenType font, NFC/grapheme handling, measured sizing, layout and boolean geometry pipeline. A regression supplies a Latin-only font and proves that [private calibration name] fails like any other unsupported name; another compares its output directly with the ordinary font renderer. The default does not have a hidden fallback.

The selected **VibeSkyline Grid Regular** is a renamed, subsetted derivative of **Fusion Pixel 12px proportional zh_hans 2026.11.10**, **SIL OFL 1.1**. All 3,755 GB2312 L1 characters are covered, alongside Latin, digits and punctuation. The font contains 4,146 mapped scalars. All upstream notices are retained. Commercially sold objects made from outlines are permitted by OFL; the font software remains OFL within this MIT project. [Font research, source URLs, versions, licenses and SHA256](FONTS.md) · [third-party notices](../THIRD_PARTY_NOTICES.md).

The pixel style is deliberate and visible. Raw diagonal pixel contacts failed independent manifold checks. A generic build-time bevel operation joins those contacts for every glyph while preserving empty pixel centers. **The repaired contours are what the unchanged checker measures.** This is not a per-name drawing or a centerline-font compiler claim. Local static fonts take priority per glyph, falling back to the bundled face for missing characters. Combined outlines use the common pipeline and must pass the same limits.

## Fit and measured sizes

Default four-source **[private calibration name] · Medium · Front**, and **[private Latin calibration ID] · Medium · Front**, remain **171.8 × 111.0 × 21.2 mm**. Both names have **0.9334 mm sampled minimum stroke** and **1.1000 mm sampled minimum gap**. Their Medium size is 13.2 mm em / 12.10 mm actual ink height. This is slightly above the ~8–12 mm research target in ink height; it fits the existing 16 mm apron without growing the plinth. Actual front/rear clearance around the name is 2.40/1.50 mm. The year is separated by at least 3 mm horizontally.

| Preset, [private calibration name] and [private Latin calibration ID] | Em mm | Stroke / gap mm | Front depth mm | Rear depth mm |
| --- | ---: | --- | ---: | ---: |
| Small | 11.5 | 0.8132 / 0.9583 | 111.0 | 121.6 |
| Medium | 13.2 | 0.9334 / 1.1000 | 111.0 | 123.1 |
| Large | 18.5 | 1.3081 / 1.5417 | 115.0 | 128.0 |

[Fit matrix](acceptance/lettering-matrix.md) / [JSON](acceptance/lettering-matrix.json): **21 strings × 3 sizes × 2 placements = 126 requests**, with **114 valid layouts/solids** and **12 explicit rejections**. Valid cases passed independent mono bounds, volume, closure/connectivity, material closure, and layered self/inter-material spatial checks. Corpus includes short and typical names, 4–6-character compound surnames, 戴薛/曦馨罐, mixed text, Latin usernames, digits/underscores/hyphens, long strings and missing 龘. These are synthetic/common examples, not user records.

The 15-character `skyline_dev2026` and `build-agent_123` fit Medium/front at 111.0 mm. Dense `曦馨罐` and mixed `[private calibration name]_dev9` fit Small/front but fail Medium/front; Medium/rear needs 124.7/124.2 mm depth. The long compound-surname example needs 136.7 mm at Medium/rear. A long wide Latin example also fails Small/Medium front. No layout is silently expanded or auto-selected. The UI lists only measured alternatives with dimensions and added depth; the user chooses one. Rear lettering remains a horizontal top apron, not a support-dependent back wall.

Font research includes **408 measured S/M/L trials across 17 variants of 14 candidates/assets**: LXGW, Klee, Zen Maru, M PLUS Rounded, Noto 300/400/550/700, Latin alternatives, a genuine Chinese Hershey centerline conversion and the final grid face. All candidate failures and actual L1 coverage are retained in [font-candidates.json](acceptance/font-candidates.json). Source Han was considered by license/provenance but not claimed as a separately measured binary. The chosen font's coverage does not establish every possible string's physical fit.

## Editor and retained behavior

- Bilingual font/license panel and measured recovery actions. Missing glyphs remain explicit, with a local static TTF/OTF option; files never upload.
- Deterministic contrasting text/tile color and explicit six-to-four material resolution are preserved. Example exports explicitly merge districts 1+2 and share contrasting identity with a district. Text/base slots remain different. Same-color physical spools stay distinct.
- No stale footer: held worker tests verify dimensions disappear throughout size/placement rebuilds, then match the downloaded mesh. Failed geometry remains unavailable even when another action clears the alert.
- Replaceable/BYO logo wording, privacy behavior, source-status vocabulary and accounting remain unchanged.
- A single 841,064-byte model-font asset is loaded by the geometry worker after entering Studio; the initial page does not fetch it. Lato remains the UI font. Current production build reports ~330 KB initial JS / ~102 KB gzip and ~896 KB deferred Scene JS / ~242 KB gzip. This round does not meet the tighter design performance budgets or claim to; the usual large deferred-chunk/manifold browser warnings remain. The prior runtime CJK subset was ~991 KB; the current model font covers both scripts in ~841 KB.

## Downloaded evidence and coupon

[Examples](examples/m2-cjk/README.md) describes the retired packet. The historical binaries and summary.json are not part of this public snapshot. All skyline examples in that work were **SYNTHETIC-DEMO**, not a personal activity calendar.

The **131 × 90 × 3.8 mm** calibration coupon has S/M/L [private calibration name] and [private Latin calibration ID] through the same generic font, dense 曦馨罐, labels, digits, three replaceable tiles and 0.80 mm bars / 0.60 mm gaps. Its STL, Core 3MF and sidecar are saved browser downloads. All eleven text regions have feature records. Base slot 1 and contrasting raised slot 2 are distinct. This coupon is for physical verification; it has not been printed.

Core 3MF still contains `materials.json`, `slots.json`, `features.json` and bilingual mapping instructions, with no printer/process profiles or Bambu project metadata. Purge/time remain unknown until sliced. [Owner-side Bambu evidence still needed](BAMBU_A1_FIXTURES_NEEDED.md).

## Acceptance

The machine-readable [m2-cjk.json](acceptance/m2-cjk.json) records actual command outcomes, counts, durations and corrected failed attempts. The first full root TypeScript check caught a missing explicit result-array type in the new matrix-generation script; the production geometry/browser tests were unaffected. The script was corrected and the root check rerun. All required commands and final counts follow.

Final Node 22.22.2 acceptance: **PASS**.

| Command | Result | Count / duration |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | 0.5s |
| `pnpm -r typecheck` | PASS | 10.12s |
| `pnpm -r lint` | PASS | 3.18s |
| `pnpm -r test` | PASS | 109 tests; 21.26s |
| `pnpm -r build` | PASS | 12.47s |
| `pnpm exec tsc --noEmit` | PASS | 3.01s |
| `pnpm exec eslint .` | PASS | 1.36s |
| `pnpm test:e2e` | PASS | 12 tests; 69.27s |
| `LIVE=1 pnpm test:live` | PASS | 4 checks; 4.66s |

**109 unit tests in 16 files; 12 browser tests; 4 live CLI/dev-proxy checks.** No fetched source responses were retained. The initial root TypeScript failure and passing correction are retained in `priorAttempts`. No geometry or accounting change was needed. Review also tightened the matrix generator to reject unexpected exceptions and assert its exact 12 known rejections; regeneration was byte-identical. Final review also found that the web build needed the four upstream notices; all are now emitted as local text assets and linked in both languages. The added browser regression compares their served bytes with the originals. Local-font priority is now explained per glyph, and Chinese errors distinguish insufficient apron/bed space from feature-driven size limits. All nine acceptance commands were then rerun successfully. An independent glyph inspection compared filled/empty source pixel centers across all 4,146 mapped scalars and found no occupancy changes from the generic bevel repair (201,858 filled centers). That check preserves cell centers, not a global continuous feature-size guarantee.


Screenshots under `docs/screenshots/m2-cjk/`: `default-cjk-porcelain.png`, `[private Latin calibration ID]-medium-front.png`, `long-name-recommendation.png`, `name-size-small.png`, `name-size-medium.png`, `name-size-large.png`, `font-license.png`, `zh-cn.png`, `mobile.png`. Additional captures show rear placement, explicit text over-capacity, contrast slot mapping, recomputing footer and logo wording. Default, recommendation, Chinese and mobile captures were visually inspected.

## Remaining risks

- **Geometry validated on the tested corpus, not physically printed.** Pixel-style legibility, repaired corners, extrusion, adhesion and real filament contrast need owner-side coupon checks.
- The unchanged eight-direction calipers do not prove a global minimum at every bevel/tip/unsampled wall. Layered spatial validation is limited to this extruded-prism model family, not arbitrary freeform manufacturing proof.
- Font coverage is complete for L1; physical fit is corpus-tested. Dense/long names can require another size or rear expansion, or fail entirely. Contextual shaping/unsupported grapheme clusters and missing glyphs remain explicit limitations.
- A1 slot intent/import remains unverified in Bambu Studio. Actual prime towers and slicer-specific exclusion zones are not qualified. Do not scale measured geometry without rechecking features.
- Official logos remain excluded. **Real logos ON by default: NOT satisfied.** No new brand grant or public-launch qualification is claimed.
