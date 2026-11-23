import { demoBundle } from "./demo";
import { readFile } from 'node:fs/promises';
import { beforeEach, expect, it } from 'vitest';
import { buildPlan, contrastRatio, legacyRecipe as defaultRecipe, selectDefaultIdentity } from '@vibeskyline/core';
import { generateGeometry } from '@vibeskyline/geometry';
import { themes } from '@vibeskyline/registry';
import type { SourceSeries } from '@vibeskyline/contracts';
import { useStudio } from './store';
const source=(provider:'github'|'gitee'|'gitlab',value:string):SourceSeries=>({...demoBundle().sources[0],id:provider,client:provider,sample:false,publicIdentity:{provider,kind:'username',value,provenance:'explicit-public-handle'}});
beforeEach(()=>useStudio.setState({bundle:demoBundle(),recipe:defaultRecipe,nameMode:'source',theme:'porcelain',identities:{},activeSourceId:'github'}));
it('bundle updates honor a valid explicit active source and its identity',()=>{
 const s=useStudio.getState();
 s.selectSource('gitee');s.patch({name:'custom-gitee',year:2025});s.selectSource('github');
 s.set({bundle:{...demoBundle(),sources:[source('github','synthetic-github'),source('gitee','synthetic-gitee')]},activeSourceId:'gitee'});
 expect(useStudio.getState().activeSourceId).toBe('gitee');
 expect(useStudio.getState().recipe).toMatchObject({name:'custom-gitee',year:2025});
});
it('invalid explicit source falls back to the surviving selection, then the first source',()=>{
 const s=useStudio.getState();s.selectSource('gitee');
 s.set({bundle:demoBundle(),activeSourceId:'missing'});
 expect(useStudio.getState().activeSourceId).toBe('gitee');
 s.set({bundle:{...demoBundle(),sources:[source('github','synthetic-github')]},activeSourceId:'missing'});
 expect(useStudio.getState().activeSourceId).toBe('github');
});
it('IDs and years belong to the selected source and never follow another model',()=>{
 const s=useStudio.getState();s.set({bundle:{...demoBundle(),sources:[source('gitee','synthetic-gitee'),source('github','synthetic-github')]}});
 s.selectSource('gitee');expect(useStudio.getState().recipe.name).toBe('synthetic-gitee');
 s.patch({name:'custom-gitee',year:2025});s.selectSource('github');
 expect(useStudio.getState().recipe.name).toBe('synthetic-github');expect(useStudio.getState().recipe.year).toBe(2026);
 s.selectSource('gitee');expect(useStudio.getState().recipe.name).toBe('custom-gitee');expect(useStudio.getState().recipe.year).toBe(2025);
 s.useSourceName();expect(useStudio.getState().recipe.name).toBe('synthetic-gitee');
 s.selectSource('github');s.selectSource('gitee');expect(useStudio.getState().recipe.name).toBe('synthetic-gitee');
});
it('private-looking scope canaries are never inferred as identity',()=>{
 for(const scope of ['CANARY@example.test','/private/CANARY','sk-CANARY-secret','host.example.test','session-CANARY','account-123']){
  const s={...demoBundle().sources[1],sample:false,scopeId:scope};expect(selectDefaultIdentity([s]).name).toBe('skyline-demo');useStudio.getState().set({bundle:{...demoBundle(),sources:[s]}});expect(useStudio.getState().recipe.name).toBe('skyline-demo');
 }
});
it('a color override releases only its role; it does not recolor or merge other physical spools',()=>{
 const original=useStudio.getState().recipe;
 useStudio.getState().patch({textColor:'#123456',resolution:'unresolved'});const r=useStudio.getState().recipe;
 expect(r.textColor).toBe('#123456');expect(r.slotAssignments?.text).toBeUndefined();expect(r.slotAssignments?.logo).toBe(original.slotAssignments?.logo);expect(r.colors).toEqual(original.colors);expect(r.baseColor).toBe(original.baseColor);
 useStudio.getState().patch({resolution:'share-district'});expect(useStudio.getState().recipe.slotAssignments).toBeUndefined();
});
it('source changes preserve a custom palette and never silently resolve capacity',()=>{
 useStudio.getState().patch({textColor:'#123456'});const before=useStudio.getState().recipe;
 useStudio.getState().set({bundle:{...demoBundle(),sources:[source('github','synthetic-github')]}});
 expect(useStudio.getState().recipe.textColor).toBe(before.textColor);expect(useStudio.getState().recipe.colors).toEqual(before.colors);
});

it('adding or reordering sources reuses matching slots without altering a palette override',()=>{
 const initial=useStudio.getState().recipe;
 useStudio.getState().set({bundle:{...demoBundle(),sources:[source('gitee','synthetic-gitee')]}});
 let r=useStudio.getState().recipe;expect(r.slotAssignments?.['source:gitee']).toBe(r.slotAssignments?.text);expect(r.colors).toEqual(initial.colors);
 useStudio.getState().set({bundle:{...demoBundle(),sources:[source('gitee','synthetic-gitee'),source('github','synthetic-github')]}});
 r=useStudio.getState().recipe;expect(r.slotAssignments).toBeUndefined();expect(r.slotAssignments?.base).toBe(initial.slotAssignments?.base);
});

