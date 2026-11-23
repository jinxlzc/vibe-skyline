> Historical private-name measurement labels are redacted. Numeric results are unchanged; current public defaults and evidence are in [M2_DEFAULTS_REPORT.md](M2_DEFAULTS_REPORT.md). Earlier binary packets are retained only in Git history.

# M2 identity fix report

Historical packet. The generic lettering round supersedes the name-only implementation described below; see [M2_CJK_REPORT.md](M2_CJK_REPORT.md). Existing binary artifacts retain their original meaning.

Branch feat/m2-fix-identity, based on e802937. Synthetic data only. No personal logs, printer/slicer connection, merge, PR, deployment, publication, visibility or global configuration changes.

**Real logos ON by default: NOT satisfied.** The previous 18-brand review found no grant covering public redistribution and modified printable derivatives. UI and documentation now say **Replaceable asset (official logo not included)** / **可替换图标（不含官方 logo）**, with **Bring your own SVG** / **自带 SVG**. Historical binary evidence remains unchanged; old prose terminology was updated.

## Name layout and physical strategy

The default is **[private calibration name] · Medium · Front apron**. Its four-source model is **171.8 × 111.0 × 21.2 mm**. The 16.0 mm front apron and M1 baseline depth are preserved. The default name no longer uses the 35.9 mm enlarged font outline from M2.

For exactly [private calibration name], without a supplied local font, the model uses original simplified monoline print lettering. Its 木/子, water radical/crossed stem, and cliff/hook/sweep structures were visually reviewed. This is a deliberately different typography, disclosed in the editor; it is not a claim that arbitrary CJK font outlines now fit a small apron. The unchanged eight-direction caliper checker measures the actual paths. Ink is embossed from Z=3.20 to 3.80 mm. Counters are not silently filled and subthreshold shapes are not scaled down to fit.

| [private calibration name] preset | Ink height mm | Sampled minimum stroke mm | Sampled minimum gap mm | Front depth mm | Rear depth mm |
| --- | ---: | ---: | ---: | ---: | ---: |
| Small | 9.177 | 0.945 | 0.6975 | 111.0 | 120.2 |
| Medium | 10.196 | 1.050 | 0.7750 | 111.0 | 121.2 |
| Large | 14.784 | 1.5225 | 1.12375 | 113.8 | 125.8 |

**Rear variant:** horizontal raised lettering on the plinth top behind the last district, in the same XY reading orientation as the front. The year remains at the front. There is no vertical back wall or support-dependent cantilever. The existing 4 mm rear margin is extended with 2 mm clearance around the name; the UI explicitly shows the added depth. Orbit the model to inspect the rear inscription, which towers can obscure from the default camera.

Other names and local font overrides use OpenType outlines with measured enlargement and reflow. Font preset sizes are em sizes, whereas the original display-lettering size is ink height. Front Small/Medium reject layouts that cannot fit the existing apron. Large and rear can expand within the A1 clearance envelope. Dense names can still exceed font or bed limits; no preset promises universal coverage. In particular Lato [private Latin calibration ID] Medium exceeds the fixed front ink envelope and needs rear placement or an expanded Large layout. Missing glyphs and unsupported shaping remain explicit errors.

## Contrast and materials

Theme identity color is the highest luminance-contrast candidate among theme ink and district colors, with deterministic ordering. Every shipped theme's default passes 3:1. Text and identity tiles use that contrasting material, not the base. This means the initial four-source specimen can have **six physical materials**, visibly over the four-slot capacity.

No capacity fallback recolors automatically. The user chooses base sharing, text/base sharing with a low-contrast warning, text/district sharing, merging, Mono/Two-Tone or unrestricted. The saved four-slot specimen explicitly selects **Merge districts 1+2; text shares a district**: the base stays separate, two district colors merge in the preview, and text/tiles share the most contrasting remaining district. The same option's resulting count is computed for other source counts rather than promising four colors. Same-color spools remain distinct when assigned to different slots.

The default four-slot example has base slot 1 and text/tile slot 2. Slot role names, mesh volumes and grams are present in slots.json. Time and purge remain unknown until sliced. Core 3MF still writes no printer/process profiles or Bambu project metadata.

## Footer and recovery

A recipe change immediately hides old W×D×H and A1 margins and displays Recomputing… / 重新计算中…. Only the matching completed geometry supplies dimensions. Failed geometry shows Unavailable / 无法计算, tracked independently of the shared alert, so a pending calendar request cannot make failed geometry appear to be rebuilding. Exports remain blocked until valid matching geometry exists.

Browser tests hold worker requests during size and placement changes, observe all footer text mutations, assert that no previous dimensions appear, release the worker and compare the final displayed dimensions with the saved STL. A second regression clears the alert with a pending calendar request and checks the failed state and export lock remain intact. Chinese fit errors provide size/placement recovery actions.

## Calibration coupon

