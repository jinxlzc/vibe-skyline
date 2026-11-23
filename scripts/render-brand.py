"""Render the selected concept A site assets (CairoSVG 2.9.1, Pillow 12.0.0)."""

from io import BytesIO
from pathlib import Path
from shutil import copyfile
from struct import pack
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/brand/m8/concept-a"
PUBLIC = ROOT / "apps/web/public"
FIELD = "#f3f0e9"


def render_on_field(source, width, height, x, y, art_width, art_height, output):
    """Place the original path art on an opaque field without changing its geometry."""
    svg = ET.Element("{http://www.w3.org/2000/svg}svg", {
        "width": str(width), "height": str(height), "viewBox": f"0 0 {width} {height}",
    })
    ET.SubElement(svg, "{http://www.w3.org/2000/svg}rect", {
        "width": str(width), "height": str(height), "fill": FIELD,
    })
    art = ET.parse(SOURCE / source).getroot()
    art.attrib.update(x=str(x), y=str(y), width=str(art_width), height=str(art_height))
    svg.append(art)
    png = cairosvg.svg2png(bytestring=ET.tostring(svg))
    Image.open(BytesIO(png)).convert("RGB").save(PUBLIC / output)


PUBLIC.mkdir(parents=True, exist_ok=True)
# Fixed light backing stays legible on light and dark browser tabs.
copyfile(SOURCE / "favicon-32.svg", PUBLIC / "favicon.svg")
layers = []
for size in (16, 32):
    # Render each optical sibling at its native size: no raster resampling.
    png = cairosvg.svg2png(url=str(SOURCE / f"favicon-{size}.svg"))
    (PUBLIC / f"favicon-{size}.png").write_bytes(png)
    layers.append((size, png))

# ICO directory + two original PNG payloads; never resize the 32px layer to 16px.
offset = 6 + 16 * len(layers)
directory = bytearray(pack("<HHH", 0, 1, len(layers)))
for size, png in layers:
    directory.extend(pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(png), offset))
    offset += len(png)
(PUBLIC / "favicon.ico").write_bytes(directory + b"".join(png for _, png in layers))

for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
    # 12.5% canvas padding on each edge, plus the mark's intrinsic clear space.
    render_on_field("mark.svg", size, size, size / 8, size / 8,
                    size * 3 / 4, size * 3 / 4, name)

# Center the untouched lockup at 2.5x on the social card; all lettering is outlined.
render_on_field("lockup.svg", 1200, 630, 165, 215, 870, 200, "og.png")
