# M8 — VibeSkyline brand concepts

Concept A (Isometric plinth) is selected and wired into the site. B and C remain uninstalled alternatives. Start with [overview.png](overview.png) for the original comparison.

## Site installation

- The header imports the original light `concept-a/lockup.svg` through Vite, preserving its outlined Grid wordmark and font notices. It renders at 40px high (35px at the existing mobile breakpoint), inside a minimum 44px control named “VibeSkyline”. The bilingual alpha label keeps a 20px gap and hides at the existing 1100px breakpoint. Physical model themes never change the header art.
- `apps/web/public/favicon.svg` copies `concept-a/favicon-32.svg`, with its fixed light backing for either browser tab theme. The 16/32 PNGs render the corresponding front-elevation SVGs at native resolution, without resampling. `favicon.ico` contains those exact PNG payloads in separate 16/32 layers.
- The 180px Apple icon and 192/512 manifest icons render the full `concept-a/mark.svg` on solid `#f3f0e9`. The original square mark occupies 75% of the canvas, leaving 12.5% padding on every edge before its own clear space. These are regular icons, not declared maskable.
- `og.png` is 1200×630 with the original light lockup on `#f3f0e9`. Metadata uses `https://vibeskyline.com/og.png`, title “VibeSkyline”, and description “Your year, built.”
- The minimal `manifest.webmanifest` links the 192/512 icons; the production server maps it to `application/manifest+json`. Vite copies the committed public assets during the normal build. No rendering dependency is needed to build or run the site.

To regenerate the site assets, install CairoSVG 2.9.1 and Pillow 12.0.0 in a Python environment, then run `python3 scripts/render-brand.py` from any directory. This script uses only the selected concept A sources and leaves the original concept sheets untouched.

No protocol documents, relay defaults, Dockerfile, or Railway configuration are changed. The production protocol deny route stays in place, including when a protocol file exists in the static directory. Site wiring is prepared for the operator to merge; this branch does not deploy it.

Installation validation used Node 22.22.2 and corepack pnpm 10.22.0:

- `corepack pnpm typecheck` and `corepack pnpm lint`: passed.
- `corepack pnpm test --maxWorkers=1`: 361 tests passed across 29 files.
- `corepack pnpm build`: passed, with the existing manifold-3d browser externalization and large-chunk advisories.
- `corepack pnpm test:e2e`: 43 passed; two new header tests initially assumed the demo loader reset the active source. The existing behavior preserves it. Only the test expectations were corrected; `corepack pnpm test:e2e --last-failed` then passed both tests (45 distinct browser tests verified, no remaining failures). The complete three-test branding file also passed independently.
- Header screenshots reviewed in English/Chinese at 1440/800/390/360px and with obsidian plus a dark browser color preference. The light SVG stays unchanged, the label has room, and the header controls do not overlap.
- 16/32 PNG pixels match the supplied front-elevation renders exactly. The ICO decodes as separate native 16/32 layers. Larger icons have opaque light corners and the intended padding; Apple and OG artwork were visually reviewed. Production tests verify actual asset bodies/MIME types, metadata, dimensions, ICO layers, and protocol 404s.

| Concept | Idea | Sheet | 16px favicon candidate |
| --- | --- | --- | --- |
| A — Isometric plinth | Four mint towers on a sloped plinth, paired with the object's Grid lettering. | [concept-a.png](concept-a.png) | [concept-a/favicon-16.svg](concept-a/favicon-16.svg) |
| B — Measured bars | The familiar four-bar header rhythm, precisely spaced beside the Lato wordmark. | [concept-b.png](concept-b.png) | [concept-b/favicon-16.svg](concept-b/favicon-16.svg) |
| C — Pixel monument | A stepped S forms two terraces inside a green tile, with a mint keystone and Grid wordmark. | [concept-c.png](concept-c.png) | [concept-c/favicon-16.svg](concept-c/favicon-16.svg) |

## Source files