const font = Uint8Array.from(await readFile(new URL('../../../packages/geometry/assets/VibeSkylineGrid-Regular.ttf', import.meta.url))).buffer;
function sparseDemo() {
 const bundle = demoBundle();
 for (const source of bundle.sources) source.days = source.days.map((day, i) => ({
  ...day, value: i === 0 ? 3 : 0, state: i === 0 ? 'observed' : 'known-zero',
 }));
 return bundle;
}
function geometry() {
 const { bundle, recipe } = useStudio.getState();
 return generateGeometry(buildPlan(bundle, recipe), font);
}

it.each(themes)('fresh $id theme generates at most four physical materials with readable text', async theme => {
 useStudio.getState().set({ bundle: sparseDemo() });
 useStudio.getState().setTheme(theme.id);
 const g = await geometry();
 expect(g.budget.count).toBeLessThanOrEqual(4);
 expect(g.budget.overCapacity).toBe(false);
 expect(contrastRatio(g.plan.recipe.baseColor, g.plan.recipe.textColor)).toBeGreaterThanOrEqual(3);
});

it.each(themes.flatMap(theme => [
 { theme: theme.id, tier: 'mono' as const, count: 1 },
 { theme: theme.id, tier: 'two-tone' as const, count: 2 },
]))('$tier stays at $count physical materials after switching to $theme', async ({ theme, tier, count }) => {
 useStudio.getState().set({ bundle: sparseDemo() });
 useStudio.getState().patch({ tier });
 useStudio.getState().setTheme(theme);
 const g = await geometry();
 expect(g.plan.recipe.tier).toBe(tier);
 expect(g.budget.count).toBe(count);
 expect(g.budget.overCapacity).toBe(false);
});

it('removing GitHub after sharing identity and applying slot defaults keeps effective colors compatible', async () => {
 const bundle = sparseDemo();
 useStudio.getState().set({ bundle });
 useStudio.getState().patch({ resolution: 'share-identity' });
 // The UI's four-slot defaults for the effective shared-identity colors.
 useStudio.getState().patch({ slotAssignments: { base: 1, text: 1, logo: 1, 'source:github': 2, 'source:gitee': 3, 'source:gitlab': 4 } });
 const before = useStudio.getState().recipe;
 useStudio.getState().set({ bundle: { ...bundle, sources: bundle.sources.slice(1) } });
 const g = await geometry();
 expect(g.budget.count).toBe(3);
 expect(g.budget.overCapacity).toBe(false);
 expect(g.budget.materials.map(m => m.color).sort()).toEqual(['#2F5D8C', '#D96B43', '#EFECE6']);
 expect(g.budget.materials.find(m => m.slot === 1)?.roleKeys).toEqual(['base', 'text', 'logo']);
 expect(useStudio.getState().recipe.colors).toEqual(before.colors);
 expect(useStudio.getState().recipe.textColor).toBe(before.textColor);
});

it('reordering and removing sources preserve separate physical spools with the same effective color', async () => {
 const bundle = sparseDemo();
 useStudio.getState().set({ bundle });
 // Mono hides the raw palette differences, but an explicit physical spool remains distinct.
 useStudio.getState().patch({ tier: 'mono' });
 useStudio.getState().patch({ slotAssignments: { base: 1, text: 1, logo: 1, 'source:github': 2, 'source:gitee': 3, 'source:gitlab': 4 } });
 useStudio.getState().set({ bundle: { ...bundle, sources: [bundle.sources[2], bundle.sources[0], bundle.sources[1]] } });
 let g = await geometry();
 expect(g.budget.count).toBe(4);
 expect(g.budget.materials.find(m => m.roleKeys?.includes('source:gitee'))?.slot).toBe(3);
 expect(g.budget.materials.find(m => m.roleKeys?.includes('source:gitlab'))?.slot).toBe(4);
 expect(new Set(g.budget.materials.map(m => m.color)).size).toBe(1);
 useStudio.getState().set({ bundle: { ...bundle, sources: [bundle.sources[2], bundle.sources[1]] } });
 g = await geometry();
 expect(g.budget.count).toBe(3);
 expect(g.budget.materials.find(m => m.roleKeys?.includes('source:gitee'))?.slot).toBe(3);
 expect(g.budget.materials.find(m => m.roleKeys?.includes('source:gitlab'))?.slot).toBe(4);
});

it('a custom text color remains a fifth material without a hardware capacity limit', async () => {
 useStudio.getState().set({ bundle: sparseDemo() });
 useStudio.getState().patch({ textColor: '#123456' });
 const g = await geometry();
 expect(g.plan.recipe.textColor).toBe('#123456');
 expect(g.budget.materials.find(m => m.roleKeys?.includes('text'))?.color).toBe('#123456');
 expect(g.budget.count).toBe(5);
 expect(g.budget.overCapacity).toBe(false);
 expect(useStudio.getState().recipe.resolution).toBe('unresolved');
});

