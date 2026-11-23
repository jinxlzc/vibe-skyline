# VibeSkyline SC Bold

The local engraving font derives from Noto Sans CJK SC Bold 2.004, © 2014–2021 Adobe. It uses the SIL Open Font License 1.1. The font retains the upstream copyright and license records. [Upstream release](https://github.com/notofonts/noto-cjk/releases/tag/Sans2.004) · [Original font](https://github.com/notofonts/noto-cjk/blob/Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf) · [Upstream license](https://github.com/notofonts/noto-cjk/blob/Sans2.004/LICENSE) · [Bundled license](VibeSkylineSC-OFL.txt).

The subset maps 4,141 scalars. It includes the 3,755 first-level Han characters from GB2312 rows 16–55, 曦, printable ASCII, and available Latin-1, general, CJK and fullwidth punctuation in the ranges listed by the script. The local font has a new family and PostScript name. The source outlines are unmodified apart from subsetting.

For reproduction, download the linked static OTF and run `python3 packages/geometry/assets/subset-sc.py /path/to/NotoSansCJKsc-Bold.otf` with fontTools 4.63.0. The script checks the source SHA-256 before processing. The upstream hash is `b5f0d1a190a7f9b43c310a8850630af12553df32c4c050543f9059732d9b4c0a`. The subset hash is `3f3b810e6779d8dac343b32a28e5edf4822a31ce4efab04e1584f8a2924f0aed`.

Geometry reads a static local font as bytes. It maps each NFC, single-scalar grapheme separately to a glyph, using the simplified-Chinese default outlines for Han. Separate physical spacing keeps raised letters apart. Contextual scripts, combining sequences without a precomposed glyph and variation sequences require a shaping engine and are rejected with their original graphemes. A local static TTF or OTF may supply additional supported glyphs. The geometry package has no font network requests.