Each `concept-a/`, `concept-b/`, and `concept-c/` folder contains `mark.svg` (64×64), `lockup.svg`, `mark-dark.svg`, `lockup-dark.svg`, and `favicon-16.svg` / `favicon-32.svg` with exact intrinsic dimensions and viewBoxes. Explicit `favicon-dark-16.svg` / `favicon-dark-32.svg` files support dark-field proofs. Native `favicon-16.png`, `favicon-32.png`, and `mark-180.png` are intermediate renders.

The four top-level SVGs are the sources for the PNG sheets. Each concept sheet shows light/dark lockups, 16px at 8×, 32px at 5×, native light/dark samples, and a 180px mark. All SVGs are self-contained: no live text, embedded bitmap, font dependency, script, or external resource.

## Optical decisions

- **A:** The 16/32px sibling is a front elevation. It preserves the tall middle tower, shorter flanking towers, and flared apron, omitting the fourth foreground tower and isometric facets. At 16px, columns are 2–3px wide with 1px gaps. Site-green columns on a fixed light backing give contrast on either tab theme. Use the full isometric mark at larger sizes.
- **B:** Four 2px stems and 2px gutters at 16px. The favicon SVGs automatically switch green to white with `prefers-color-scheme: dark`; the explicit dark files require no media query. Lato is outlined at 48px / −2px tracking, equivalent to the current 24px / −1px header at half scale.
- **C:** A 12×12 module construction field sits inside the 64px tile (4px modules, 8px outer margin). Major strokes remain 2px wide at 16px. The mint keystone is an accent; recognition does not depend on it. The 180px render is an app-icon concept, not an installed apple-touch asset.

## Palette and fonts

Light fields use `#f7f8f6` / `#f3f0e9`; wordmarks use `#202d29` or `#F0F3F6`. Site greens are `#234c40` / `#38755e`. A uses `#0D1117` and `#39D385`, with flat facet tints `#239862` / `#89EAB8`; its apron is lightened for dark fields. C's dark tile uses `#202d29`. Annotations/borders use `#64736a` / `#d6dfd8`. No gradients or shadows.

A/C use paths converted from [VibeSkyline Grid](../../../packages/geometry/assets/VibeSkylineGrid-Regular.ttf), the renamed Fusion Pixel 12px SC subset. B and annotations use [Lato Bold](../../../packages/geometry/assets/Lato-Bold.ttf). Full corresponding copyright and SIL OFL 1.1 notices are retained in SVG metadata wherever outlines occur. Existing [Grid notices](../../../packages/geometry/assets/grid-licenses/) and [Lato OFL](../../../packages/geometry/assets/OFL.txt) remain unchanged. No font binary or subset is added.

## Rendering and validation

Hand-authored geometry; FontTools outline conversion; CairoSVG 2.9.1 rasterization. Enlarged proofs encode native raster pixels as flat SVG rectangles, preserving nearest-neighbor enlargement without bitmap embeds. PNG sheets are rendered directly from their SVGs. Re-render with CairoSVG installed:

```sh
python3 - <<'PY'
from pathlib import Path
import cairosvg
for name in ('concept-a', 'concept-b', 'concept-c', 'overview'):
    p = Path('docs/brand/m8') / name
    cairosvg.svg2png(url=str(p.with_suffix('.svg')),
                    write_to=str(p.with_suffix('.png')))
PY
```

If a mark changes, regenerate its native rasters and enlarged proof cells too. All SVGs parse; PNG sheets match SVG rasterization; enlarged cells match nearest-neighbor native pixels within one channel value of compositing rounding. Visually reviewed all sheets and native 16/32/180px SVGs in Chromium on light/dark fields, including B's automatic tint. No overflow or missing artwork.

Original concept-art checks: typecheck and lint passed; 352 unit tests passed with one worker (the initial default-worker run was terminated); build passed with the existing chunk-size advisory. All 42 existing browser acceptance tests passed (6.7 minutes).

The later site installation replaces the temporary header bars and adds favicon and social metadata.
