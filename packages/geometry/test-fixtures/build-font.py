"""Build the synthetic TrueType geometry regression fixture (fontTools 4.63.0)."""
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

def glyph(*contours):
    pen = TTGlyphPen(None)
    for contour in contours:
        pen.moveTo(contour[0])
        for point in contour[1:]:
            pen.lineTo(point)
        pen.closePath()
    return pen.glyph()

def rect(left, bottom, right, top):
    return [(left, bottom), (left, top), (right, top), (right, bottom)]

# The first two clockwise shapes overlap by 25 font units. The last contour is
# counterclockwise, leaving an independent 200 x 400 counter in the first shape.
overlap = glyph(rect(0, 0, 900, 1000), rect(875, 0, 1200, 1000),
                rect(200, 300, 400, 700)[::-1])
overlap.flags[0] |= 0x40  # OVERLAP_SIMPLE
glyphs = {".notdef": glyph(), "overlap": overlap,
          "fullband": glyph(rect(0, 0, 19000, 1000)),
          "wideband": glyph(rect(0, 0, 23000, 1000))}
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(list(glyphs))
fb.setupCharacterMap(dict(zip(map(ord, "龘甲乙"), list(glyphs)[1:])))
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(dict(zip(glyphs, ((1000, 0), (1200, 0), (19000, 0), (23000, 0)))))
fb.setupHorizontalHeader(ascent=1000, descent=0)
fb.setupNameTable({"familyName": "VibeSkyline Synthetic Contours", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=1000, sTypoDescender=0, usWinAscent=1000, usWinDescent=0)
fb.setupPost()
fb.font["head"].created = fb.font["head"].modified = 3800000000
fb.save(Path(__file__).with_name("synthetic-contours.ttf"))
