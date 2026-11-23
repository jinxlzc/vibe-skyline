import { expect, it } from "vitest";
import { compileLocalSVG } from "./index";

const wrap = (contents: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg">' + contents + "</svg>";
const frame = '<path fill-rule="evenodd" d="M0 0H100V100H0Z M6 6H94V94H6Z"/>';
const island = '<rect x="45" y="45" width="10" height="10"/>';
const area = (path: [number, number][]) =>
  Math.abs(
    path.reduce((a, p, i) => {
      const q = path[(i + 1) % path.length];
      return a + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
it("enlarges the frame to 14 mm and keeps its hole and independent island", async () => {
  const tile = await compileLocalSVG(wrap(frame + island));
  expect(tile.width).toBe(14);
  expect(tile.height).toBe(14);
  expect(tile.paths.map(area).sort((a, b) => a - b)).toEqual([
    expect.closeTo(1.96, 4),
    expect.closeTo(151.7824, 4),
    196,
  ]);
  expect(tile.measurements.minStrokeMm).toBeCloseTo(0.84, 3);
  expect(tile.measurements.minGapMm).toBeGreaterThanOrEqual(0.6);
  expect(tile.measurements.qualified).toBe(false);
  expect(
    tile.paths
      .flat(2)
      .every((x) => Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-8),
  ).toBe(true);
});
it("resolves each fill-rule before composing sibling paint", async () => {
  const tile = await compileLocalSVG(
    wrap(frame.replace("evenodd", "nonzero") + island),
  );
  expect(tile.paths.map(area)).toEqual([100]);
});
it("widens a stroke before an anisotropic group transform", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<g transform="translate(10,20) scale(2,3)" fill="none" stroke="#000" stroke-width="2"><line x1="0" y1="0" x2="10" y2="0" /></g>',
    ),
  );
  expect([tile.width, tile.height]).toEqual([10, 3]);
  expect(tile.paths.map(area)).toEqual([30]);
});
it("retains circular counters and curved closed fills", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<path d="M0 10A10 10 0 0 0 20 10A10 10 0 0 0 0 10Z M4 10Q4 4 10 4T16 10Q16 16 10 16T4 10Z" fill-rule="evenodd"/>',
    ),
  );
  expect(tile.paths).toHaveLength(2);
  expect(Math.max(...tile.paths.map(area))).toBeCloseTo(
    (Math.PI * tile.width ** 2) / 4,
    0,
  );
});
it("handles a square end cap before rotation", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<path d="M0 0h8" transform="rotate(90)" stroke="red" stroke-width="2" stroke-linecap="square" fill="none"/>',
    ),
  );
  expect([tile.width, tile.height]).toEqual([2, 10]);
});
it("enlarges beyond 22 mm when a narrow counter demands it", async () => {
  const tile = await compileLocalSVG(
    wrap('<path fill-rule="evenodd" d="M0 0H100V100H0Z M49 30H51V70H49Z"/>'),
  );
  expect(tile.width).toBeGreaterThan(22);
  expect(tile.measurements.minGapMm).toBeGreaterThanOrEqual(0.6);
  expect(tile.paths).toHaveLength(2);
});
it.each([
  "<script/>",
  '<use href="#shape"/>',
  '<image href="file:///x"/>',
  "<filter/>",
  "<mask/>",
  "<text>Hi</text>",
  "<foreignObject/>",
  "<style/>",
  '<path onload="noop()"/>',
  '<rect fill="url(https://example.invalid/a)"/>',
  '<rect style="stroke-dasharray:1 1"/>',
  '<path transform="scale(1e100)" d="M0 0H10V10Z"/>',
  "<g>".repeat(36) + "</g>".repeat(36),
  '<path d="M0 0L2"/>',
])("rejects unsafe or unsupported local input %s", async (part) => {
  await expect(compileLocalSVG(wrap(island + part))).rejects.toThrow();
});
it.each([
  '<!DOCTYPE svg SYSTEM "file:///nope">',
  '<?xml-stylesheet href="other.css"?>',
  '<!ENTITY x "y">',
])("rejects XML declarations with active content", async (prefix) => {
  await expect(compileLocalSVG(prefix + wrap(island))).rejects.toThrow();
});

