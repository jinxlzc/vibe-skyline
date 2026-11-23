import { demoBundle } from "./demo";
import { create } from "zustand";
import { buildPlan, buildSourcePlans, defaultRecipe, defaultThemePlan, selectDefaultIdentity } from "@vibeskyline/core";
import type { ActivityBundle, BuildRecipe } from "@vibeskyline/contracts";
import { themes } from "@vibeskyline/registry";
type State = {
  officialLogosEnabled: boolean;
  activeSourceId: string; identities: Record<string, Partial<BuildRecipe>>;
  selectSource: (id:string)=>void;
  bundle: ActivityBundle; recipe: BuildRecipe; theme: string; locale: "en" | "zh-CN";
  inputMode: "demo" | "calendar";
  studio: boolean; tab: string; nameMode: "source" | "manual";
  set: (s: Partial<State>) => void; patch: (r: Partial<BuildRecipe>) => void;
  setTheme: (id: string) => void; useSourceName: () => void; loadDemo: () => void;
};
function modelIdentity(identities: State['identities'], id:string):Partial<BuildRecipe> {
  return Object.hasOwn(identities,id) ? identities[id] : {};
}
function effectiveRoleColors(bundle: ActivityBundle, recipe: BuildRecipe): Record<string, string> {
  const plans = recipe.layout === "first-edition" ? buildSourcePlans(bundle,recipe) : [buildPlan(bundle,recipe)];
  const plan=plans[0];
  return {
    base: plan.recipe.baseColor,
    text: plan.recipe.textColor,
    logo: plan.recipe.logoColor,
    ...Object.fromEntries(plans.flatMap(p=>p.districts).map(d => ['source:' + d.id, d.color])),
  };
}
function sourceSlots(previous: State, next: ActivityBundle, recipe: BuildRecipe) {
  const slots = previous.recipe.slotAssignments;
  if (!slots) return undefined;
  if (!next.sources.length)
    return Object.fromEntries(Object.entries(slots).filter(([role]) => !role.startsWith('source:')));
  const oldColors = effectiveRoleColors(previous.bundle.sources.length ? previous.bundle : next, previous.recipe);
  const colors = effectiveRoleColors(next, recipe);
  const assigned: Record<string, number> = {};
  // Retain physical spool choices whenever a role's effective color survives,
  // even when a source moves or another spool has exactly the same color.
  for (const [role, color] of Object.entries(colors))
    if (slots[role] && oldColors[role] === color) assigned[role] = slots[role];
  for (const [role, color] of Object.entries(colors)) {
    // Unassigned identity overrides remain unassigned until explicitly resolved.
    if (assigned[role] || (!role.startsWith('source:') && !slots[role])) continue;
    const same = Object.keys(assigned).find(key => colors[key] === color);
    const slot = same ? assigned[same] : [1, 2, 3, 4].find(n => !Object.values(assigned).includes(n));
    if (slot) assigned[role] = slot;
  }
  return assigned;
}
// When a manual edit exits a sharing strategy, keep its visible colors on
// the other roles. Only districts whose color differs from their palette
// default need a named override.
function materializeSharing(bundle: ActivityBundle, recipe: BuildRecipe): BuildRecipe {
  const plans=recipe.layout === "first-edition" ? buildSourcePlans(bundle,recipe) : [buildPlan(bundle,recipe)];
  const rendered=plans[0].recipe, districts=plans.flatMap(p=>p.districts);
  const sourceColors = { ...recipe.sourceColors };
  districts.forEach(({ id, color }, i) => {
    if (Object.hasOwn(sourceColors, id) || color !== recipe.colors[i % recipe.colors.length].toUpperCase())
      sourceColors[id] = color;
  });
  return { ...recipe, sourceColors, baseColor: rendered.baseColor, textColor: rendered.textColor, logoColor: rendered.logoColor };
}

