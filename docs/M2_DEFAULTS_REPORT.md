# Public first-run defaults

Branch **feat/m2-public-defaults**, from **bb3245d**. Only synthetic local inputs and the permitted public GitHub/Gitee smoke are used. No personal log collection, printer/slicer connection, deployment, publication, visibility change, PR or merge.

**Not sliced; not physically printed. Real logos ON by default: NOT satisfied.** Official marks remain excluded; original replaceable assets and local BYO SVG remain available.

## Defaults and physical materials

The public sample is **GitHub + Codex + Gemini**, with neutral **skyline-demo**, **Medium/front**, and the confirmed **VibeSkyline Grid** pixel font. Three sources retain Git + AI combination while allowing a separate base and three distinct district materials within AMS lite's four slots. Text and tiles share the most contrasting district; no district color is merged. This is a declared starting recipe, not a capacity workaround applied to user overrides.

The three-source annual-grid baseline is **171.8 × 87.2 × 21.2 mm**. The original formula remains `16 + n×19.6 + (n−1)×4.2 + 4`; four sources still use 111.0 mm depth. No default apron enlargement occurs. Existing corpus tests retain explicit four-source cases.

| Theme | Base | Text/tiles | sRGB luminance contrast |
| --- | --- | --- | ---: |
| Porcelain Atelier | #EFECE6 | #2F5D8C | 5.81:1 |
| Obsidian Desk | #181C22 | #4CC9F0 | 8.89:1 |
| Cinnabar & Xuan | #F2EAE0 | #2F4858 | 8.05:1 |
| Celadon & Ink | #1B2428 | #D8A46F | 7.11:1 |
| Monochrome Architectural | #D6D4CE | #41454A | 6.51:1 |
| Brand Palette | #F4F1EA | #343A40 | 10.20:1 |

Every theme is within four physical materials and above the 3:1 target. The default exported model has volume **83.74261 cm³**, estimated **103.84084 g** total, with slot grams **59.373 / 15.059 / 14.697 / 14.712**. Its name measures **0.9334 mm stroke / 1.1000 mm gap**; the year measures **0.8132 / 0.9583 mm**. Print shows the actual ratio. These ratios use the configured sRGB colors, not measured filament reflectance or a claim about physical print contrast. Material volume and PLA mass (1.24 g/cm³) come from exported meshes. Purge and duration remain unknown until sliced.

Adding a fourth independently colored source or a new text color can require five materials. Export stays gated until an explicit choice. Explicit district overrides are stored by source ID, so they stay with their tool after removals or reordering. Color edits preserve other rendered colors and compatible spool assignments; only changed roles release their slots. Choosing a sharing strategy or print tier explicitly resets the slot assignments. New/reordered source roles reuse a matching existing color slot or an available slot, without recoloring a palette override. Same-color spools with explicit distinct assignments remain distinct.

## Username ownership and privacy

The optional `SourceSeries.publicIdentity` field declares a public username/ID and its provenance. Calendar readers use only the explicitly requested handle, never identity fields in fetched content. CLI bundles carry it only through explicit `--github`, `--gitee` or `--gitlab`. Local parsers do not supply an identity. Older bundles still import.

Selection order: **GitHub → Gitee → GitLab → explicitly declared public source ID → skyline-demo**. Sample sources are skipped. The selector never derives identity from emails, account/org IDs, tokens, file paths, hostnames, scope or session IDs. Validation rejects obvious private identifier shapes with a redacted error. Values above the 24-character engraving limit are skipped, never truncated. An ordinary-looking alias's public status is a producer declaration, not independently provable from its syntax. Undelimited credential prefixes are matched against full key shapes; ordinary aliases such as `asian-artist` are accepted rather than rejected by a short prefix collision.

Shape displays “From GitHub: …” or the fallback prompt. A manual edit wins across imports, source changes, theme changes and demo reloads until **Use source username** is clicked. State lasts for the current page session; there is no new persistent browser storage. Geometry metadata excludes identity by default, but engraved text remains visible in the mesh.

Public screenshots and skyline examples now use neutral synthetic identifiers. The owner-name coupon is explicitly **private** in its download filenames, 3MF title, feature metadata, slot sidecar and packet labels. It retains both requested calibration identities at S/M/L, dense characters, digits, tiles, 0.80 mm bars and 0.60 mm gaps. Historical name-bearing M2 screenshots/models were retired from the current tree; their immutable historical commits remain available. Historical research labels were redacted without changing numeric history, and the current 126-case matrix was regenerated with neutral CJK cases and the Latin `sample-user` specimen. Legacy CI coupon summaries and provenance also identify their actual bytes as private calibration, not neutral public examples. Git history still contains prior private evidence and needs deliberate review before a public release.

## Acceptance and saved evidence

Final Node **22.22.2**, pnpm **10.22.0** acceptance: **all nine required commands PASS**. [Machine-readable counts and durations](acceptance/m2-defaults.json) record the final code run.

