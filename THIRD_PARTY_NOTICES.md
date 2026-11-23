# Third-party notices

The application source is MIT; dependencies retain their own licenses. Exact resolved versions are in pnpm-lock.yaml.

| Component | License | Use / source |
|---|---|---|
| Lato Bold, Łukasz Dziedzic / tyPoland | SIL OFL 1.1 | UI font; unmodified font from https://github.com/google/fonts/tree/main/ofl/lato; full copyright and OFL in packages/geometry/assets/OFL.txt |
| opentype.js | MIT | Font outlines; https://github.com/opentypejs/opentype.js |
| manifold-3d | Apache-2.0 | Boolean geometry / WASM; https://github.com/elalish/manifold |
| fzstd | MIT | Browser/Node fallback Zstandard; https://github.com/101arrowz/fzstd |
| fflate | MIT | 3MF ZIP package; https://github.com/101arrowz/fflate |
| fast-xml-parser | MIT | Core package structural validation |
| React / React DOM | MIT | UI |
| Three.js, React Three Fiber, Drei, Zustand | MIT | Rendering / state |
| Zod | MIT | Contracts |
| Vite, Vitest, TypeScript, ESLint, fast-check, Playwright, esbuild | Respective MIT / Apache-2.0 licenses | Development and test tools; see installed package LICENSE files |

Original neutral glyph geometry and segmented monogram designs are dedicated under [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode). Letter outlines retain the font's OFL license. The GitHub and Gitee official SVGs are exceptions documented below, bundled with notice and owner-accepted risk. No tokscale code, AGPL web code or personal fixtures are bundled. Official and local SVGs use the same bounded compiler.

3MF implementation reference: https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md (Core 1.4). Tests check OPC parts, namespaces, units, IDs/references, meshes, material colors and budgets; these are structural checks, not certification by the consortium or a slicer.

Bundled unmodified Lato-Bold.ttf SHA-256: `8a0aace75d33794eece4b28187bfc1df0bbd2888b5d8a56e01788c8d65d16be1`.

VibeSkyline SC Bold derives from Noto Sans CJK SC Bold 2.004, © 2014–2021 Adobe, SIL OFL 1.1. Renamed subset: all 3,755 GB2312 Level 1 Han plus Latin/digits/punctuation and the dense test character 曦. Source outlines retained. [Provenance, reproducible script and SHA256](packages/geometry/assets/VibeSkylineSC.md), [bundled license](packages/geometry/assets/VibeSkylineSC-OFL.txt). Retained for historical tests/evidence; no longer the runtime engraving font. No HarfBuzz is bundled: isolated NFC Han/Latin scalar mapping is the disclosed fallback; contextual scripts and unsupported grapheme sequences fail explicitly.

Local SVG compiler: @xmldom/xmldom 0.9.12 (MIT, https://github.com/xmldom/xmldom) and svg-pathdata 7.2.0 (MIT, https://github.com/nfroidure/svg-pathdata). Manifold resolves physical outline unions. The same parser processes the pinned official files and local BYO files; only sanitized numeric paths reach geometry.

VibeSkyline Grid Regular is the current CJK **and Latin** engraving font. It is a renamed, subsetted and generically bevel-repaired derivative of Fusion Pixel 12px proportional zh_hans **2026.11.10**, licensed **SIL OFL 1.1**. The full notices for Fusion Pixel / Ark Pixel (TakWolf), Cubic 11 (ACh-K, with JF Dot M+H 12 / M+ Bitmap notices), and Galmuri (Lee Minseo) are in [grid-licenses](packages/geometry/assets/grid-licenses/). Font software remains OFL, not MIT. The [official OFL FAQ §1.1](https://openfontlicense.org/ofl-faq/) expressly permits manufacturing and selling objects from outlines. Keep copyright/OFL notices when redistributing font software; the renamed derivative avoids reserved upstream names. There is no name-specific glyph path. [Research, provenance, versions, hashes and rejected candidates](docs/FONTS.md).

Pinned official [release](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10): ZIP SHA256 `aa6b4da3f80d95af45f41d74b37db0fa3a832d7f428adeb7234b4758d50bbae9`; original zh_hans TTF SHA256 `7e93fedda2c55bb37badb2262aaf43b08e3cb5976a0e3de2d90986ce59fe902e`; bundled derivative SHA256 `b6ea6aaa702887cbf9a7aec580b159328c61563f30877bf4ddcd12e29fb293d5`. [Reproducible build script](packages/geometry/assets/subset-grid.py).

## M4 interface components

shadcn/ui Base Nova Button and Tabs, retrieved from the official registry on 2026-11-22:
- https://ui.shadcn.com/r/styles/base-nova/button.json
- https://ui.shadcn.com/r/styles/base-nova/tabs.json

MIT license: [full notice](licenses/shadcn-ui-MIT.txt). Local import paths and styling adapted for VibeSkyline. Base UI (`@base-ui/react`) and Tailwind CSS are MIT licensed dependencies; no paid kit is used. Official guidance: https://ui.shadcn.com/docs/installation/vite and https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default.

## Bundled official source marks (owner-accepted risk)

GitHub®, Invertocat, and Octocat® are trademarks of GitHub, Inc. VibeSkyline is independent and not affiliated with, endorsed by, or sponsored by GitHub. The official Invertocat and Gitee white mark are bundled as source defaults under the owner's explicit acceptance of brand-policy risk, **not a claimed written redistribution or printable-derivative grant**. These assets are not licensed under this project's MIT license. Gitee's mark belongs to Shenzhen AOSI Network Technology Co., Ltd.; VibeSkyline has no affiliation, endorsement or sponsorship from that owner either.

[Exact official source URLs, retrieval date, file hashes, applicable restrictions, placeholder inventory and kill switches](licenses/TRADEMARKS.md). GitHub's official pages describe limited linking/integration uses and restrict product/merchandise uses without written permission. Both marks remain unqualified for physical printing.
