> Historical private-name measurement labels are redacted. Numeric results are unchanged; current public defaults and evidence are in [M2_DEFAULTS_REPORT.md](M2_DEFAULTS_REPORT.md). Earlier binary packets are retained only in Git history.

# Generic model lettering — font selection

Reviewed 2026-11-20. This concerns the **exported outlines**, not just browser typography. Public repository redistribution and commercially sold printed objects are in scope. Source code is MIT; bundled font software keeps its own OFL license.

## Selected face

**VibeSkyline Grid Regular**, a renamed derivative of **Fusion Pixel 12px proportional zh_hans, release 2026.11.10**, is used for *every* default CJK and Latin name, year and coupon region. No name lookup or hand-drawn [private calibration name] branch remains. A user-supplied static TTF/OTF takes priority for each glyph it covers. The bundled font supplies glyphs outside the local font's coverage. Both fonts follow the same outline and measurement path.

- [Official project](https://github.com/TakWolf/fusion-pixel-font), [pinned release](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10), [font license](https://github.com/TakWolf/fusion-pixel-font/blob/2026.11.10/LICENSE-OFL).
- Source archive: `fusion-pixel-font-12px-proportional-ttf-v2026.11.10.zip`.
- Source archive SHA256: `aa6b4da3f80d95af45f41d74b37db0fa3a832d7f428adeb7234b4758d50bbae9`.
- Source `fusion-pixel-12px-proportional-zh_hans.ttf` SHA256: `7e93fedda2c55bb37badb2262aaf43b08e3cb5976a0e3de2d90986ce59fe902e`.
- Bundled `packages/geometry/assets/VibeSkylineGrid-Regular.ttf` SHA256: `b6ea6aaa702887cbf9a7aec580b159328c61563f30877bf4ddcd12e29fb293d5`.
- [Reproduction script](../packages/geometry/assets/subset-grid.py), Python 3 + fontTools 4.63.0, verifies source hashes before subsetting or modifying outlines.
- 4,146 mapped scalars: **3,755/3,755 GB2312 L1**, ASCII letters/digits/punctuation, supported Latin-1 and punctuation ranges, plus dense characters 曦馨罐. 龘 deliberately remains outside the bundled subset and exercises the missing-glyph/local-font flow.

This is visibly **pixel typography**. It is not a rounded typeface, a handwritten reconstruction, or a claim that a dense conventional Han font can fit an 8 mm envelope. The choice trades smooth outlines for predictable broad strokes and open cells. S/M/L are measured presets, not promises that every name fits a fixed em size. The editor reports the resulting size, stroke/gap and explicit plate expansion.

## License conclusion

The release includes SIL OFL 1.1 notices for Fusion Pixel, Ark Pixel, Cubic 11 (including its JF Dot M+H 12 / M+ Bitmap contributions) and Galmuri. **Redistribution with the project and commercial printed output are allowed**, subject to preserving font notices and OFL terms. All four original notices are kept verbatim in [grid-licenses](../packages/geometry/assets/grid-licenses/). The web build serves those same files through Studio's **Font & license** panel. The Cubic 11 file includes the upstream permissive bitmap-font notice.

Official upstream notices: [Ark Pixel](https://github.com/TakWolf/ark-pixel-font/blob/develop/LICENSE-OFL), [Cubic 11](https://github.com/ACh-K/Cubic-11/blob/main/OFL.txt), [Galmuri](https://github.com/quiple/galmuri/blob/main/ofl.md). The derivative uses a new family name. No author endorsement is claimed. The [OFL FAQ §1.1](https://openfontlicense.org/ofl-faq/) explicitly allows manufactured objects based on outlines, including 3D printed shapes; the resulting object is not required to carry the font software license. This does not grant trademark rights to unrelated logos.

## Generic diagonal-contact repair

Raw Fusion Pixel has diagonal ink cells that touch at a single point. Those outlines failed independent mesh checks (open/non-manifold edges and sometimes disconnected components), even when the feature calipers looked acceptable. They are **not** shipped as printable geometry.

At font-build time, the same algorithm visits every glyph and joins every diagonal saddle with two bevel triangles with 0.60-pixel legs. Empty pixel centers remain outside the ink. The derivative retains counters; no whole counter is filled and no name is matched. Repaired paths, rather than pre-repair measurements, go through the unchanged eight-direction checker. The runtime only parses this static font, normalizes NFC, maps supported graphemes, enlarges/reflows, measures, and extrudes. Local fonts do not receive the pixel repair.

The four-source front band stays 16 mm. Small/Medium allow at least 1.5 mm clearance at each edge; the default Medium has 2.40 mm front and 1.50 mm rear clearance around its 12.10 mm ink height. Large or horizontal rear placement may expand only after the user selects it; the app displays the expansion. Failed front choices list only alternatives that pass the same glyph/layout/bed checks. They do not silently choose one.

## Candidate evaluation

[Machine-readable candidate evidence](acceptance/font-candidates.json) records official download URLs, versions, hashes, actual L1 coverage and measured preset trials. [Name fit matrix](acceptance/lettering-matrix.md) / [JSON](acceptance/lettering-matrix.json) record the final chosen font with measured stroke/gap, ink bounds and front/rear dimensions.

| Candidate family | Official font/license source | Decision |
| --- | --- | --- |
| LXGW WenKai | [Author](https://github.com/lxgw/LxgwWenKai), [OFL](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt) | OFL permits the scope; RFN exceptions need care for font derivatives. Full L1 coverage, but tapered strokes and small details trigger major enlargement in this checker. Rejected for compact FDM default. |
| Klee One | [Fontworks](https://github.com/fontworks-fonts/Klee), [OFL](https://github.com/fontworks-fonts/Klee/blob/master/OFL.txt) | OFL permits scope; Japanese coverage misses simplified L1 characters. Fine strokes also fail the compact envelope. |
| Zen Maru Gothic | [Project](https://github.com/googlefonts/zen-marugothic), [OFL](https://github.com/googlefonts/zen-marugothic/blob/main/OFL.txt) | OFL permits scope; incomplete simplified L1 and some tiny rounded gaps force excessive enlargement. |
| M PLUS Rounded 1c | [Official distribution](https://github.com/google/fonts/tree/main/ofl/mplusrounded1c) | OFL; tested TTF name-table IDs 13/14 contain the license statement/URL (the distribution has no separate OFL.txt). Incomplete simplified L1. Rounded does not mean every counter clears 0.60 mm. |
| Noto Sans SC, multiple weights | [Official distribution](https://github.com/google/fonts/tree/main/ofl/notosanssc), [Noto CJK](https://github.com/notofonts/noto-cjk) | OFL; full L1. Light strokes need enlargement; heavier strokes narrow counters. No tested weight satisfies the common-name compact default as well as the chosen grid face. |
| Source Han Sans | [Adobe source](https://github.com/adobe-fonts/source-han-sans), [OFL](https://github.com/adobe-fonts/source-han-sans/blob/release/LICENSE.txt) | OFL; related upstream CJK design. Considered, not separately measured as an additional face; Noto weight evidence is not presented as a Source Han binary measurement. |
| Lato Bold, Barlow Condensed, Oswald, Chakra Petch, Jersey 10 | [Lato](https://github.com/google/fonts/tree/main/ofl/lato), [Barlow](https://github.com/google/fonts/tree/main/ofl/barlowcondensed), [Oswald](https://github.com/google/fonts/tree/main/ofl/oswald), [Chakra](https://github.com/google/fonts/tree/main/ofl/chakrapetch), [Jersey](https://github.com/google/fonts/tree/main/ofl/jersey10) | OFL Latin candidates. Jersey clears the tested Latin envelope but would require a second engraving font. The selected generic grid face handles both scripts; Lato remains only the app's UI font and historical evidence asset. |
| Fusion Pixel 12px | [Author/release](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10) | OFL, full L1. Selected after generic diagonal repair and independent solid validation. |

Measurements are **checker results**, not typographic judgments or proof that the rejected fonts cannot be printed by some other process. Tapered tips and scan sampling can be conservative or incomplete. Candidate failures are retained instead of relabelled as passes.

## Single-line / engraving alternatives researched

- [Chinese Hershey conversion project](https://github.com/LingDong-/chinese-hershey-font): MIT converter; its Heiti data derives from Source Han Sans, with a separate OFL provenance obligation. Mingti and Kaiti have different upstreams. We did not treat the converter's MIT license as a blanket license for all generated font data. Heiti was measured with a generic 0.08-em round stroke (16-sided round caps/joins): Medium [private calibration name] required 39.312 mm ink height, with 2.915 mm stroke and 0.697 mm gap. It covers 3,755/3,755 L1, but fails the compact envelope. This research conversion is not a qualified or bundled runtime asset; adopting it would still require pinned upstream-font notices and full solid validation.
- [Kanji Stroke Order Font 4.005](https://sites.google.com/site/nihilistorguk/): author's release 2025-07-27, educational numbered stroke diagrams for 6,500+ Japanese kanji and some Latin. This is not a GB2312 L1 centerline engraving face. The author's license download could not be retrieved through the review browser; no unverified copy was vendored. Coverage and physical metrics are **not established**.
- [Hershey Text developer documentation](https://cdn.evilmadscientist.com/dl/ad/public/HersheyText_v30r5.pdf): establishes single-stroke plotting/engraving use, but not a complete licensed simplified-Chinese L1 set for this application. No generic CNC-font download was presumed to cover CJK or commercial outline redistribution.

No font with unclear or non-commercial terms is shipped. Since no single-line set was selected, there is no runtime centerline-to-stroke compiler claim.

## Limits

Font coverage is tested across L1, while physical fit/solids are tested on the committed corpus, not on all possible strings. A long name may wrap and require rear or Large; dense 馨 can need Small front or an enlarged rear apron. All measured valid regions meet 0.80 mm stroke and 0.60 mm gap; null means the checker found no opposing gap, not zero. Eight-direction calipers do not prove global minimum width at every bevel, tip or unsampled wall. Contextual shaping and arbitrary grapheme clusters remain unsupported with explicit errors. Physical calibration and slicer mapping are still required; no print-ready label is used.

## Candidate version / hash register

These identify the exact research inputs. For numeric variable-font axes, the variant list in JSON identifies each instantiated weight. The source URL in each candidate record points to its pinned official input; hashes of derived research subsets are not substituted for source hashes.

| Input | Version | L1 coverage | SHA256 |
| --- | --- | ---: | --- |
| LXGW WenKai Medium | Version 1.530; October 18, 2026 | 3755/3755 | `f4b8a34d1f838fe411540cb7c97b1c384ac9738a876c4104500bc42508b2312a` |
| Zen Maru Gothic | Version 1.001 | 2384/3755 | `fe24426b9c8b5523a0146a8235c8674eccf0493af354a53ec895c3596d9eb745` |
| Klee One SemiBold | Version 1.100 | 2501/3755 | `b031ec426c23ca1143ef1f7d58bee7a79efe119ed654152f121c922202b303fd` |
| Rounded Mplus 1c | Version 1.060 | 2167/3755 | `c698330e24aadd0da80cab1f321eee9c052d41b66ef84e7e5379e81fb084a890` |
| Noto Sans SC Thin | Version 2.004-H2;hotconv 1.0.118;makeotfexe 2.5.65603 | 3755/3755 | `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da` |
| Oswald | Version 4.103;gftools[0.9.33.dev8+g029e19f] | 0/3755 | `5b38c246e255a12f5712d640d56bcced0472466fc68983d2d0410ec0457c2817` |
| Barlow Condensed | Version 1.408 | 0/3755 | `e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65` |
| Chakra Petch | Version 1.000; ttfautohint (v1.6) | 0/3755 | `65fbf76d95651697275e19db4d717c0e95a789ddd3476478b05292104db278a0` |
| Jersey 10 | Version 1.001; ttfautohint (v1.8.4.7-5d5b) | 0/3755 | `db9cbd091617048a145d249daa2b815fe7083be6ab66ac26626e21a4e01c3e82` |
| Fusion Pixel 12px Prop zh-Hans | 2026.11.10 | 3755/3755 | `7e93fedda2c55bb37badb2262aaf43b08e3cb5976a0e3de2d90986ce59fe902e` |
| Heiti genuine centerlines | upstream commit 87f5e407a36c175c1ab17f2ba4447768a7fffdab | 3755/3755 | `9cbd1337a001ee179fd4e882d9857f1950cb145904dfd0774c94bf372d561989` |
| Lato Bold historical runtime asset | Version 2.015; 2015-08-06; http://www.latofonts.com/ | 0/3755 | `8a0aace75d33794eece4b28187bfc1df0bbd2888b5d8a56e01788c8d65d16be1` |
| VibeSkyline SC Bold historical derived asset | Version 2.004;hotconv 1.0.118;makeotfexe 2.5.65603 | 3755/3755 | `3f3b810e6779d8dac343b32a28e5edf4822a31ce4efab04e1584f8a2924f0aed` |
| VibeSkyline Grid repaired selection | 2026.11.10 | 3755/3755 | `b6ea6aaa702887cbf9a7aec580b159328c61563f30877bf4ddcd12e29fb293d5` |

## Confirmed public default

The owner confirmed **VibeSkyline Grid** for the public product. The current sample uses neutral `skyline-demo`, Medium/front on three synthetic sources, at baseline depth 87.2 mm. Default selection no longer depends on a real name. The current fit matrix uses neutral/common CJK strings; the private owner-name coupon remains a separately labelled physical-verification artifact. Font bytes, OFL notices, outline processing and measurement thresholds are unchanged.
