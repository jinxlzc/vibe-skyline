import { z } from "zod";
export const SafeInt = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const DateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
export const Status = z.enum([
  "verified",
  "fixture-tested",
  "in-progress",
  "manual",
  "unsupported",
]);
export const Metric = z.enum([
  "tokens",
  "contributions",
  "activity_level",
  "events",
  "credits",
  "premium_requests",
]);
export const Tokens = z
  .object({
    in: SafeInt,
    out: SafeInt,
    cacheRead: SafeInt.optional(),
    cacheWrite: SafeInt.optional(),
    reasoning: SafeInt.optional(),
  })
  .superRefine((t, c) => {
    if (
      (t.cacheRead ?? 0) + (t.cacheWrite ?? 0) > t.in ||
      (t.reasoning ?? 0) > t.out ||
      !Number.isSafeInteger(t.in + t.out)
    )
      c.addIssue({
        code: "custom",
        message: "Inclusive token accounting violated",
      });
  });
export const NormalizedObservation = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  client: z.enum(["codex", "claude", "gemini", "cursor"]),
  provider: z.string().optional(),
  tokens: Tokens,
});
export type NormalizedObservation = z.infer<typeof NormalizedObservation>;
export const DailyValue = z
  .object({
    date: DateKey,
    value: SafeInt.nullable(),
    state: z.enum(["observed", "known-zero", "unknown", "future"]),
    completeness: z.enum(["complete", "partial", "unknown"]),
    quality: z.enum(["reported", "derived", "estimated", "manual"]),
    tokens: Tokens.optional(),
  })
  .superRefine((d, c) => {
    if (
      (d.state === "unknown" || d.state === "future") !== (d.value === null) ||
      (d.state === "known-zero" && d.value !== 0) ||
      (d.tokens && d.value !== d.tokens.in + d.tokens.out)
    )
      c.addIssue({ code: "custom", message: "Day state/value mismatch" });
  });
// Public status is asserted by the importing producer. Syntax checks can reject
// common private identifiers, but cannot establish that an arbitrary alias is public.
const credentialPrefix = /^(?:gh[pousr]_|github_pat_|gl(?:pat|cbt|rt|ptt|dt|ft|imt|soat|agent)-|sk[-_]|xox[baprs]-|npm_|hf_)/i;
// Undelimited prefixes also occur in ordinary names. Match the complete key
// shape here. Compact JWTs contain dots, already excluded by the handle grammar.
const credentialKey = /^(?:(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{35})$/;
const privateIdPrefix = /^(?:sess(?:ion)?|org(?:anization)?|acct|account|tenant|device|machine|host(?:name)?|user[-_]?id|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret)[-_]/i;
const opaqueId = /^(?:[0-9]+|[a-f0-9]{16,}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|[0-9][0-9A-HJKMNP-TV-Z]{25})$/i;
export const PublicIdentityValue = z.string().max(39).regex(
  /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{0,37}[a-zA-Z0-9])?$/,
).refine(value =>
  value.toLowerCase() !== "localhost" && !credentialPrefix.test(value) && !credentialKey.test(value) &&
  !privateIdPrefix.test(value) && !opaqueId.test(value),
  "Invalid public identifier",
);
const declaredIdentity = z.discriminatedUnion("kind", [
  z.object({
    provider: z.enum(["github", "gitee", "gitlab"]),
    kind: z.literal("username"),
    value: PublicIdentityValue,
    provenance: z.literal("explicit-public-handle"),
  }).strict(),
  z.object({
    provider: z.literal("source"),
    kind: z.literal("public-id"),
    value: PublicIdentityValue,
    provenance: z.literal("explicit-public-id"),
  }).strict(),
]);
// Zod enum/strict-object errors can echo the rejected input. Keep identity
// errors safe for callers that display a bundle validation error directly.
export const PublicIdentity = z.unknown().transform((value, ctx) => {
  const result = declaredIdentity.safeParse(value);
  if (result.success) return result.data;
  ctx.addIssue({code: "custom", message: "Invalid public identity declaration"});
  return z.NEVER;
});
export type PublicIdentity = z.infer<typeof PublicIdentity>;
export const SourceSeries = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    client: z.string(),
    provider: z.string().optional(),
    model: z.string().optional(),
    accountingProfile: z.string(),
    scopeId: z.string(),
    publicIdentity: PublicIdentity.optional(),
    metric: Metric,
    unit: z.enum(["token","contribution","level","event","credit","request"]).optional(),
    unitScale: SafeInt.positive(),
    calendar: z.object({
      timezone: z.string().optional(),
      dateBasis: z.enum(["timestamp-derived", "source-reported"]),
    }),
    coverage: z.array(
      z.object({
        from: DateKey,
        to: DateKey,
        kind: z.enum(["full", "partial"]),
      }),
    ),
    days: z.array(DailyValue),
    provenanceIds: z.array(z.string()),
    sample: z.boolean().default(false),
  })
  .superRefine((s, c) => {
    if (s.publicIdentity?.kind === "username" && s.publicIdentity.provider !== s.id)
      c.addIssue({ code: "custom", message: "Public handle provider does not match source" });
    if (new Set(s.days.map((d) => d.date)).size !== s.days.length)
      c.addIssue({ code: "custom", message: "Duplicate dates" });
  });
