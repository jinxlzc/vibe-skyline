import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { themes } from "../../registry/src/index";
import { buildPlan, legacyRecipe as defaultRecipe, demoBundle } from "../../core/src/index";
import { exportSTL, readSTL } from "../../exporters/stl/src/index";
import { export3MF, validate3MF } from "../../exporters/three-mf/src/index";
import { generateGeometry, validateMesh } from "./index";

it("triangulates aligned neutral tile and tower edges for Float32 STL and 3MF", async () => {
  const obsidian = themes.find((t) => t.id === "obsidian")!;
  const plan = buildPlan(demoBundle(2024,4), {
    ...defaultRecipe, slotAssignments: undefined,
    name: "SYNTHETIC-DEMO",
    year: 2024,
    weekStart: "monday",
    logoMode: "neutral",
    baseColor: obsidian.base,
    textColor: obsidian.base,
    logoColor: obsidian.base,
    colors: obsidian.colors,
    resolution: "share-base",
  });
  const bytes = Uint8Array.from(
    await readFile(new URL("../assets/Lato-Bold.ttf", import.meta.url)),
  ).buffer;
  const geometry = await generateGeometry(plan, bytes);
  expect(validateMesh(geometry.mono, geometry.plan).errors).toEqual([]);
  for (const region of geometry.regions)
    expect(validateMesh(region.mesh, undefined, false).errors).toEqual([]);
  expect(
    validateMesh(readSTL(exportSTL(geometry.mono)), geometry.plan).errors,
  ).toEqual([]);
  expect(validate3MF(export3MF(geometry)).budget.count).toBe(4);
}, 120000);
