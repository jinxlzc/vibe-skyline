"""Reproduce comparison inputs from pinned hashes. Requires Python 3 and fontTools 4.63.0.
Run from the repository root, then run pnpm tsx packages/geometry/scripts/compare-fonts.ts.
Downloads/research subsets stay inside .superpowers/sdd/m2-cjk.
"""
from hashlib import sha256
from io import BytesIO
import json
from math import cos, hypot, pi, sin
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile
from fontTools import subset
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

DEST = Path(".superpowers/sdd/m2-cjk")
DEST.mkdir(parents=True, exist_ok=True)
CORPUS = "欧阳司马诸葛上官夏侯东方南宫长孙戴薛陈小山林小川山河张伟李明王芳陈晨欧阳子轩司马光诸葛亮量曦餐馨罐李小明马一凡高山刘洋赵丽王小林张三"
LEVEL_ONE = {
    ord(bytes([r, c]).decode("gb2312"))
    for r in range(0xb0, 0xd8) for c in range(0xa1, 0xfa if r == 0xd7 else 0xff)
}


def expand_strokes(strokes):
    """Outline 0.08-em round strokes using rectangles and 16-sided circular joins."""
    builder = FontBuilder(1000, isTTF=True)
    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    cmap = {}
    for char in sorted(set(CORPUS)):
        pen = TTGlyphPen(None)

        def contour(points):
            points = [(round(x), round(y)) for x, y in points]
            area2 = sum(a[0]*b[1] - a[1]*b[0] for a, b in zip(points, points[1:] + points[:1]))
            if area2 > 0:
                points.reverse()
            pen.moveTo(points[0])
            for point in points[1:]:
                pen.lineTo(point)
            pen.closePath()

        for line in strokes["U+%04X" % ord(char)]:
            points = [(x*1000, (1-y)*1000) for x, y in line]
            for x, y in points:
                contour([(x + 40*cos(i*pi/8), y + 40*sin(i*pi/8)) for i in range(16)])
            for (x,y), (u,v) in zip(points, points[1:]):
                length = hypot(u-x, v-y)
                if length:
                    nx, ny = 40*(v-y)/length, 40*(x-u)/length
                    contour([(x+nx,y+ny), (u+nx,v+ny), (u-nx,v-ny), (x-nx,y-ny)])
        name = "uni%04X" % ord(char)
        glyphs[name] = pen.glyph()
        cmap[ord(char)] = name
    builder.setupGlyphOrder(list(glyphs))
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({g: (1100, 0) for g in glyphs})
    builder.setupHorizontalHeader(ascent=1050, descent=-50)
    builder.setupNameTable({"familyName": "Research Heiti Stroke", "styleName": "Regular"})
    builder.setupOS2(sTypoAscender=1050, sTypoDescender=-50, usWinAscent=1050, usWinDescent=50)
    builder.setupPost()
    builder.setupMaxp()
    return builder.font


def prepare(entry):
    url = entry["sourceUrl"]
    if url.startswith("https://"):
        with urlopen(url, timeout=90) as response:
            raw = response.read()
        if "sourceMember" in entry:
            assert sha256(raw).hexdigest() == entry["sourceArchiveSha256"]
            with ZipFile(BytesIO(raw)) as archive:
                raw = archive.read(entry["sourceMember"])
    else:
        raw = Path(url).read_bytes()
    assert sha256(raw).hexdigest() == entry["sourceSha256"], url
    if url.endswith(".json"):
        strokes = json.loads(raw)
        mapped = {int(key[2:], 16) for key in strokes}
        expand_strokes(strokes).save(DEST / entry["variants"][0])
    else:
        mapped = TTFont(BytesIO(raw)).getBestCmap().keys()
        for variant in entry["variants"]:
            if "/" in variant:
                continue  # The pinned project asset is already the test input.
            font = TTFont(BytesIO(raw), recalcTimestamp=False)
            sub = subset.Subsetter()
            sub.populate(text=CORPUS + "".join(chr(i) for i in range(32, 127)))
            sub.subset(font)
            if "fvar" in font:
                weight = int(Path(variant).stem.split("-")[-1])
                instantiateVariableFont(font, {"wght": weight}, inplace=True)
            font.save(DEST / variant)
    assert len(LEVEL_ONE & mapped) == entry["GB2312Level1"]


for candidate in json.loads(Path("docs/acceptance/font-candidates.json").read_text())["candidates"]:
    prepare(candidate)