Actual browser-download STL, Core 3MF and slot sidecar contain **S/M/L of both [private calibration name] and [private Latin calibration ID]**, S/M/L labels, digits, three replaceable tiles, 0.80 mm bars and 0.60 mm gaps. The final coupon is **142 × 77 × 3.8 mm**, with base slot 1 and contrasting raised material slot 2. All ten text regions have measurement records; a null gap means no opposing gap was measurable, not zero.

The browser explicitly passes the same Lato Bold asset used for standalone Latin editor names. A regression checks all three Latin rows' measurements, dimensions and exported outline areas against the standalone font path, as well as labels and digits. The earlier CJK-font Latin coupon mismatch was corrected before retaining the final packet.

| Lato [private Latin calibration ID] preset | Ink height mm | Sampled minimum stroke mm | Sampled minimum gap mm |
| --- | ---: | ---: | ---: |
| Small | 11.8144 | 0.810167 | 0.8000 |
| Medium | 13.4758 | 0.924097 | 0.8614 |
| Large | 18.9215 | 1.297534 | 1.2095 |

## Evidence and acceptance

[Machine-readable results](acceptance/m2-fix.json) retain commands, durations, counts and the earlier failed recovery-test attempt. That attempt selected dense 量曦餐 Large beyond the supported font-size limit; it correctly failed geometry. The success-path test now uses the geometry-qualified mixed name [private Latin calibration ID] [private calibration name]. An initial integration pass also exposed the previous long Latin sample not fitting Front/Medium; the default is now the requested compact CJK name and the legacy long-name test explicitly selects Large.



Node v22.22.2 final acceptance, 2026-11-20:

| Command | Result | Count / duration |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | 0.50 s |
| `pnpm -r typecheck` | PASS | 10.03 s |
| `pnpm -r lint` | PASS | 3.16 s |
| `pnpm -r test` | PASS | 101 tests; 22.71 s |
| `pnpm -r build` | PASS | 12.34 s |
| `pnpm exec tsc --noEmit` | PASS | 3.15 s |
| `pnpm exec eslint .` | PASS | 1.34 s |
| `pnpm test:e2e` | PASS | 11 tests; 69.99 s |
| `LIVE=1 pnpm test:live` | PASS | 4 CLI/proxy checks; 5.78 s |

Unit/property coverage totals **101 tests in 16 files**; browser coverage totals **11 tests**. All four GitHub/Gitee CLI and actual dev-proxy checks passed without retaining responses. A final copy-only license-gate regression run passed 41 logo tests. The usual deferred Scene chunk-size and manifold node:module browser warnings remain; browser exports pass.

All examples use SYNTHETIC-DEMO activity, except the coupon carrying the approved public name and calibration text only. [Example index](examples/m2-fix/README.md) describes the retired packet. The historical binaries and summary.json are not part of this public snapshot. The four-slot example documents its explicit merging choice; it does not pretend to retain six independent materials in four slots.


| Saved 3MF | W × D × H mm | Volume cm³ | PLA mass g |
| --- | --- | ---: | ---: |
| `default-four-source.3mf` | 171.8 × 111.0 × 21.2 | 108.395238 | 134.410095 |
| `rear-placement.3mf` | 171.8 × 121.2 × 21.2 | 114.002788 | 141.363458 |
| `calibration-coupon.3mf` | 142.0 × 77.0 × 3.8 | 35.946171 | 44.573252 |

Default slot grams: **75.597545 / 29.753987 / 14.712331 / 14.346232**. Coupon slot grams: **43.386113 / 1.187139**. All use PLA density 1.24 g/cm³. Eight downloaded files have matching SHA256 entries; the packet is below 4 MB.

Screenshots under docs/screenshots/m2-fix/: default-cjk-porcelain.png; name-size-small.png, name-size-medium.png, name-size-large.png (comparison); rear-placement.png; contrast-ams-mapping.png; text-over-capacity.png; recomputing-footer.png; logo-panel.png; zh-cn.png; mobile.png. Default, rear, contrast, Chinese and mobile captures were visually inspected. Old M2 examples/screenshots are preserved; legacy browser tests now save transient output under ignored test-results/.

## Remaining risks

- Geometry is validated, **not physically printed**. Coupon legibility, extrusion, adhesion and actual filament contrast still need owner-side physical checks.
- Eight-direction calipers and the existing layered geometry validator do not prove all global minimum features, arbitrary sloped surfaces or manufacturing tolerances.
- Compact original lettering covers only the named default specimen. Other names/fonts can require expansion or fail; no generic small CJK font solution is claimed. Contextual shaping remains limited.
- Rear lettering can be obscured by towers from the front camera and can require more plate depth. Fits A1 excludes slicer-specific prime tower/exclusion zones.
- Slot intent and Core 3MF import remain unverified in Bambu Studio. The [exact fixture checklist](BAMBU_A1_FIXTURES_NEEDED.md) still applies. No printer/process profile compatibility or print-ready claim is made.
- Official logos remain excluded; real logos ON by default is not satisfied. Public source qualification and broader performance/accessibility work remain on the roadmap.
