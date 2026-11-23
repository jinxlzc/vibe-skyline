import { DOMParser, type Element } from "@xmldom/xmldom";
import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
import { initGeometry, measureFeatures } from "@vibeskyline/geometry";

type Point = [number, number];
type Matrix = [number, number, number, number, number, number];
type Runtime = Awaited<ReturnType<typeof initGeometry>>;
type FillRule = "EvenOdd" | "NonZero";
type Style = {
  fill: boolean;
  stroke: boolean;
  rule: FillRule;
  width: number;
  join: "round" | "bevel" | "miter";
  cap: "round" | "butt" | "square";
  miter: number;
};
type Shape = { data: SVGPathData; matrix: Matrix; style: Style };
type Bounds = { x0: number; y0: number; x1: number; y1: number };
const identity: Matrix = [1, 0, 0, 1, 0, 0];
const defaults: Style = {
  fill: true,
  stroke: false,
  rule: "NonZero",
  width: 1,
  join: "miter",
  cap: "butt",
  miter: 4,
};
const maxTile = 246;
const rad = Math.PI / 180;
const numberPattern = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const numberRE = new RegExp("^" + numberPattern + "$");
const SVG_NS = "http://www.w3.org/2000/svg";
function fail(message: string): never {
  throw Error("Local SVG: " + message);
}
function number(s: string) {
  const value = Number(s);
  if (
    !numberRE.test(s.trim()) ||
    Math.abs(value) > 1e6 ||
    !Number.isFinite(value)
  )
    fail("expected a finite unitless number within ±1,000,000.");
  return value;
}
function list(s: string) {
  return s
    .trim()
    .split(/\s*,\s*|\s+/)
    .map(number);
}
function xy(m: Matrix, [x, y]: Point): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
function multiply(m: Matrix, n: Matrix): Matrix {
  const [a, b, c, d, e, f] = m,
    [u, v, w, x, y, z] = n;
  const result: Matrix = [
    a * u + c * v,
    b * u + d * v,
    a * w + c * x,
    b * w + d * x,
    a * y + c * z + e,
    b * y + d * z + f,
  ];
  if (
    result.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e8) ||
    Math.abs(result[0] * result[3] - result[1] * result[2]) < 1e-10
  )
    fail("transform exceeds the supported numeric range.");
  return result;
}
function transform(value: string, parent: Matrix) {
  const item = /\s*([a-zA-Z]+)\s*\(([^()]*)\)\s*/gy;
  let pos = 0,
    m = parent;
  for (let i = 0; pos < value.length; i++) {
    item.lastIndex = pos;
    const match = item.exec(value);
    if (!match || i >= 32) fail("invalid or excessively long transform.");
    const n = list(match[2]);
    let t: Matrix;
    const [x, y = 0, z = 0] = n;
    const c = Math.cos(x * rad),
      s = Math.sin(x * rad);
    switch (match[1]) {
      case "matrix":
        if (n.length !== 6) fail("matrix requires six numbers.");
        t = n as Matrix;
        break;
      case "translate":
        if (n.length > 2) fail("invalid translate.");
        t = [1, 0, 0, 1, x, y];
        break;
      case "scale":
        if (n.length > 2) fail("invalid scale.");
        t = [x, 0, 0, n[1] ?? x, 0, 0];
        break;
      case "rotate":
        if (n.length !== 1 && n.length !== 3) fail("invalid rotate.");
        t = [c, s, -s, c, y - y * c + z * s, z - y * s - z * c];
        break;
      case "skewX":
      case "skewY":
        if (n.length !== 1) fail("invalid skew.");
        t =
          match[1] === "skewX"
            ? [1, 0, Math.tan(x * rad), 1, 0, 0]
            : [1, Math.tan(x * rad), 0, 1, 0, 0];
        break;
      default:
        fail("unsupported transform.");
    }
    m = multiply(m, t);
    pos = item.lastIndex;
    if (value[pos] === ",") {
      pos++;
      if (pos >= value.length) fail("invalid transform separator.");
    }
  }
  return m;
}
function paint(v: string) {
  if (v === "none") return false;
  if (
    /^(?:#[\da-f]{3}|#[\da-f]{6}|black|white|red|green|blue|yellow|gray|grey|currentColor)$/i.test(
      v,
    )
  )
    return true;
  fail("use a solid hex color or none for fill and stroke.");
}
const presentation = new Set([
  "fill",
  "stroke",
  "fill-rule",
  "stroke-width",
  "stroke-linejoin",
  "stroke-linecap",
  "stroke-miterlimit",
]);
function property(s: Style, name: string, v: string) {
  switch (name) {
    case "fill":
    case "stroke":
      s[name] = paint(v);
      break;
    case "fill-rule":
      if (v !== "evenodd" && v !== "nonzero") fail("unsupported fill-rule.");
      s.rule = v === "evenodd" ? "EvenOdd" : "NonZero";
      break;
    case "stroke-width":
      s.width = number(v);
      if (s.width < 0) fail("negative stroke width.");
      break;
    case "stroke-miterlimit":
      s.miter = number(v);
      if (s.miter < 1 || s.miter > 32) fail("unsupported miter limit.");
      break;
    case "stroke-linejoin":
      if (v !== "miter" && v !== "round" && v !== "bevel")
        fail("unsupported stroke join.");
      s.join = v;
      break;
    case "stroke-linecap":
      if (v !== "butt" && v !== "round" && v !== "square")
        fail("unsupported stroke cap.");
      s.cap = v;
      break;
    default:
      fail("unsupported style property " + name + ".");
  }
}
const geometryAttrs: Record<string, string[]> = {
  svg: ["xmlns", "xmlns:xlink", "viewBox", "width", "height", "version"],
  g: [],
  path: ["d"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polygon: ["points"],
  polyline: ["points"],
  title: [],
  desc: [],
};
function dimension(e: Element, key: string, fallback = 0) {
  const attr = e.getAttribute(key);
  return attr === null ? fallback : number(attr);
}
function primitive(e: Element) {
  const tag = e.tagName,
    d = (key: string, fallback?: number) => dimension(e, key, fallback);
  if (tag === "path") return e.getAttribute("d") ?? "";
  if (tag === "line") return `M${d("x1")} ${d("y1")}L${d("x2")} ${d("y2")}`;
  if (tag === "polygon" || tag === "polyline") {
    const pts = list(e.getAttribute("points") ?? "");
    if (pts.length % 2 || pts.length < 4)
      fail("invalid polygon/polyline points.");
    return "M" + pts.join(" ") + (tag === "polygon" ? "Z" : "");
  }
  if (tag === "rect") {
    const x = d("x"),
      y = d("y"),
      w = d("width"),
      h = d("height");
    const rx = Math.min(w / 2, d("rx", d("ry"))),
      ry = Math.min(h / 2, d("ry", d("rx")));
    if (Math.min(w, h, rx, ry) < 0) fail("negative rectangle dimension.");
    if (!w || !h) return "";
    if (!rx || !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
    const arc = `a${rx} ${ry} 0 0 1 `;
    return `M${x + rx} ${y}h${w - 2 * rx}${arc}${rx} ${ry}v${h - 2 * ry}${arc}${-rx} ${ry}h${2 * rx - w}${arc}${-rx} ${-ry}v${2 * ry - h}${arc}${rx} ${-ry}Z`;
  }
  const x = d("cx"),
    y = d("cy"),
    rx = tag === "circle" ? d("r") : d("rx"),
    ry = tag === "circle" ? rx : d("ry");
  if (Math.min(rx, ry) < 0) fail("negative ellipse radius.");
  if (!rx || !ry) return "";
  return `M${x - rx} ${y}a${rx} ${ry} 0 0 1 ${2 * rx} 0a${rx} ${ry} 0 0 1 ${-2 * rx} 0Z`;
}
function read(svg: string) {
  if (
    typeof svg !== "string" ||
    svg.length > 131072 ||
    svg.split("<").length > 1024
  )
    fail("document exceeds the size or element limit.");
  // Exclude entity expansion and processing instructions before invoking XML parsing.
  const xml = svg
    .trim()
    .replace(
      /^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>/i,
      "",
    );
  if (/<!(?!--)|<\?|&/.test(xml))
    fail("entities, declarations and processing instructions are unsupported.");
  const doc = new DOMParser({
    onError: () => fail("invalid XML."),
  }).parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "svg") fail("expected an SVG root.");
  const shapes: Shape[] = [];
  let commands = 0;
  function walk(e: Element, parent: Matrix, inherit: Style, depth: number) {
    const tag = e.tagName,
      container = tag === "g" || tag === "svg",
      metadata = tag === "title" || tag === "desc";
    if (depth > 24) fail("document nesting exceeds 24.");
    if (
      (e.namespaceURI && e.namespaceURI !== SVG_NS) ||
      !Object.hasOwn(geometryAttrs, tag) ||
      (depth && tag === "svg")
    )
      fail(
        "unsupported element " +
          tag +
          ". Outline text and expand referenced artwork first.",
      );
    const style = { ...inherit };
    for (const a of e.attributes) {
      const k = a.name,
        v = a.value;
      if (presentation.has(k)) property(style, k, v.trim());
      else if (
        !["style", "transform", "id"].includes(k) &&
        !geometryAttrs[tag].includes(k)
      )
        fail("unsupported attribute " + k + ".");
      if (
        (k === "xmlns" && v !== SVG_NS) ||
        (k === "xmlns:xlink" && v !== "http://www.w3.org/1999/xlink")
      )
        fail("unsupported namespace.");
    }
    for (const declaration of (e.getAttribute("style") ?? "").split(";")) {
      if (!declaration.trim()) continue;
      const parts = declaration.split(":");
      if (parts.length !== 2) fail("invalid inline style.");
      property(style, parts[0].trim(), parts[1].trim());
    }
    const matrix = transform(
      (e.getAttribute("transform") ?? "").trim(),
      parent,
    );
    if (!container && !metadata) {
      const data = new SVGPathData(primitive(e));
      commands += data.commands.length;
      if (commands > 1536) fail("path command limit exceeded.");
      data
        .toAbs()
        .normalizeST()
        .transform(
          SVGPathDataTransformer.NORMALIZE_HVZ(false, true, true, false),
        )
        .qtToC();
      if (
        data.commands.some((c) =>
          Object.values(c).some(
            (n) =>
              typeof n === "number" &&
              (!Number.isFinite(n) || Math.abs(n) > 1e7),
          ),
        )
      )
        fail("invalid or excessive path coordinates.");
      if (
        data.commands.length &&
        (style.fill || (style.stroke && style.width > 0))
      )
        shapes.push({ data, matrix, style });
    }
    for (const n of e.childNodes) {
      if (n.nodeType === 1) {
        if (!container) fail("unsupported nested element.");
        walk(n as Element, matrix, style, depth + 1);
      } else if (
        n.nodeType !== 8 &&
        !(n.nodeType === 3 && (metadata || !n.nodeValue?.trim()))
      )
        fail("unexpected SVG content.");
    }
  }
  walk(root, identity, defaults, 0);
  let viewport: Bounds | undefined;
  const vb = root.getAttribute("viewBox");
  const w = root.hasAttribute("width") ? number((root.getAttribute("width") ?? "").trim().replace(/px$/, "")) : undefined,
    h = root.hasAttribute("height") ? number((root.getAttribute("height") ?? "").trim().replace(/px$/, "")) : undefined;
  if ((w !== undefined && w <= 0) || (h !== undefined && h <= 0))
    fail("invalid intrinsic size.");
  if (vb !== null) {
    const b = list(vb);
    if (b.length !== 4 || b[2] <= 0 || b[3] <= 0) fail("invalid viewBox.");
    viewport = { x0: b[0], y0: b[1], x1: b[0] + b[2], y1: b[1] + b[3] };
  } else if (w !== undefined || h !== undefined) {
    if (w === undefined || h === undefined)
      fail("supply both intrinsic dimensions or a viewBox.");
    viewport = { x0: 0, y0: 0, x1: w, y1: h };
  }
  if (viewport && root.hasAttribute("transform"))
    fail(
      "a root transform with a declared viewport is unsupported. Apply it to a group and update the viewBox.",
    );
  return { shapes, viewport };
}

const sub = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const add = (p: Point, q: Point): Point => [p[0] + q[0], p[1] + q[1]];
const times = (p: Point, k: number): Point => [p[0] * k, p[1] * k];
const midpoint = (p: Point, q: Point): Point => times(add(p, q), 0.5);
const length = (p: Point) => Math.hypot(...p);
const dot = (p: Point, q: Point) => p[0] * q[0] + p[1] * q[1];
const cross = (p: Point, q: Point) => p[0] * q[1] - p[1] * q[0];
const same = (p: Point, q: Point) => p[0] === q[0] && p[1] === q[1];
function bounds(points: Point[]): Bounds {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
const extent = (b: Bounds) => Math.max(b.x1 - b.x0, b.y1 - b.y0);
function signedArea(p: Point[]) {
  return p.reduce((v, a, i) => v + cross(a, p[(i + 1) % p.length]), 0) / 2;
}
// Frobenius norm upper-bounds the largest affine stretch, including skew.
function stretch([a, b, c, d]: Matrix) {
  return Math.hypot(a, b, c, d);
}
function estimatedBounds(shapes: Shape[]) {
  const points: Point[] = [];
  for (const { data, matrix, style } of shapes) {
    const { minX, maxX, minY, maxY } = data.getBounds();
    if (!Number.isFinite(minX)) continue;
    const r = style.stroke ? style.width * style.miter : 0;
    for (const x of [minX - r, maxX + r])
      for (const y of [minY - r, maxY + r]) points.push(xy(matrix, [x, y]));
  }
  return bounds(points);
}
function arcSteps(angle: number, radius: number, tol: number) {
  // For an elliptical arc, the greatest semiaxis upper-bounds sagitta error.
  const step = Math.min(
    Math.PI / 4,
    4 * Math.asin(Math.sqrt(Math.min(1, tol / (2 * radius)))),
  );
  const count = Math.max(1, Math.ceil(Math.abs(angle) / step));
  if (!Number.isFinite(count) || count > 4096)
    fail("curve exceeds flattening complexity.");
  return count;
}
function cubic(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  tol: number,
  push: (p: Point) => void,
  depth = 0,
) {
  const chord = sub(d, a),
    square = dot(chord, chord);
  const distance = (p: Point) => {
    const q = sub(p, a),
      t = square ? Math.max(0, Math.min(1, dot(q, chord) / square)) : 0;
    return length(sub(q, times(chord, t)));
  };
  if (Math.max(distance(b), distance(c)) <= tol) {
    push(d);
    return;
  }
  if (depth >= 24) fail("cannot flatten Bézier within tolerance.");
  const ab = midpoint(a, b),
    bc = midpoint(b, c),
    cd = midpoint(c, d);
  const left = midpoint(ab, bc),
    right = midpoint(bc, cd),
    m = midpoint(left, right);
  cubic(a, ab, left, m, tol, push, depth + 1);
  cubic(m, right, cd, d, tol, push, depth + 1);
}
type Subpath = { points: Point[]; closed: boolean };
function flatten(data: SVGPathData, tol: number, count: () => void) {
  const paths: Subpath[] = [];
  let current: Point = [0, 0],
    path: Subpath | undefined;
  function start(p: Point) {
    path = { points: [p], closed: false };
    paths.push(path);
    count();
  }
  function push(p: Point) {
    if (!path) start(current);
    if (!p.every(Number.isFinite)) fail("invalid curve coordinate.");
    if (!same(path!.points.at(-1)!, p)) {
      path!.points.push(p);
      count();
    }
  }
  for (const c of data.annotateArcs().commands) {
    switch (c.type) {
      case SVGPathData.MOVE_TO:
        current = [c.x, c.y];
        start(current);
        break;
      case SVGPathData.CLOSE_PATH:
        if (path) {
          path.closed = true;
          current = path.points[0];
          path = undefined;
        }
        break;
      case SVGPathData.LINE_TO:
        push([c.x, c.y]);
        current = [c.x, c.y];
        break;
      case SVGPathData.CURVE_TO:
        cubic(current, [c.x1, c.y1], [c.x2, c.y2], [c.x, c.y], tol, push);
        current = [c.x, c.y];
        break;
      case SVGPathData.ARC: {
        const end: Point = [c.x, c.y];
        if (same(end, current)) break;
        const rot = c.xRot * rad,
          start = c.phi1! * rad,
          span = c.phi2! * rad - start;
        const n = arcSteps(span, Math.max(c.rX, c.rY), tol);
        for (let i = 1; i < n; i++) {
          const t = start + (span * i) / n,
            x = c.rX * Math.cos(t),
            y = c.rY * Math.sin(t);
          push([
            c.cX! + x * Math.cos(rot) - y * Math.sin(rot),
            c.cY! + x * Math.sin(rot) + y * Math.cos(rot),
          ]);
        }
        push(end);
        current = end;
        break;
      }
      default:
        fail("unsupported path command.");
    }
  }
  return paths;
}
// Construct segment bodies, outside joins and caps in the stroke's own coordinate system.
function strokePieces(
  { points, closed }: Subpath,
  s: Style,
  tol: number,
  emit: (p: Point[]) => void,
) {
  const r = s.width / 2;
  if (closed && points.length > 1 && same(points[0], points.at(-1)!))
    points = points.slice(0, -1);
  if (points.length < 2) {
    if (s.cap !== "butt") fail("outline zero-length strokes with caps first.");
    return;
  }
  const dir: Point[] = [],
    normals: Point[] = [];
  for (let i = 0; i < (closed ? points.length : points.length - 1); i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      v = sub(b, a);
    const u = times(v, 1 / length(v)),
      n: Point = [-u[1] * r, u[0] * r];
    dir.push(u);
    normals.push(n);
    const start =
      !closed && i === 0 && s.cap === "square" ? sub(a, times(u, r)) : a;
    const end =
      !closed && i === points.length - 2 && s.cap === "square"
        ? add(b, times(u, r))
        : b;
    // Give each join and body the identical half-edge endpoints. The polygon
    // kernel rounds all coordinates; a long unsplit butt edge can miss its
    // rounded midpoint and introduce a sliver beside the joining sector.
    emit([sub(start, n), sub(end, n), end, start]);
    emit([start, end, add(end, n), add(start, n)]);
  }
  function sector(center: Point, v: Point, angle: number, end: Point) {
    const n = arcSteps(angle, r, tol),
      p = [center, add(center, v)];
    for (let i = 1; i < n; i++) {
      const t = (angle * i) / n,
        c = Math.cos(t),
        s = Math.sin(t);
      p.push(add(center, [c * v[0] - s * v[1], s * v[0] + c * v[1]]));
    }
    p.push(add(center, end));
    emit(p);
  }
  if (!closed && s.cap === "round") {
    const last = normals.at(-1)!;
    sector(points[0], normals[0], Math.PI, times(normals[0], -1));
    sector(points.at(-1)!, times(last, -1), Math.PI, last);
  }
  for (let i = closed ? 0 : 1; i < dir.length; i++) {
    const j = (i + dir.length - 1) % dir.length;
    const turn = Math.atan2(cross(dir[j], dir[i]), dot(dir[j], dir[i]));
    if (Math.abs(turn) < 1e-12) continue;
    const side = -Math.sign(turn),
      v = times(normals[j], side),
      w = times(normals[i], side),
      p = points[i];
    if (s.join === "round") {
      sector(p, v, turn, w);
      continue;
    }
    const wedge = [p, add(p, v)];
    const cosHalf = Math.cos(turn / 2);
    if (s.join === "miter" && 1 / cosHalf <= s.miter)
      wedge.push(add(p, times(add(v, w), 1 / (2 * cosHalf * cosHalf))));
    wedge.push(add(p, w));
    emit(wedge);
  }
}
function outlines(m: Runtime, shapes: Shape[], tolerance: number) {
  const sections: InstanceType<Runtime["CrossSection"]>[] = [];
  let count = 0,
    strokeVertices = 0;
  try {
    for (const { data, matrix, style } of shapes) {
      const tol = tolerance / stretch(matrix);
      const subs = flatten(data, tol, () => {
        if (++count > 5000) fail("flattened path limit exceeded.");
      });
      if (style.fill) {
        const polys = subs
          .filter((s) => {
            if (s.points.length < 3) return false;
            if (s.closed) return true;
            const a = s.points[0],
              axis = sub(s.points[1], a);
            return s.points.some((p) => cross(axis, sub(p, a)) !== 0);
          })
          .map((s) => s.points.map((p) => xy(matrix, p)));
        if (subs.some((s) => s.closed && s.points.length < 3))
          fail("closed contour falls below the outline resolution.");
        // Validate each contour before combining it with others. A microscopic
        // counter can disappear at the boolean engine's precision while its
        // containing shape still returns a perfectly valid positive area.
        for (const polygon of polys) {
          const one = new m.CrossSection([polygon], style.rule);
          const empty = one.isEmpty();
          one.delete();
          if (empty)
            fail(
              "filled contour is degenerate or below the outline resolution.",
            );
        }
        if (polys.length) sections.push(new m.CrossSection(polys, style.rule));
      }
      if (style.stroke && style.width > 0) {
        const pieces: Point[][] = [];
        for (const path of subs)
          strokePieces(path, style, tol, (p) => {
            strokeVertices += p.length;
            if (strokeVertices > 40000) fail("stroke outline limit exceeded.");
            const polygon = p.map((v) => xy(matrix, v));
            if (signedArea(polygon) < 0) polygon.reverse();
            pieces.push(polygon);
          });
        if (pieces.length) sections.push(new m.CrossSection(pieces, "NonZero"));
      }
    }
    if (!sections.length) fail("no visible vector outlines.");
    const union = m.CrossSection.union(sections);
    try {
      if (union.isEmpty()) fail("no filled area.");
      if (union.numVert() > 2048)
        fail("combined outline exceeds 2,048 vertices.");
      return union.toPolygons();
    } finally {
      union.delete();
    }
  } finally {
    for (const s of sections) s.delete();
  }
}

// Canonical contours from the boolean union are simple and disjoint. Adjacent
// nesting levels bound a wall or a counter. Sibling islands bound an air gap.
function contains(poly: Point[], [x, y]: Point) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
function contourTree(paths: Point[][]) {
  const areas = paths.map((p) => Math.abs(signedArea(p)));
  const parents = paths.map((p, i) => {
    let parent = -1;
    for (let j = 0; j < paths.length; j++)
      if (
        areas[j] > areas[i] &&
        (parent < 0 || areas[j] < areas[parent]) &&
        contains(paths[j], p[0])
      )
        parent = j;
    return parent;
  });
  return parents.map((parent) => {
    let depth = 0;
    for (let a = parent; a >= 0; a = parents[a]) depth++;
    return { parent, solid: depth % 2 === 0 };
  });
}
// The closest points on disjoint polygon edges include at least one endpoint.
function clearance(a: Point[], b: Point[]) {
  let best = Infinity;
  function distances(vertices: Point[], edges: Point[]) {
    for (let i = 0; i < edges.length; i++) {
      const [x, y] = edges[i],
        q = edges[(i + 1) % edges.length],
        dx = q[0] - x,
        dy = q[1] - y,
        den = dx * dx + dy * dy;
      for (const [vx, vy] of vertices) {
        const x0 = vx - x,
          y0 = vy - y;
        const t = den ? Math.max(0, Math.min(1, (x0 * dx + y0 * dy) / den)) : 0;
        best = Math.min(best, (x0 - t * dx) ** 2 + (y0 - t * dy) ** 2);
      }
    }
  }
  distances(a, b);
  distances(b, a);
  return Math.sqrt(best);
}
// A bottleneck is a locally shortest chord between two non-neighboring
// boundary portions. At least one end of a shortest polygonal chord is a
// vertex. Moving either way from that vertex must not shorten the chord.
function bottlenecks(poly: Point[], solid: boolean) {
  let stroke = Infinity,
    gap = Infinity;
  const n = poly.length;
  const localMinimum = (i: number, dx: number, dy: number) => {
    const [x, y] = poly[i],
      a = poly[(i + n - 1) % n],
      b = poly[(i + 1) % n];
    return (
      (a[0] - x) * dx + (a[1] - y) * dy <= 1e-12 &&
      (b[0] - x) * dx + (b[1] - y) * dy <= 1e-12
    );
  };
  for (let i = 0; i < n; i++) {
    const [x, y] = poly[i];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      if (i === j || i === k) continue;
      const a = poly[j],
        b = poly[k],
        ex = b[0] - a[0],
        ey = b[1] - a[1];
      const den = ex * ex + ey * ey;
      if (!den) continue;
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / den),
      );
      const dx = a[0] + t * ex - x,
        dy = a[1] + t * ey - y;
      if (!localMinimum(i, dx, dy)) continue;
      if (
        (t === 0 && !localMinimum(j, -dx, -dy)) ||
        (t === 1 && !localMinimum(k, -dx, -dy))
      )
        continue;
      const width = Math.hypot(dx, dy);
      if (width >= Math.max(stroke, gap)) continue;
      const material = contains(poly, [x + dx / 2, y + dy / 2]) === solid;
      if (material) stroke = Math.min(stroke, width);
      else gap = Math.min(gap, width);
    }
  }
  return { stroke, gap };
}
function topology(tree: ReturnType<typeof contourTree>) {
  function children(parent: number): string {
    return (
      "(" +
      tree
        .flatMap((node, i) => (node.parent === parent ? [children(i)] : []))
        .sort()
        .join("") +
      ")"
    );
  }
  return children(-1);
}
function measureTile(paths: Point[][], tree: ReturnType<typeof contourTree>) {
  const all = measureFeatures(paths);

  let stroke = all.minStrokeMm ?? Infinity,
    gap = all.minGapMm ?? Infinity;
  for (let i = 0; i < paths.length; i++) {
    const { solid, parent } = tree[i];
    const bottleneck = bottlenecks(paths[i], solid);
    stroke = Math.min(stroke, bottleneck.stroke);
    gap = Math.min(gap, bottleneck.gap);
    const width =
      paths.length === 1
        ? all.minStrokeMm
        : measureFeatures([paths[i]]).minStrokeMm;
    if (width === null)
      fail(
        "a contour has no measurable opposing walls. Revise the source outline.",
      );
    if (solid) stroke = Math.min(stroke, width);
    else gap = Math.min(gap, width);
    for (let j = 0; j < i; j++) {
      let material: boolean;
      if (parent === j) material = tree[j].solid;
      else if (tree[j].parent === i) material = solid;
      else if (tree[j].parent === parent) material = !solid;
      else continue;
      const d = clearance(paths[i], paths[j]);
      if (material) stroke = Math.min(stroke, d);
      else gap = Math.min(gap, d);
    }
  }
  return {
    minStrokeMm: Number.isFinite(stroke) ? stroke : null,
    minGapMm: Number.isFinite(gap) ? gap : null,
  };
}

