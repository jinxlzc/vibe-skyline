import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import {
  activityPrompt,
  activitySchema,
  syntheticActivity,
  parseActivityFile,
  MAX_ACTIVITY_BYTES,
  localProtocolOrigin,
} from "./protocol";
import {
  buildPlan,
  legacyRecipe as defaultRecipe,
  demoBundle,
  migrateRecipe,
} from "../../core/src/index";
const clone = () => structuredClone(syntheticActivity) as any;
const parse = (x: unknown) => parseActivityFile(JSON.stringify(x));
it("internal schema, examples, offline archive and legacy prompt stay identical", () => {
  const pack = unzipSync(
    readFileSync(
      new URL(
        "../protocol/offline-pack.zip",
        import.meta.url,
      ),
    ),
  );
  expect(JSON.parse(strFromU8(pack["activity.schema.json"]))).toEqual(
    activitySchema,
  );
  expect(JSON.parse(strFromU8(pack["synthetic.bundle.json"]))).toEqual(
    syntheticActivity,
  );
  expect(parse(syntheticActivity).sources).toHaveLength(2);
  const prompt = activityPrompt("http://127.0.0.1:4173");
  expect(prompt).toContain("http://127.0.0.1:4173/protocol/v2/spec.md");
  expect(prompt).toContain("unreachable");
  expect(prompt).toContain("manually upload");
  expect(prompt).toContain("Never add those subsets again");
  expect(prompt).toContain("Do not scan unrelated private files");
  const embedded = prompt
    .split("\nSCHEMA\n")[1]
    .split("\nSYNTHETIC EXAMPLE (not real activity)\n");
  expect(JSON.parse(embedded[0])).toEqual(activitySchema);
  expect(parse(JSON.parse(embedded[1]))).toEqual(parse(syntheticActivity));
  for (const origin of [
    "http://localhost:5173",
    "http://192.168.1.5:4173",
    "http://10.0.0.1",
    "http://[::1]",
  ])
    expect(localProtocolOrigin(origin)).toBe(true);
  expect(activityPrompt("https://example.test")).toContain(
    "https://example.test/protocol/v2/spec.md",
  );
  expect(activityPrompt("null")).toContain("embedded schema");
});
it("unknown stays null, zero stays zero, cache is included in input, units survive normalization", () => {
  const b = parse(syntheticActivity),
    s = b.sources[0];
  expect(s.days.map((d) => d.value)).toEqual([150, 0, null]);
  expect(s.unit).toBe("token");
  expect(s.days[0].tokens!.in + s.days[0].tokens!.out).toBe(150);
  const p = buildPlan(b, defaultRecipe);
  expect(p.solids.some((s) => s.kind === "recess")).toBe(true);
  const bad = clone();
  bad.sources[0].days[0].value = 220;
  expect(() => parse(bad)).toThrow("/sources/0/days/0/tokens");
});
it.each([
  [
    "metric",
    (b: any): unknown => (b.sources[0].metric = "mystery"),
    "/sources/0/metric",
  ],
  [
    "unit",
    (b: any): unknown => (b.sources[0].unit = "event"),
    "/sources/0/unit",
  ],
  [
    "zero",
    (b: any): unknown => (b.sources[0].days[2].value = 0),
    "/sources/0/days/2/value",
  ],
  [
    "cache",
    (b: any): unknown => (b.sources[0].days[0].tokens.cacheRead = 200),
    "/sources/0/days/0/tokens",
  ],
  [
    "raw logs",
    (b: any): unknown => (b.sources[0].days[0].prompt = "private"),
    "/sources/0/days/0",
  ],
  [
    "url",
    (b: any): unknown => (b.sources[0].url = "https://example.invalid/log"),
    "/sources/0/url",
  ],
  [
    "script",
    (b: any): unknown => (b.sources[0].client = "<script>bad</script>"),
    "/sources/0/client",
  ],
  [
    "timezone",
    (b: any): unknown => (b.sources[0].calendar.timezone = "Mars/Olympus"),
    "/sources/0/calendar/timezone",
  ],
  [
    "coverage",
    (b: any): unknown => (b.sources[0].coverage = []),
    "/sources/0/days/0/date",
  ],
  [
    "reference",
    (b: any): unknown => (b.sources[0].provenanceIds = ["absent"]),
    "/sources/0/provenanceIds",
  ],
  [
    "excess records",
    (b: any): unknown =>
      (b.sources[0].days = Array(367).fill(b.sources[0].days[0])),
    "/sources/0/days",
  ],
  [
    "unsupported version",
    (b: any): unknown => (b.schema = "vibeskyline.activity.v3"),
    "/schema",
  ],
] as const)("rejects %s with located safe errors", (_, mutate, path) => {
  const b = clone();
  mutate(b);
  expect(() => parse(b)).toThrow(path);
});
it("rejects unsafe keys, oversize and excessive nesting before schema handling", () => {
  expect(() => parseActivityFile('{"__proto__":{}}')).toThrow("/: unsafe key");
  expect(() => parseActivityFile(" ".repeat(MAX_ACTIVITY_BYTES + 1))).toThrow(
    "/: file exceeds",
  );
  expect(() =>
    parseActivityFile('{"x":'.repeat(20) + "0" + "}".repeat(20)),
  ).toThrow("nesting limit");
});
it("strict v1 compatibility keeps missing timezone unknown and preserves source/name/color recipe migration", () => {
  const b = demoBundle();
  const loaded = parse(b);
  expect(loaded.sources[0].unit).toBe("contribution");
  expect(loaded.sources[0].calendar.timezone).toBeUndefined();
  const old = {
    ...defaultRecipe,
    name: "maker-demo",
    sourceColors: { github: "#123456" },
    slotAssignments: { base: 1, text: 2 },
    resolution: "unrestricted" as const,
  };
  const next = migrateRecipe(old, b);
  expect(next.name).toBe(old.name);
  expect(next.sourceColors!.github).toBe("#123456");
  expect(next.slotAssignments).toBeUndefined();
  expect(next.resolution).toBe("unresolved");
  expect(defaultRecipe.slotAssignments).toBeUndefined();
  expect(buildPlan(b, next)).not.toHaveProperty("margins");
  const bad: any = demoBundle();
  bad.sources[0].rawLog = "no";
  expect(() => parse(bad)).toThrow("/sources/0");
});

it("v1 migration preserves a supplied timezone and rejects disguised raw fields", () => {
  const b: any = demoBundle();
  b.sources[0].calendar.timezone = "Asia/Shanghai";
  expect(parse(b).sources[0].calendar.timezone).toBe("Asia/Shanghai");
  b.sources[0].scopeId = { prompt: "not daily data" };
  expect(() => parse(b)).toThrow("/sources/0/scopeId");
});

it("malformed v1 metadata always has a located error without echoing its value", () => {
  for (const [edit, path] of [
    [
      (b: any) => {
        b.provenance = [null];
      },
      "/provenance/0",
    ],
    [
      (b: any) => {
        b.sources[0].calendar = "PRIVATE_CANARY";
      },
      "/sources/0/calendar",
    ],
    [
      (b: any) => {
        b.sources[0].metric = { toString: "PRIVATE_CANARY" };
      },
      "/sources/0/metric",
    ],
  ] as const) {
    const b = demoBundle();
    edit(b);
    expect(() => parse(b)).toThrow(path);
    try {
      parse(b);
    } catch (e) {
      expect(String(e)).not.toContain("PRIVATE_CANARY");
    }
  }
});