function patchRecipe(state: State, update: Partial<BuildRecipe>): BuildRecipe {
  const previous = state.recipe;
  const editingColor = update.baseColor !== undefined || update.textColor !== undefined ||
    update.logoColor !== undefined || update.sourceColors !== undefined || update.colors !== undefined;
  const changedStrategy = update.resolution !== undefined && update.resolution !== previous.resolution;
  const changedTier = update.tier !== undefined && update.tier !== previous.tier;
  const exitingSharing = editingColor && update.resolution === 'unresolved' && changedStrategy &&
    previous.tier === 'multi' && previous.resolution !== 'unrestricted' && state.bundle.sources.length > 0;
  const base = exitingSharing ? materializeSharing(state.bundle, previous) : previous;
  const next = { ...base, ...update };
  if (update.sourceColors) next.sourceColors = { ...base.sourceColors, ...update.sourceColors };
  if (update.slotAssignments !== undefined) return next;
  if (changedTier || (changedStrategy && !editingColor)) next.slotAssignments = undefined;
  else if (editingColor && previous.slotAssignments && state.bundle.sources.length) {
    const before = effectiveRoleColors(state.bundle, previous);
    const after = effectiveRoleColors(state.bundle, next);
    next.slotAssignments = Object.fromEntries(Object.entries(previous.slotAssignments)
      .filter(([role]) => before[role] === after[role]));
  }
  return next;
}

export const useStudio = create<State>((set,get) => ({
  officialLogosEnabled: true,
  activeSourceId: "github", identities: {},
  selectSource: (id)=>set(s=>({activeSourceId:id, recipe:{...s.recipe, year:s.bundle.year,logoMode:defaultRecipe.logoMode,...modelIdentity(s.identities,id),name:modelIdentity(s.identities,id)?.name??selectDefaultIdentity(s.bundle.sources.filter(x=>x.id===id)).name}, nameMode:modelIdentity(s.identities,id)?.name!==undefined?"manual":"source"})),
  bundle: demoBundle(), recipe: defaultRecipe, theme: "obsidian", locale: "en",
  studio: false, tab: "Sources", nameMode: "source", inputMode: "demo",
  set: (update) => set(s=>{
    if(!update.bundle) return update;
    const sources=update.bundle.sources;
    const active=[update.activeSourceId,s.activeSourceId].find(id=>sources.some(x=>x.id===id))??sources[0]?.id??"";
    const identity=modelIdentity(s.identities,active);
    return {...update,activeSourceId:active,recipe:{...s.recipe,...update.recipe,slotAssignments:sourceSlots(s,update.bundle,{...s.recipe,...update.recipe}),
      name:identity?.name??selectDefaultIdentity(update.bundle.sources.filter(x=>x.id===active)).name,
      year:identity?.year??update.bundle.year,logoMode:identity?.logoMode??defaultRecipe.logoMode},nameMode:identity?.name!==undefined?'manual':'source'};
  }),
  patch: (update) => set(state => ({
    recipe: patchRecipe(state, update),
    identities: {...state.identities,[state.activeSourceId]:{...modelIdentity(state.identities,state.activeSourceId),...(update.name!==undefined?{name:update.name}:{}),...(update.year!==undefined?{year:update.year}:{}),...(update.logoMode!==undefined?{logoMode:update.logoMode}:{})}},
    ...(update.name !== undefined ? { nameMode: 'manual' as const } : {}),
  })),
  useSourceName: ()=>set(s=>({nameMode:'source',identities:{...s.identities,[s.activeSourceId]:{...modelIdentity(s.identities,s.activeSourceId),name:undefined}},recipe:{...s.recipe,name:selectDefaultIdentity(s.bundle.sources.filter(x=>x.id===s.activeSourceId)).name}})),
  loadDemo: () => get().set({ bundle: demoBundle(get().recipe.year), inputMode: "demo" }),
  setTheme: (id) => {
    const s = get();
    const recipe = { ...s.recipe, sourceColors: undefined, ...defaultThemePlan(themes.find(t => t.id === id)!, s.bundle.sources.map(s => s.id)) };
    set({ theme: id, recipe: { ...recipe, slotAssignments: undefined } });
  },
}));