it("measures a diagonal corner-to-corner air gap between islands", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<rect width="50" height="50"/><rect x="52" y="52" width="48" height="48"/>',
    ),
  );
  expect(tile.width).toBe(22);
  expect(tile.measurements.minGapMm).toBeCloseTo(0.44 * Math.SQRT2, 4);
});
it("rejects an unmeasurable island even when a sibling has ample width", async () => {
  await expect(
    compileLocalSVG(
      wrap(
        '<rect width="100" height="100"/><path d="M120 0 l1 0 l-.5 .866 Z"/>',
      ),
    ),
  ).rejects.toThrow(/contour|feature/i);
});
it("preserves rounded stroke ends and the hollow interior of a closed stroked path", async () => {
  const cap = await compileLocalSVG(
    wrap(
      '<line x2="8" stroke="black" stroke-width="2" stroke-linecap="round"/>',
    ),
  );
  expect(cap.paths.map(area)).toEqual([expect.closeTo(16 + Math.PI, 1)]);
  const ring = await compileLocalSVG(
    wrap(
      '<rect x="1" y="1" width="8" height="8" stroke-width="2" fill="none" stroke="black"/>',
    ),
  );
  expect(ring.paths.map(area).sort((a, b) => b - a)).toEqual([100, 36]);
});

it("preserves a counter when the SVG coordinate units are tiny", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<path fill-rule="evenodd" d="M0 0H1e-8V1e-8H0Z M6e-10 6e-10H9.4e-9V9.4e-9H6e-10Z"/>',
    ),
  );
  expect(tile.paths).toHaveLength(2);
  expect(tile.width).toBe(14);
});

it("rejects an unresolved microscopic counter rather than removing it during clipping", async () => {
  await expect(
    compileLocalSVG(
      wrap(
        '<path fill-rule="evenodd" d="M0 0H100V100H0Z M50 50h1e-10v1e-10h-1e-10Z"/>',
      ),
    ),
  ).rejects.toThrow(/contour|feature|resolution/i);
});
it("rejects excessive path command counts before geometry processing", async () => {
  await expect(
    compileLocalSVG(wrap('<path d="M0 0' + "l1 1".repeat(2000) + 'Z"/>')),
  ).rejects.toThrow(/command limit/);
});

it.each(["round", "miter", "bevel"])(
  "produces a two-contour circular stroke using %s joins",
  async (join) => {
    const tile = await compileLocalSVG(
      wrap(
        '<circle r="5" fill="none" stroke="black" stroke-width="2" stroke-linejoin="' +
          join +
          '"/>',
      ),
    );
    expect(tile.width).toBe(10);
    expect(tile.paths).toHaveLength(2);
    // The shared calipers project chords onto wall normals conservatively.
    const diameters = tile.paths
      .map(
        (p) =>
          Math.max(...p.map((v) => v[0])) - Math.min(...p.map((v) => v[0])),
      )
      .sort((a, b) => b - a);
    expect((diameters[0] - diameters[1]) / 2).toBeCloseTo(10 / 6, 2);
    expect(diameters[1]).toBeCloseTo(20 / 3, 2);
    expect(tile.measurements.minStrokeMm).toBeGreaterThan(1.55);
    expect(tile.measurements.minGapMm).toBeGreaterThan(6.5);
  },
);
it.each(["M0 0A5 5 0 0 0 10 0", "M0 0Q5 -5 10 0"])(
  "keeps an open curved stroke connected (%s)",
  async (d) => {
    const tile = await compileLocalSVG(
      wrap('<path d="' + d + '" stroke="black" stroke-width="2" fill="none"/>'),
    );
    expect(tile.width).toBe(10);
    expect(tile.paths).toHaveLength(1);
    expect(tile.measurements.minStrokeMm).toBeGreaterThan(1.4);
    expect(tile.measurements.minStrokeMm).toBeLessThan(2.1);
  },
);
it("retains a valid stroke around an implicitly filled collinear polyline", async () => {
  const tile = await compileLocalSVG(
    wrap('<polyline points="0,0 5,0 10,0" stroke="black" stroke-width="2"/>'),
  );
  expect([tile.width, tile.height]).toEqual([10, 2]);
  expect(tile.paths.map(area)).toEqual([20]);
});
it("blocks a tapered structural neck below the bed-sized feature limit", async () => {
  await expect(
    compileLocalSVG(
      wrap('<path d="M0 0H40L50 49.9L60 0H100V100H60L50 50.1L40 100H0Z"/>'),
    ),
  ).rejects.toThrow(/feature/);
});
it("enlarges for a measurable same-contour structural neck", async () => {
  const tile = await compileLocalSVG(
    wrap('<path d="M0 0H40L50 48L60 0H100V100H60L50 52L40 100H0Z"/>'),
  );
  expect(tile.width).toBe(22);
  expect(tile.measurements.minStrokeMm).toBeCloseTo(0.88, 2);
});
it("measures a tapered air passage between regions of a single contour", async () => {
  const tile = await compileLocalSVG(
    wrap('<path d="M0 0H40L49 50L40 70H60L51 50L60 0H100V100H0Z"/>'),
  );
  expect(tile.width).toBeGreaterThanOrEqual(30);
  expect(tile.measurements.minGapMm).toBeCloseTo(tile.width * 0.02, 2);
});
it("provides a specific recovery for viewport-constrained root transforms", async () => {
  await expect(
    compileLocalSVG(
      '<svg viewBox="0 0 100 100" transform="rotate(90)"><rect x="10" y="10" width="20" height="20"/></svg>',
    ),
  ).rejects.toThrow(/root transform.*group/i);
});

