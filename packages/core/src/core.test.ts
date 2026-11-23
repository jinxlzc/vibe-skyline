import { it, expect } from "vitest";
import fc from "fast-check";
import { buildPlan, legacyRecipe as defaultRecipe, demoBundle, grid, heights, themeIdentity, contrastRatio, defaultThemePlan } from "./index";
it("Sunday/Monday grid changes and 53/54 columns", () => {
  expect(grid(2000, "sunday").columns).toBe(54);
  expect(grid(2012, "monday").columns).toBe(54);
  expect(grid(2026, "sunday").columns).toBe(53);
  expect(grid(2026, "monday").offset).not.toBe(grid(2026, "sunday").offset);
});
it("1–6 source dimensions and no silent palette merge", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 6 }),
      fc.constantFrom("sunday" as const, "monday" as const),
      (n, weekStart) => {
        const b = demoBundle();
        while (b.sources.length < n)
          b.sources.push({ ...b.sources[0], id: "extra-" + b.sources.length });
        b.sources = b.sources.slice(0, n);
        const p = buildPlan(b, { ...defaultRecipe, weekStart });
        expect(p.width).toBeCloseTo(171.8);
        expect(p.depth).toBeCloseTo(16 + n * 19.6 + (n - 1) * 4.2 + 4);
        expect(p).not.toHaveProperty("fitsA1");
        expect(p.sourceCount).toBe(n);
      },
    ),
  );
  const b = demoBundle();
  expect(buildPlan(b, defaultRecipe).materialColors).toHaveLength(4);
  expect(
    buildPlan(b, { ...defaultRecipe, resolution: "merge-identity" }).materialColors,
  ).toHaveLength(3);
  expect(
    buildPlan(b, { ...defaultRecipe, tier: "two-tone" }).materialColors,
  ).toHaveLength(2);
});
it("normalization caps P95 and quantizes, known zero stays zero", () => {
  const s = demoBundle().sources[0],
    h = heights(s, 18, 0.78);
  expect(h(0)).toBe(0);
  expect(h(1e9)).toBe(18);
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1e9 }), (v) => {
      expect(h(v)).toBeGreaterThanOrEqual(0.8);
      expect(h(v) / 0.2).toBeCloseTo(Math.round(h(v) / 0.2));
    }),
  );
});
it("Two-Tone preserves the two selected materials after a multi-color base-sharing choice", () => {
  const p = buildPlan(demoBundle(), {
    ...defaultRecipe,
    tier: "two-tone",
    resolution: "share-base",
  });
  expect(p.recipe.baseColor).toBe(defaultRecipe.baseColor.toUpperCase());
  expect(p.materialColors).toHaveLength(2);
});

import {themes} from '@vibeskyline/registry';
it('theme identity contrast is deterministic and sharing never happens implicitly',()=>{
 for(const theme of themes){const color=themeIdentity(theme);expect(color).not.toBe(theme.base);expect(contrastRatio(theme.base,color)).toBeGreaterThanOrEqual(3);expect(color).toBe(themeIdentity(theme));}
 const b=demoBundle(),p=buildPlan(b,defaultRecipe);expect(p.recipe.textColor).not.toBe(p.recipe.baseColor);expect(p.materialColors).toHaveLength(4);
 const shared=buildPlan(b,{...defaultRecipe,resolution:'share-identity'});expect(shared.recipe.textColor).toBe(shared.recipe.baseColor);expect(shared.materialColors).toHaveLength(4);
 const four=buildPlan(b,{...defaultRecipe,resolution:'merge-identity'});expect(four.materialColors).toHaveLength(3);expect(four.recipe.colors[0]).toBe(four.recipe.colors[1]);expect(contrastRatio(four.recipe.baseColor,four.recipe.textColor)).toBeGreaterThanOrEqual(3);
});

it('themes retain their chosen colors with contrasting text and no source merge',()=>{
 for(const theme of themes){const recipe={...defaultRecipe,...defaultThemePlan(theme)},p=buildPlan(demoBundle(),recipe);expect(p.materialColors.length).toBeLessThanOrEqual(4);expect(p.depth).toBeCloseTo(87.2);expect(contrastRatio(p.recipe.baseColor,p.recipe.textColor)).toBeGreaterThanOrEqual(3);expect(recipe.slotAssignments).toBeUndefined();expect(p.recipe.colors).toEqual(theme.colors.map(c=>c.toUpperCase()));}
 expect(defaultRecipe.name).toBe('skyline-demo');expect(demoBundle().sources.map(s=>s.id)).toEqual(['github','codex','gemini']);
 const override={...defaultRecipe,textColor:'#123456',logoColor:'#654321',slotAssignments:undefined};expect(buildPlan(demoBundle(),override).materialColors.length).toBeGreaterThan(4);expect(buildPlan(demoBundle(),override).recipe.textColor).toBe('#123456');
});