| Command | Result | Count / duration |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | 0.51s |
| `pnpm -r typecheck` | PASS | 11.10s |
| `pnpm -r lint` | PASS | 3.34s |
| `pnpm -r test` | PASS | 168 tests; 22.83s |
| `pnpm -r build` | PASS | 13.28s |
| `pnpm exec tsc --noEmit` | PASS | 3.26s |
| `pnpm exec eslint .` | PASS | 1.32s |
| `pnpm test:e2e` | PASS | 15 tests; 80.27s |
| `LIVE=1 pnpm test:live` | PASS | 4 checks; 4.10s |

**168 unit tests in 18 files; 15 browser tests; 4 live checks.** GitHub and Gitee passed independently through both the CLI and the actual dev proxy. The standalone live command owned and closed its server; fetched responses were not retained. On the first final-code live attempt, Gitee through the dev proxy returned HTTP 502 (the other three checks passed). One immediate standalone retry passed all four. The failed attempt and retry are both retained in `livePriorAttempts` / `commands`; this is evidence of a transient upstream/proxy failure, not a guarantee of endpoint availability.

Review found and fixed two slot transitions: changing themes in Mono/Two-Tone now allocates against effective tier colors, and changing sources after a sharing choice preserves compatible effective colors and distinct same-color spools. Thirteen regression failures were reproduced before the fix; all pass afterward. Initial browser-authoring assertions were also corrected for decorative accessible names and intentionally disconnected per-material islands. The GitHub screenshot now waits for new geometry rather than capturing its rebuild. The final review additionally fixed named-source override migration, preservation of unrelated spool assignments when a color edit exits sharing, legacy CI private-coupon provenance, and ordinary public-handle prefix collisions. A new UI-to-downloaded-3MF test proves that a Codex override stays on Codex after GitHub removal. All four findings passed scoped re-review. The final acceptance run above passed after these corrections; the earlier nine-command pass is retained separately in the machine record.

The only emitted warnings were the existing browser externalization / large deferred chunk notices and a Playwright FORCE_COLOR/NO_COLOR environment notice. No warning is treated as physical or slicer qualification.

Browser tests save actual downloads with `download.saveAs`, reopen the saved bytes, and use the independent STL/3MF topology and layered spatial validators. The fresh-load test exports immediately without a capacity choice, checks the baseline, contrast and text/base slots, and captures all six themes. A mocked GitHub request engraves the synthetic typed handle. After manual editing and adding Gitee, exported meshes are compared exactly with a separately generated expected custom-name model and differ from the source-derived-name model. Existing import, error, bilingual, footer rebuild and four font-notice byte comparisons remain covered.

- [Example packet](examples/m2-defaults/README.md), including actual model dimensions, material/slot mass, feature measurements and SHA256 in [summary.json](examples/m2-defaults/summary.json).
- Screenshots in `docs/screenshots/m2-defaults/`: `landing.png`, `default-studio.png`, `print-ams.png`, `theme-porcelain.png`, `theme-obsidian.png`, `theme-cinnabar.png`, `theme-celadon.png`, `theme-mono.png`, `theme-brand.png`, `over-capacity.png`, `name-from-github.png`, `privacy.png`, `font-license.png`, `logo-panel.png`, `zh-cn.png`, `mobile.png`. Default, Chinese, mobile, AMS, over-capacity and corrected source-name captures were visually inspected.
- Font: [FONTS.md](FONTS.md), **SIL OFL 1.1**, with the four original upstream notices retained and served by the app. The MIT project license does not replace font licenses.

## Remaining qualification risks

- No physical coupon, extrusion/adhesion/readability evidence or sliced output. A1 slot intent and Core 3MF import are not verified in Bambu Studio; no printer/process profiles or project settings are written. [Exact owner-side fixtures needed](BAMBU_A1_FIXTURES_NEEDED.md).
- Eight-direction stroke/gap sampling and layered spatial checks retain their documented limits; they do not prove every tip, arbitrary curve, arbitrary mesh or manufacturing tolerance. Long/dense names can need an explicit size/rear choice or fail.
- Official logo grants remain absent for the required redistribution/printable-derivative scope. **Real logos ON by default: NOT satisfied.**
- Public identity declarations cannot establish ownership of an ordinary-looking alias. Review imported bundles and visible engraving before sharing. Private calibration artifacts and historical Git content are not a public launch packet.
- Source qualification is unchanged: GitHub/Gitee public calendars have live evidence; GitLab/Codex/Claude/Gemini remain fixture-tested; CSV imports remain manual. No new verified local integration is claimed.
- The production build reports 339.44 kB initial JS / 105.44 kB gzip, and 895.81 kB deferred Scene JS / 241.80 kB gzip. The existing large-chunk and manifold browser warnings remain. This round does not establish tighter mobile memory, latency or a11y budgets. See [public-release checklist](PUBLIC_RELEASE_CHECKLIST.md).