export type SourceSeries = z.infer<typeof SourceSeries>;
export const ActivityBundle = z
  .object({
    schema: z.literal("vibeskyline.activity.v1"),
    year: z.number().int().min(1970).max(2100),
    generatedAt: z.string().datetime(),
    sources: z.array(SourceSeries).max(6),
    provenance: z.array(
      z.object({
        id: z.string(),
        adapter: z.string(),
        version: z.string(),
        method: z.enum(["synthetic", "local", "public-http", "manual"]),
        status: Status,
      }),
    ),
    reconciliation: z.array(
      z.object({ source: z.string(), decision: z.string() }),
    ),
  })
  .superRefine((b, c) => {
    if (new Set(b.sources.map((s) => s.id)).size !== b.sources.length)
      c.addIssue({
        code: "custom",
        message: "Duplicate sources require reconciliation",
      });
    if (
      b.sources.some((s) =>
        s.provenanceIds.some((id) => !b.provenance.some((p) => p.id === id)),
      )
    )
      c.addIssue({ code: "custom", message: "Missing provenance" });
  });
export type ActivityBundle = z.infer<typeof ActivityBundle>;
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const BuildRecipe = z.object({
  year: z.number().int().min(1970).max(2100),
  weekStart: z.enum(["sunday", "monday"]),
  name: z.string().transform(s=>s.normalize("NFC")).refine(s=>[...new Intl.Segmenter("und",{granularity:"grapheme"}).segment(s)].length<=24,"Name exceeds 24 graphemes"),
  nameSize: z.enum(["small", "medium", "large"]).default("medium"),
  namePlacement: z.enum(["front", "rear"]).default("front"),
  layout: z.enum(["first-edition", "annual-districts"]),
  gamma: z.number().min(0.55).max(1),
  maxHeight: z.number().min(4).max(22).multipleOf(0.2),
  logoMode: z.enum(["brand", "neutral", "none"]),
  colors: z.array(Color).min(1).max(6),
  sourceColors: z.record(z.string().regex(/^[a-z0-9-]+$/), Color).optional(),
  baseColor: Color,
  textColor: Color,
  logoColor: Color,
  tier: z.enum(["multi", "two-tone", "mono"]),
  resolution: z.enum([
    "unresolved",
    "share-base",
    "share-identity",
    "share-district",
    "merge-identity",
    "merge-sources",
    "unrestricted",
  ]),
  density: z.number().min(0.1).max(10),
  slotAssignments: z.record(z.number().int().min(1).max(4)).optional(),
});
export type BuildRecipe = z.infer<typeof BuildRecipe>;
export const Solid = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  w: z.number().positive(),
  d: z.number().positive(),
  h: z.number().positive(),
  color: Color,
  kind: z.enum(["tower", "recess", "glyph"]),
});
export const BuildPlan = z.object({
  recipe: BuildRecipe,
  width: z.number(),
  depth: z.number(),
  height: z.number(),
  columns: z.number().int(),
  sourceCount: z.number().int(),
  solids: z.array(Solid),
  districts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      y: z.number(),
      color: Color,
      letter: z.string(),
    }),
  ),
  materialColors: z.array(Color),
  diagnostics: z.array(z.string()),
});
export type BuildPlan = z.infer<typeof BuildPlan>;
export const MaterialBudget = z.object({
  printer: z.string().optional(),
  slots: z.number().optional(),
  count: z.number().int(),
  overCapacity: z.boolean().default(false),
  density: z.number(),
  materials: z.array(
    z.object({
      id: z.number().int(),
      color: Color,
      volumeCm3: z.number().nonnegative(),
      grams: z.number().nonnegative(),
      slot: z.number().int().min(1).max(4).optional(),
      roleKeys: z.array(z.string()).optional(),
    }),
  ),
  totalVolumeCm3: z.number().nonnegative(),
  totalGrams: z.number().nonnegative(),
  purge: z.literal("unknown until sliced"),
  printTime: z.literal("unknown until sliced"),
  twoToneBoundary: z.number().nullable(),
});
export type MaterialBudget = z.infer<typeof MaterialBudget>;
export const AdapterManifest = z.object({
  id: z.string(),
  brand: z.string(),
  methods: z.array(
    z.enum([
      "local",
      "file",
      "public-http",
      "manual",
      "aggregator",
      "official-api",
    ]),
  ),
  metric: Metric,
  status: Status,
  capability: z.enum([
    "qualified",
    "beta",
    "via-aggregator",
    "manual-only",
    "unavailable",
  ]),
  reason: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  producerVersions: z.array(z.string()),
  runtimes: z.array(z.enum(["node", "browser"])),
});
export type AdapterManifest = z.infer<typeof AdapterManifest>;
export function safeAdd(a: number, b: number): number {
  const n = BigInt(a) + BigInt(b);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw Error("Unsafe integer total");
  return Number(n);
}

/** Resolve spool intent without using color as identity or colliding with a reserved slot. */
export function resolvePhysicalSlots(materials:{slot?:number}[]):(number|null)[]{
 const used=new Set<number>();
 for(const m of materials)if(m.slot!==undefined){if(!Number.isInteger(m.slot)||m.slot<1||m.slot>4||used.has(m.slot))throw Error('Invalid or duplicate physical slot');used.add(m.slot);}
 return materials.map(m=>{if(m.slot!==undefined)return m.slot;const free=[1,2,3,4].find(n=>!used.has(n));if(free)used.add(free);return free??null;});
}