const method =
  "Eight-direction opposing-wall calipers with local bottleneck chords and nearest distances between separate contours on the quantized outline; pointed terminals and unsampled irregular walls unverified.";
const quantize = (n: number) => Math.round(n * 1000) / 1000;
export async function compileLocalSVG(svg: string, options: {seatMm?: number} = {}) {
  const { shapes, viewport } = read(svg);
  const source = estimatedBounds(shapes),
    estimate = extent(source);
  if (!(estimate > 0 && Number.isFinite(estimate) && estimate <= 1e8))
    fail("empty or excessive artwork bounds.");
  const m = await initGeometry();
  // Normalize before integer polygon clipping. SVG user units may be microns
  // or millions of units wide; source units must not determine precision.
  const factor = 100 / estimate;
  for (const shape of shapes) {
    const [a, b, c, d, e, f] = shape.matrix;
    shape.matrix = [
      a * factor,
      b * factor,
      c * factor,
      d * factor,
      (e - source.x0) * factor,
      (f - source.y0) * factor,
    ];
  }
  if (viewport) {
    viewport.x0 = (viewport.x0 - source.x0) * factor;
    viewport.x1 = (viewport.x1 - source.x0) * factor;
    viewport.y0 = (viewport.y0 - source.y0) * factor;
    viewport.y1 = (viewport.y1 - source.y0) * factor;
  }
  let tolerance = (100 * 0.012) / maxTile;
  let raw = outlines(m, shapes, tolerance),
    b = bounds(raw.flat()),
    span = extent(b);
  // A loose transformed control box (or cancellation under a fill-rule) can
  // greatly overestimate the visible extent. Refine using the painted bounds.
  if ((tolerance * maxTile) / span > 0.02) {
    tolerance = (span * 0.009) / maxTile;
    raw = outlines(m, shapes, tolerance);
    b = bounds(raw.flat());
    span = extent(b);
  }
  if (!(span > 0 && (tolerance * maxTile) / span <= 0.029))
    fail("cannot resolve the artwork at 0.03 mm tolerance.");
  if (viewport) {
    const eps = tolerance + 1e-8;
    if (
      b.x0 < viewport.x0 - eps ||
      b.y0 < viewport.y0 - eps ||
      b.x1 > viewport.x1 + eps ||
      b.y1 > viewport.y1 + eps
    )
      fail(
        "artwork extends beyond the viewport. Crop or expand the viewBox first.",
      );
  }
  // At the fixed seat only, discard isolated exterior islands smaller than
  // one micron in BOTH dimensions. Never remove counters or enclosed islands.
  // This handles sub-resolution artifacts at nearly closed curve joins.
  let discardedSubmicronIslands = 0;
  if(options.seatMm) {
    const tree=contourTree(raw), physicalScale=options.seatMm/span;
    raw=raw.filter((p,i)=>{
      const tiny=tree[i].parent===-1&&!tree.some(t=>t.parent===i)&&extent(bounds(p))*physicalScale<.001;
      if(tiny) discardedSubmicronIslands++;
      return !tiny;
    });
  }
  const originalTree = contourTree(raw),
    expectedTopology = topology(originalTree);
  if(options.seatMm !== undefined && options.seatMm !== 12.5) fail("unsupported logo seat size");
  const sizes = options.seatMm ? [options.seatMm] : [10, 14, 16, 18, 22];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i],
      scale = size / span;
    // SVG Y grows downward. The physical tile faces upward in model coordinates.
    const rounded = raw.map((p) =>
      p.map(
        ([x, y]): Point => [
          Math.round((x - b.x0) * scale * 1000),
          Math.round((b.y1 - y) * scale * 1000),
        ],
      ),
    );
    // Canonicalize on the integer micron grid; a new off-grid vertex signals
    // an intersection introduced by rounding. Compare containment before
    // and after that boolean operation, independently of contour ordering.
    const check = new m.CrossSection(rounded, "EvenOdd");
    const canonical = check.toPolygons();
    check.delete();
    const tree = contourTree(canonical),
      roundedTree = contourTree(rounded);
    const preserved =
      canonical.length === raw.length &&
      rounded.every(
        (p, i) =>
          Math.abs(signedArea(p)) > 0 &&
          roundedTree[i].parent === originalTree[i].parent,
      ) &&
      topology(tree) === expectedTopology &&
      canonical.every((p) =>
        p.every((q) => q.every((n) => Math.abs(n - Math.round(n)) < 1e-6)),
      );
    if (!preserved) {
      if (!options.seatMm && i === sizes.length - 1 && size < maxTile)
        sizes.push(Math.min(maxTile, size * 2));
      continue;
    }
    const paths = canonical.map((p) =>
      p.map(([x, y]): Point => [Math.round(x) / 1000, Math.round(y) / 1000]),
    );
    const features = measureTile(paths, tree);
    const { minStrokeMm: stroke, minGapMm: gap } = features;
    if (
      options.seatMm || stroke !== null &&
      stroke >= 0.8 - 1e-9 &&
      (gap === null || gap >= 0.6 - 1e-9)
    ) {
      return {
        paths,
        width: quantize((b.x1 - b.x0) * scale),
        height: quantize((b.y1 - b.y0) * scale),
        fillRule: "EvenOdd" as const,
        measurements: {
          startMm: options.seatMm ?? 10,
          sizeMm: size,
          ...features,
          curveToleranceMm: 0.03,
          quantumMm: 0.001,
          method,
          discardedSubmicronIslands,
          qualified: false as const,
        },
      };
    }
    if (!options.seatMm && i === sizes.length - 1 && size < maxTile) {
      const ratio = Math.max(
        stroke === null || stroke <= 0 ? 2 : 0.801 / stroke,
        gap === null ? 1 : gap <= 0 ? 2 : 0.601 / gap,
      );
      sizes.push(
        Math.min(maxTile, Math.max(size + 1, Math.ceil(size * ratio))),
      );
    }
  }
  fail(
    "features cannot meet a measured 0.80 mm stroke and 0.60 mm gap within the supported logo size. Simplify the source outlines.",
  );
}