it("keeps an island within its counter when coordinates round to both physical limits", async () => {
  const tile = await compileLocalSVG(
    wrap(
      '<path fill-rule="evenodd" d="M0 0H100V100H0Z M7.999 8H92V92H7.999Z M13.998 25H24V35H13.998Z"/>',
    ),
  );
  expect(tile.width).toBe(10);
  expect(tile.paths).toHaveLength(3);
  const painted = (x: number, y: number) =>
    tile.paths.filter((p) => {
      let inside = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i],
          b = p[j];
        if (
          a[1] > y !== b[1] > y &&
          x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
        )
          inside = !inside;
      }
      return inside;
    }).length %
      2 ===
    1;
  expect([
    painted(0.4, 7),
    painted(1.1, 7),
    painted(1.8, 7),
    painted(5, 5),
  ]).toEqual([true, false, true, false]);
  expect(tile.measurements.minStrokeMm).toBeCloseTo(0.8, 6);
  expect(tile.measurements.minGapMm).toBeCloseTo(0.6, 6);
  for (const p of tile.paths)
    for (const xy of p)
      for (const n of xy) expect(n * 1000).toBeCloseTo(Math.round(n * 1000), 6);
});

it('fixed first-edition seat preserves topology and reports thin features without auto-enlargement',async()=>{
 const t=await compileLocalSVG(wrap(frame+island),{seatMm:12.5});
 expect(t.width).toBe(12.5);expect(t.paths).toHaveLength(3);expect(t.measurements.minStrokeMm).toBeCloseTo(.75,3);expect(t.measurements.qualified).toBe(false);
});
it('reports submicron exterior artifacts at a fixed seat without discarding counters',async()=>{
 const t=await compileLocalSVG(wrap('<rect width="10" height="10"/><rect x="11" y="2" width="0.0001" height="0.0001"/>'),{seatMm:12.5});
 expect(t.measurements.discardedSubmicronIslands).toBe(1);expect(t.paths).toHaveLength(1);
});

it('accepts explicit px intrinsic SVG dimensions without allowing other units',async()=>{
 const tile=await compileLocalSVG('<svg width="72px" height="72px" viewBox="0 0 72 72"><circle cx="36" cy="36" r="36"/></svg>',{seatMm:12.5});
 expect(tile.width).toBe(12.5);
 await expect(compileLocalSVG('<svg width="72em" height="72em"><circle r="36"/></svg>')).rejects.toThrow();
});
