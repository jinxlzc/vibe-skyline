import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  buildPlan,
  legacyRecipe as defaultRecipe,
  demoBundle,
  grid,
} from "../../core/src/index";
import { generateGeometry, validateMesh, validateSpatial } from "./index";
import { exportSTL, readSTL } from "../../exporters/stl/src/index";
import { export3MF, validate3MF } from "../../exporters/three-mf/src/index";
const font = await readFile(
  new URL("../assets/Lato-Bold.ttf", import.meta.url),
);
const fontBytes = font.buffer.slice(
  font.byteOffset,
  font.byteOffset + font.byteLength,
);
it("1–6 sources × 53/54 columns × week starts: independent closed/oriented bounds/volume/connectivity checks", async () => {
  for (const n of [1, 2, 3, 4, 5, 6])
    for (const columns of [53, 54])
      for (const weekStart of ["sunday", "monday"] as const) {
        const year =
            columns === 53 ? 2026 : weekStart === "sunday" ? 2000 : 2012,
          b = demoBundle(year,4);
        while (b.sources.length < n)
          b.sources.push({ ...b.sources[0], id: "extra-" + b.sources.length });
        b.sources = b.sources.slice(0, n).map((s) => ({
          ...s,
          days: s.days.map((d, i) => ({
            ...d,
            value: i === 0 ? 8 : 0,
            state: i === 0 ? ("observed" as const) : ("known-zero" as const),
          })),
        }));
        const p = buildPlan(b, {
          ...defaultRecipe, slotAssignments: undefined,
          year,
          weekStart,
          name: "SYNTHETIC",
          logoMode: "neutral",
        });
        expect(grid(year, weekStart).columns).toBe(columns);
        const g = await generateGeometry(p, fontBytes);
        expect(validateSpatial([g.mono]).valid).toBe(true);
        expect(validateSpatial(g.regions.map((r) => r.mesh)).valid).toBe(true);
        expect(validateMesh(g.mono, p)).toMatchObject({
          valid: true,
          components: 1,
        });
        expect(g.budget.totalVolumeCm3 * 1000).toBeCloseTo(
          validateMesh(g.mono).volume,
          1,
        );
      }
}, 120000);
it("dense specimen, recesses, identity, STL and Core 3MF round trip", async () => {
  const b = demoBundle(2026,4);
  b.sources[1].days = b.sources[1].days.slice(150, 180);
  const p = buildPlan(b, {
      ...defaultRecipe, slotAssignments: undefined,
      name: "STUDIO",
      resolution: "merge-identity",
    }),
    g = await generateGeometry(p, fontBytes);
  expect(validateMesh(g.mono, p).errors).toEqual([]);
  expect(validateMesh(readSTL(exportSTL(g.mono)), p).valid).toBe(true);
  expect(validate3MF(export3MF(g)).budget.count).toBe(4);
  expect(export3MF(g)).toEqual(export3MF(g));
  const bad = { ...g.mono, triangles: g.mono.triangles.slice(3) };
  expect(validateMesh(bad).valid).toBe(false);
  expect(() =>
    export3MF({ ...g, budget: { ...g.budget, overCapacity: true } }),
  ).not.toThrow();
}, 120000);
it("Two-Tone separates at 3.20 mm and a Latin-only font reports missing CJK glyphs", async () => {
  const p = buildPlan(demoBundle(2026,4), { ...defaultRecipe, slotAssignments: undefined, name: "STUDIO", tier: "two-tone", namePlacement: "rear" }),
    g = await generateGeometry(p, fontBytes);
  expect(g.regions).toHaveLength(2);
  const base = g.regions.find((r) => r.color === p.recipe.baseColor)!;
  expect(
    Math.max(...base.mesh.vertices.filter((_, i) => i % 3 === 2)),
  ).toBeCloseTo(3.2);
  await expect(
    generateGeometry(
      { ...p, recipe: { ...p.recipe, name: "中文" } },
      fontBytes,
    ),
  ).rejects.toThrow("CJK");
}, 120000);
it("unknown recess removes exactly 0.40 mm while known zero leaves the plinth intact", async () => {
  const bundle = demoBundle(2024,4);
  bundle.sources = bundle.sources.slice(0, 1);
  bundle.sources[0].days = bundle.sources[0].days.map((d) => ({
    ...d,
    value: 0,
    state: "known-zero",
  }));
  const recipe = {
    ...defaultRecipe, slotAssignments: undefined,
    year: 2024,
    tier: "mono" as const,
    logoMode: "none" as const,
    name: "",
  };
  const zero = await generateGeometry(buildPlan(bundle, recipe), fontBytes);
  bundle.sources[0].days[0] = {
    ...bundle.sources[0].days[0],
    value: null,
    state: "unknown",
    completeness: "unknown",
  };
  const unknown = await generateGeometry(buildPlan(bundle, recipe), fontBytes);
  expect(
    validateMesh(zero.mono).volume - validateMesh(unknown.mono).volume,
  ).toBeCloseTo(2.2 * 2.2 * 0.4, 3);
}, 120000);
