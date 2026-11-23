"""Reproduce the local engraving subset with fontTools 4.63.0 and Python 3."""
import hashlib
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

upstream = Path(sys.argv[1])
assert hashlib.sha256(upstream.read_bytes()).hexdigest() == "b5f0d1a190a7f9b43c310a8850630af12553df32c4c050543f9059732d9b4c0a"
font = TTFont(upstream, recalcTimestamp=False)
level_one = {
    bytes([row, cell]).decode("gb2312")
    for row in range(0xB0, 0xD8)
    for cell in range(0xA1, (0xFA if row == 0xD7 else 0xFF))
}
assert len(level_one) == 3755
requested = set(map(ord, level_one | set("曦"))) | set(range(32, 127))
for start, end in [(0xA0, 0xFF), (0x2000, 0x206F), (0x3000, 0x303F), (0xFF01, 0xFF60)]:
    requested.update(set(range(start, end + 1)) & font.getBestCmap().keys())
assert requested <= font.getBestCmap().keys()
opts = subset.Options()
opts.name_IDs = ["*"]
opts.name_languages = ["*"]
opts.layout_features = []  # runtime maps isolated NFC graphemes to their default glyph
subsetter = subset.Subsetter(options=opts)
subsetter.populate(unicodes=requested)
subsetter.subset(font)
for record in font["name"].names:
    if record.nameID in (1, 3, 4, 6, 16):
        names = {1: "VibeSkyline SC", 3: "VibeSkylineSC-Bold-2.004", 4: "VibeSkyline SC Bold", 6: "VibeSkylineSC-Bold", 16: "VibeSkyline SC"}
        record.string = names[record.nameID].encode(record.getEncoding())
cff = font["CFF "].cff
cff.fontNames[0] = "VibeSkylineSC-Bold"
cff.topDictIndex[0].FullName = "VibeSkyline SC Bold"
cff.topDictIndex[0].FamilyName = "VibeSkyline SC"
font.save(Path(__file__).with_name("VibeSkylineSC-Bold.otf"))
assert set(font.getBestCmap()) == requested and ord("龘") not in requested
print(len(requested), "mapped code points")