it('clearing sources and selecting a theme allows a new Mono source without stale slots', async () => {
 const bundle = sparseDemo();
 useStudio.getState().set({ bundle });
 useStudio.getState().patch({ tier: 'mono' });
 useStudio.getState().set({ bundle: { ...bundle, sources: [] } });
 useStudio.getState().setTheme('obsidian');
 useStudio.getState().set({ bundle: { ...bundle, sources: bundle.sources.slice(0, 1) } });
 const g = await geometry();
 expect(g.budget.count).toBe(1);
 expect(g.budget.materials[0].color).toBe('#181C22');
});

it('keeps a Gitee override on the generated Gitee material across removal, reordering and demo reload', async () => {
 const bundle = sparseDemo();
 const [github, gitee, gitlab] = bundle.sources;
 const studio = useStudio.getState();
 studio.set({ bundle });
 studio.patch({ sourceColors: { gitee: '#123456' }, resolution: 'unresolved' });
 studio.patch({ slotAssignments: { ...useStudio.getState().recipe.slotAssignments, 'source:gitee': 3 } });
 for (const sources of [[gitee, gitlab], [gitlab, gitee, github]]) {
  studio.set({ bundle: { ...bundle, sources } });
  const g = await geometry();
  expect(g.plan.districts.find(d => d.id === 'gitee')?.color).toBe('#123456');
  expect(g.regions.find(r => r.roleKeys?.includes('source:gitee'))).toMatchObject({color: '#123456', slot: 3});
  expect(g.regions.find(r => r.roleKeys?.includes('source:gitlab'))?.color).not.toBe('#123456');
 }
 studio.loadDemo();
 expect(buildPlan(useStudio.getState().bundle, useStudio.getState().recipe).districts[1].color).toBe('#123456');
 studio.setTheme('obsidian');
 expect(buildPlan(useStudio.getState().bundle, useStudio.getState().recipe).districts[1].color).toBe('#F77F00');
});

it('editing shared text preserves the other rendered colors and custom physical spools', async () => {
 const studio = useStudio.getState();
 studio.set({ bundle: sparseDemo() });
 studio.patch({ logoColor: '#654321' });
 studio.patch({ resolution: 'share-district' });
 const otherSpools = { base: 4, 'source:github': 3, logo: 3, 'source:gitee': 2, 'source:gitlab': 1 };
 studio.patch({ slotAssignments: { ...otherSpools, text: 3 } });
 studio.patch({ textColor: '#123456', resolution: 'unresolved' });
 const g = await geometry();
 expect(useStudio.getState().recipe.slotAssignments).toEqual(otherSpools);
 const materialFor = (role: string) => g.regions.find(r => r.roleKeys?.includes(role));
 expect(materialFor('base')).toMatchObject({ color: '#EFECE6', slot: 4 });
 expect(materialFor('source:github')).toMatchObject({ color: '#2F5D8C', slot: 3 });
 expect(materialFor('logo')).toBe(materialFor('source:github'));
 expect(materialFor('source:gitee')).toMatchObject({ color: '#D96B43', slot: 2 });
 expect(materialFor('source:gitlab')).toMatchObject({ color: '#3A7D6B', slot: 1 });
 expect(materialFor('text')?.color).toBe('#123456');
 expect(materialFor('text')?.slot).toBeUndefined();
 expect(g.budget.count).toBe(5);
 expect(g.budget.overCapacity).toBe(false);
});

it('preserves a merged district color when a different source is edited', async () => {
 const studio = useStudio.getState();
 studio.set({ bundle: sparseDemo() });
 studio.patch({ resolution: 'merge-sources' });
 studio.patch({ sourceColors: { gitlab: '#123456' }, resolution: 'unresolved' });
 const g = await geometry();
 expect(g.regions.find(r => r.roleKeys?.includes('source:gitee'))?.color).toBe('#2F5D8C');
 expect(g.regions.find(r => r.roleKeys?.includes('source:gitlab'))?.color).toBe('#123456');
});

it('valid source IDs that match prototype properties get neutral identity',()=>{
 const b=demoBundle(2026,1);b.sources[0].id='constructor';
 const s=useStudio.getState();s.set({bundle:b});s.selectSource('constructor');
 expect(useStudio.getState().recipe.name).toBe('skyline-demo');expect(useStudio.getState().nameMode).toBe('source');
 s.patch({name:'custom-id'});expect(useStudio.getState().recipe.name).toBe('custom-id');
});

it('logo mode belongs to each source, including newly loaded bundles',()=>{
 const s=useStudio.getState();
 s.patch({logoMode:'neutral'});s.selectSource('gitee');
 expect(useStudio.getState().recipe.logoMode).toBe('brand');
 s.patch({logoMode:'none'});s.selectSource('github');
 expect(useStudio.getState().recipe.logoMode).toBe('neutral');
 s.set({bundle:{...demoBundle(),sources:[source('gitlab','synthetic-gitlab')]}});
 expect(useStudio.getState().recipe.logoMode).toBe('brand');
});
