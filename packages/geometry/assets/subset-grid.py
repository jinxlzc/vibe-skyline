"""Build the static VibeSkyline Grid face from the pinned Fusion Pixel release.
Usage: python3 subset-grid.py /path/to/fusion-pixel-font-12px-proportional-ttf-v2026.11.10.zip
Python 3, fontTools 4.63.0. Runtime code never modifies glyph outlines.
"""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import sys
from zipfile import ZipFile
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from collections import Counter

ASSETS = Path(__file__).resolve().parent
ZIP_HASH = "aa6b4da3f80d95af45f41d74b37db0fa3a832d7f428adeb7234b4758d50bbae9"
SOURCE_HASH = "7e93fedda2c55bb37badb2262aaf43b08e3cb5976a0e3de2d90986ce59fe902e"


def repair_diagonal_contacts(font):
    """Join diagonally touching ink pixels. All untouched vertices stay on the grid.

    At a shared corner, pair each incoming edge with the outgoing edge of
    the other ink quadrant. Trim both at 60 font units (one pixel is 100)
    and connect them diagonally. This adds two ink triangles in the empty
    quadrants. Their legs stay below one pixel, preserving empty cell centers.
    """
    table = font["glyf"]
    for name in font.getGlyphOrder():
        glyph = table[name]
        if glyph.numberOfContours == 0:
            continue
        assert glyph.numberOfContours > 0
        coords, ends, flags = glyph.getCoordinates(table)
        assert all(flag & 1 for flag in flags)
        contours = []
        start = 0
        for end in ends:
            contours.append(list(coords[start:end + 1]))
            start = end + 1
        counts = Counter(coords)
        if max(counts.values()) == 1:
            continue

        def trim(corner, neighbor):
            dx, dy = neighbor[0] - corner[0], neighbor[1] - corner[1]
            length = abs(dx) + abs(dy)
            assert dx * dy == 0 and length >= 100
            return (corner[0] + 60 * dx // length, corner[1] + 60 * dy // length)

        edges = {}
        contacts = {}
        for path in contours:
            for i, point in enumerate(path):
                following = path[(i + 1) % len(path)]
                a = trim(point, following) if counts[point] > 1 else point
                b = trim(following, point) if counts[following] > 1 else following
                assert a not in edges and a != b
                edges[a] = b
                if counts[point] > 1:
                    incoming = trim(point, path[i - 1])
                    contacts.setdefault(point, []).append((incoming, a))
        for pair in contacts.values():
            (incoming, outgoing), (other_in, other_out) = pair
            assert incoming not in edges and other_in not in edges
            edges[incoming] = other_out
            edges[other_in] = outgoing
        assert set(edges) == set(edges.values())
        pen = TTGlyphPen(None)
        while edges:
            start = next(iter(edges))
            pen.moveTo(start)
            point = edges.pop(start)
            while point != start:
                pen.lineTo(point)
                point = edges.pop(point)
            pen.closePath()
        table[name] = pen.glyph()


def main():
    archive_bytes = Path(sys.argv[1]).read_bytes()
    assert sha256(archive_bytes).hexdigest() == ZIP_HASH
    with ZipFile(BytesIO(archive_bytes)) as archive:
        raw = archive.read("fusion-pixel-12px-proportional-zh_hans.ttf")
        assert sha256(raw).hexdigest() == SOURCE_HASH
        licenses = ASSETS / "grid-licenses"
        for name in archive.namelist():
            if name.endswith(".txt"):
                destination = licenses / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(archive.read(name))
    font = TTFont(BytesIO(raw), recalcTimestamp=False)
    level_one = {
        ord(bytes([row, cell]).decode("gb2312"))
        for row in range(0xB0, 0xD8)
        for cell in range(0xA1, 0xFA if row == 0xD7 else 0xFF)
    }
    assert len(level_one) == 3755
    mapped = font.getBestCmap().keys()
    required = level_one | set(range(32, 127)) | set(map(ord, "曦馨罐"))
    assert required <= mapped
    for first, last in [(0xA0, 0xFF), (0x2000, 0x206F), (0x3000, 0x303F), (0xFF01, 0xFF60)]:
        required.update(mapped & set(range(first, last + 1)))
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.layout_features = []
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=required)
    subsetter.subset(font)
    repair_diagonal_contacts(font)
    names = {1: "VibeSkyline Grid", 2: "Regular", 3: "VibeSkylineGrid-Regular-20261110",
             4: "VibeSkyline Grid Regular", 6: "VibeSkylineGrid-Regular", 16: "VibeSkyline Grid"}
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    output = ASSETS / "VibeSkylineGrid-Regular.ttf"
    font.save(output)
    print(len(required), "mapped codepoints;", sha256(output.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
