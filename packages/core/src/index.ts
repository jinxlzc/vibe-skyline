import { selectDefaultIdentity } from "./identity";
import { ActivityBundle, BuildPlan, BuildRecipe } from "@vibeskyline/contracts";
import type { SourceSeries } from "@vibeskyline/contracts";
import { themes } from "@vibeskyline/registry";
export function contrastRatio(a:string,b:string){
 const lum=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function contrastColor(base:string,colors:string[]){return [...colors].sort((a,b)=>contrastRatio(base,b)-contrastRatio(base,a))[0];}
export function themeIdentity(theme:typeof themes[number]){return contrastColor(theme.base,[theme.ink,...theme.colors]);}
export function defaultThemePlan(theme:typeof themes[number], ids:readonly string[]=["github","codex","gemini"]){
 const textColor=contrastColor(theme.base,theme.colors.slice(0,Math.max(1,ids.length)));
 return {colors:theme.colors,baseColor:theme.base,textColor,logoColor:textColor,resolution:"unresolved" as const,slotAssignments:undefined};
}
/** Retired shared-base layout: explicit historical regression/migration use only. */
export const legacyRecipe: BuildRecipe = {
  year: 2026,
  weekStart: "sunday",
  name: "skyline-demo",
  nameSize: "medium",
  namePlacement: "front",
  layout: "annual-districts",
  gamma: 0.78,
  maxHeight: 18,
  logoMode: "brand",
  tier: "multi",
  density: 1.24,
  ...defaultThemePlan(themes[0]),
};
export const defaultRecipe: BuildRecipe = {...legacyRecipe, layout: "first-edition", maxHeight: 22,
  baseColor: "#0D1117", textColor: "#F0F3F6", logoColor: "#F0F3F6", colors: ["#39D385", "#E5A54B", "#6495ED"]};
export function buildSourcePlans(bundle: ActivityBundle, recipe: BuildRecipe, identities: Record<string, Partial<BuildRecipe>> = {}) {
  return bundle.sources.map((source, index) => buildPlan({...bundle, sources:[source]}, {...recipe,
    name: selectDefaultIdentity([source]).name, colors: [recipe.colors[index % recipe.colors.length]],
    ...identities[source.id], layout: "first-edition"}));
}
export function modelFilename(plan: BuildPlan, extension: "stl" | "3mf") {
  if(plan.sourceCount!==1) throw Error("Export requires one source");
  return `vibeskyline-${plan.districts[0].id}-${plan.recipe.year}.${extension}`;
}
export function grid(year: number, weekStart: BuildRecipe["weekStart"]) {
  const start = Date.UTC(year, 0, 1),
    days = (Date.UTC(year + 1, 0, 1) - start) / 86400000;
  const offset =
    (new Date(start).getUTCDay() + (weekStart === "monday" ? 6 : 0)) % 7;
  return { start, days, offset, columns: Math.ceil((days + offset) / 7) };
}
export function heights(source: SourceSeries, H: number, gamma: number) {
  const positive = source.days
    .flatMap((d) => ((d.value ?? 0) > 0 ? [d.value!] : []))
    .sort((a, b) => a - b);
  const m = positive.length
      ? (positive[Math.floor((positive.length - 1) / 2)] +
          positive[Math.floor(positive.length / 2)]) /
        2
      : 1,
    C =
      positive.length >= 20
        ? positive[Math.ceil(positive.length * 0.95) - 1]
        : (positive.at(-1) ?? 1);
  return (v: number) =>
    v === 0
      ? 0
      : Math.round(
          (0.8 +
            (H - 0.8) *
              Math.pow(
                Math.log1p(Math.min(v, C) / m) / Math.log1p(C / m),
                gamma,
              )) /
            0.2,
        ) * 0.2;
}
export function buildPlan(
  bundle: ActivityBundle,
  input: BuildRecipe,
): BuildPlan {
  const recipe = BuildRecipe.parse(input);
  if(recipe.layout === "first-edition" && bundle.sources.length !== 1) throw Error("Select one source per model");
  if (bundle.sources.length < 1) throw Error("Add at least one source");
  if (
    bundle.sources.some((s) => s.sample) &&
    bundle.sources.some((s) => !s.sample)
  )
    throw Error("Remove sample sources before mixing personal activity");
  const first = recipe.layout === "first-edition";
  const g = grid(recipe.year, recipe.weekStart);
  if(first && recipe.year === new Date().getUTCFullYear()) g.columns = Math.max(47,Math.ceil((g.offset + Math.floor((Date.now()-g.start)/86400000)+1)/7));
  const side = 14*Math.tan(Math.PI/12), front = 14/Math.tan(Math.PI/3);
  const
    width = first ? g.columns*3-.5+4.4+2*side : 24 + (g.columns - 1) * 2.8 + 2.2,
    depth =
      first ? 20.5+4.4+side+front : 16 + bundle.sources.length * 19.6 + (bundle.sources.length - 1) * 4.2 + 4;
  let base = recipe.baseColor.toUpperCase(),
    text = recipe.textColor.toUpperCase(),
    logo = recipe.logoColor.toUpperCase();
  let colors = recipe.colors.map((c) => c.toUpperCase());
  const overrides = new Map(Object.entries(recipe.sourceColors ?? {}));
  bundle.sources.forEach((source, i) => {
    colors[i] = (overrides.get(source.id) ?? recipe.colors[i % recipe.colors.length]).toUpperCase();
  });
  if (recipe.tier === "multi" && recipe.resolution === "share-base") {
    if (text === base) text = colors[0];
    if (logo === base) logo = colors[0];
    base = colors[0];
  }
  if (recipe.tier === "multi" && recipe.resolution === "share-identity") {
    text = base;
    logo = base;
  }
  if (recipe.tier === "multi" && ["share-district","merge-identity"].includes(recipe.resolution)) {
    if(recipe.resolution==="merge-identity")colors=colors.map((c,i)=>i===1?colors[0]:c);
    text=contrastColor(base,colors.slice(0,bundle.sources.length));logo=text;
  }
  if (recipe.tier === "multi" && recipe.resolution === "merge-sources")
    colors = colors.map((c, i) => (i === 1 ? colors[0] : c));
  if (recipe.tier === "mono") {
    colors = colors.map(() => base);
    text = base;
    logo = base;
  }
  if (recipe.tier === "two-tone") {
    colors = colors.map(() => colors[0]);
    text = colors[0];
    logo = colors[0];
  }
  const r = {
    ...recipe,
    baseColor: base,
    textColor: text,
    logoColor: logo,
    colors,
  };
  const solids: BuildPlan["solids"] = [],
    districts: BuildPlan["districts"] = [];
  let height = first ? 14 : 3.8;
  bundle.sources.forEach((s, k) => {
    const y = first ? front+2.2 : 16 + k * 23.8,
      color = colors[k % colors.length];
    districts.push({
      id: s.id,
      label: s.client,
      y,
      color,
      letter: s.client.slice(0, 1).toUpperCase(),
    });
    const h = heights(s, r.maxHeight, r.gamma),
      map = new Map(s.days.map((d) => [d.date, d]));
    for (let i = 0; i < g.days; i++) {
      const date = new Date(g.start + i * 86400000).toISOString().slice(0, 10),
        day = map.get(date);
      if (
        day?.state === "future" ||
        date > new Date().toISOString().slice(0, 10)
      )
        continue;
      const n = g.offset + i,
        x = first ? side+2.2+Math.floor(n/7)*3 : 18 + Math.floor(n / 7) * 2.8,
        cy = y + (first ? (6-n%7)*3 : (n % 7) * 2.8);
      if (!day || day.value === null) {
        solids.push({
          x,
          y: cy,
          z: first ? 13.6 : 2.8,
          w: first ? 2.5 : 2.2,
          d: first ? 2.5 : 2.2,
          h: 0.4,
          color: base,
          kind: "recess",
        });
      } else if (day.value > 0 || first) {
        const z = first ? (day.value>0?Math.max(1.2,h(day.value)):.4) : h(day.value);
        height = Math.max(height, (first ? 14 : 3.2) + z);
        solids.push({
          x,
          y: cy,
          z: first ? 14 : 3.2,
          w: first ? 2.5 : 2.2,
          d: first ? 2.5 : 2.2,
          h: z,
          color,
          kind: "tower",
        });
      }
    }
  });
  const materialColors = [
    ...new Set([
      base,
      ...solids.filter((s) => s.kind === "tower").map((s) => s.color),
      ...(r.name || r.year ? [text] : []),
      ...(r.logoMode !== "none" ? [logo] : []),
    ]),
  ];
  return BuildPlan.parse({
    recipe: r,
    width,
    depth,
    height,
    columns: g.columns,
    sourceCount: bundle.sources.length,
    solids,
    districts,
    materialColors,
    diagnostics: [
      "Independent source scales · log / P95 cap",
      "Physical print and slicer mapping not qualified",

    ],
  });
}
export function demoBundle(year = 2026, sourceCount = 3): ActivityBundle {
  const ids = ["github", "codex", "gemini", "deepseek"].slice(0,sourceCount);
  const g = grid(year, "sunday");
  return ActivityBundle.parse({
    schema: "vibeskyline.activity.v1",
    year,
    generatedAt: new Date().toISOString(),
    sources: ids.map((id, k) => ({
      id,
      client: ["GitHub", "Codex", "Gemini", "DeepSeek"][k],
      provider: k === 3 ? "DeepSeek" : undefined,
      accountingProfile: k ? "inclusive-tokens-v1" : "contributions-v1",
      scopeId: "synthetic",
      metric: k ? "tokens" : "contributions",
      unitScale: 1,
      calendar: { dateBasis: "source-reported" },
      coverage: [{ from: `${year}-01-01`, to: `${year}-12-31`, kind: "full" }],
      days: Array.from({ length: g.days }, (_, i) => {
        const value =
          (i * 17 + k * 31) % 11 < 2
            ? 0
            : Math.round((1 + Math.sin(i * 0.14 + k)) * (2 + ((i * 37) % 23))) *
              (k ? 100 : 1);
        return {
          date: new Date(g.start + i * 86400000).toISOString().slice(0, 10),
          value,
          state: value ? "observed" : "known-zero",
          completeness: "complete",
          quality: "derived",
        };
      }),
      provenanceIds: ["demo"],
      sample: true,
    })),
    provenance: [
      {
        id: "demo",
        adapter: "synthetic",
        version: "1",
        method: "synthetic",
        status: "in-progress",
      },
    ],
    reconciliation: [],
  });
}

export { selectDefaultIdentity } from "./identity";

/** Upgrade saved M1–M3 recipes without retaining hardware assumptions or recoloring. */
export function migrateRecipe(value: unknown, bundle: ActivityBundle): BuildRecipe {
  const old=BuildRecipe.parse(value);
  const rendered=buildPlan(bundle,old);
  return {...old,baseColor:rendered.recipe.baseColor,textColor:rendered.recipe.textColor,logoColor:rendered.recipe.logoColor,
    sourceColors:Object.fromEntries(rendered.districts.map(d=>[d.id,d.color])),slotAssignments:undefined,resolution:'unresolved'};
}
