import {
  NormalizedObservation,
  SourceSeries,
  safeAdd,
} from "@vibeskyline/contracts";
import type { AdapterManifest } from "@vibeskyline/contracts";
export interface PureParser {
  manifest: AdapterManifest;
  sniff(bytes: Uint8Array): boolean;
  parse(bytes: Uint8Array): Promise<NormalizedObservation[]>;
}
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export const codexParser: PureParser = {
  manifest: {
    id: "codex",
    brand: "codex",
    methods: ["local", "file"],
    metric: "tokens",
    status: "fixture-tested",
    capability: "beta",
    producerVersions: ["synthetic-m1"],
    runtimes: ["node", "browser"],
  },
  sniff: (bytes) => new TextDecoder().decode(bytes).includes('"type"'),
  async parse(bytes) {
    if (bytes.length > 256 * 1024 * 1024)
      throw Error("Expanded file exceeds 256 MiB");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      out: NormalizedObservation[] = [];
    let session = await hash(text);
    const seen = new Set<string>();
    for (const line of text.split("\n")) {
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      if (row?.type === "session_meta" && typeof row.payload?.id === "string") {
        session = await hash(row.payload.id);
        continue;
      }
      if (row?.type !== "event_msg" || row.payload?.type !== "token_count")
        continue;
      const info = row.payload.info,
        last = info?.last_token_usage,
        total = info?.total_token_usage;
      if (!last) continue;
      const candidate = NormalizedObservation.safeParse({
        id: "pending",
        timestamp: row.timestamp,
        client: "codex",
        tokens: {
          in: last.input_tokens,
          out: last.output_tokens,
          cacheRead: last.cached_input_tokens,
          cacheWrite: last.cache_write_input_tokens,
          reasoning: last.reasoning_output_tokens,
        },
      });
      if (!candidate.success) continue;
      if (
        last.total_tokens !== undefined &&
        last.total_tokens !==
          candidate.data.tokens.in + candidate.data.tokens.out
      )
        continue;
      const snapshot =
        total &&
        Number.isSafeInteger(total.input_tokens) &&
        Number.isSafeInteger(total.output_tokens)
          ? `${total.input_tokens}:${total.output_tokens}`
          : `${row.timestamp}:${JSON.stringify(candidate.data.tokens)}`;
      const id = await hash(session + ":" + snapshot);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ ...candidate.data, id });
    }
    return out;
  },
};
export function aggregateCodex(
  observations: NormalizedObservation[],
  year: number,
  timezone: string,
): SourceSeries {
  const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    days = new Map<
      string,
      {
        in: number;
        out: number;
        cacheRead: number;
        cacheWrite: number;
        reasoning: number;
      }
    >(),
    seen = new Set<string>();
  const unknown=new Map<string,Set<string>>();
  for (const o of observations) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    const p = fmt.formatToParts(new Date(o.timestamp));
    const get = (name: string) => p.find((v) => v.type === name)?.value;
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    if (!date.startsWith(String(year))) continue;
    const missing=unknown.get(date)??new Set<string>();
    for(const k of ["cacheRead","cacheWrite","reasoning"] as const)if(o.tokens[k]===undefined)missing.add(k);
    unknown.set(date,missing);
    const t = days.get(date) ?? {
      in: 0,
      out: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
    };
    for (const k of [
      "in",
      "out",
      "cacheRead",
      "cacheWrite",
      "reasoning",
    ] as const)
      t[k] = safeAdd(t[k], o.tokens[k] ?? 0);
    days.set(date, t);
  }
  const entries = [...days].sort(([a], [b]) => a.localeCompare(b));
  return SourceSeries.parse({
    id: "codex",
    client: "Codex",
    accountingProfile: "inclusive-tokens-v1",
    scopeId: "local",
    metric: "tokens",
    unitScale: 1,
    calendar: { timezone, dateBasis: "timestamp-derived" },
    coverage: entries.map(([date]) => ({
      from: date,
      to: date,
      kind: "partial",
    })),
    days: entries.map(([date, tokens]) => ({
      date,
      tokens: Object.fromEntries(Object.entries(tokens).filter(([k])=>!unknown.get(date)?.has(k))),
      value: safeAdd(tokens.in, tokens.out),
      state: tokens.in + tokens.out ? "observed" : "known-zero",
      completeness: "partial",
      quality: "reported",
    })),
    provenanceIds: ["codex-local"],
    sample: false,
  });
}

export * from "./imports";
