import { SourceSeries, SafeInt, DateKey, PublicIdentityValue } from "@vibeskyline/contracts";
export type Provider = "github" | "gitee" | "gitlab";
export function validateRequest(
  provider: string,
  handle: string,
  year: number,
): asserts provider is Provider {
  if (
    !["github", "gitee", "gitlab"].includes(provider) ||
    !Number.isInteger(year) ||
    year < 1970 ||
    year > new Date().getUTCFullYear() + 1 ||
    !PublicIdentityValue.safeParse(handle).success
  )
    throw Error("Invalid calendar request");
}
export function calendarURL(provider: Provider, handle: string, year: number) {
  validateRequest(provider, handle, year);
  return provider === "github"
    ? `https://github.com/users/${handle}/contributions?from=${year}-01-01&to=${year}-12-31`
    : provider === "gitee"
      ? `https://gitee.com/${handle}/contribution_calendar?year=${year}`
      : `https://gitlab.com/users/${handle}/calendar.json`;
}
function attr(s: string, k: string) {
  return new RegExp(`\\b${k}=["']([^"']*)["']`).exec(s)?.[1];
}
export function parseCalendar(
  provider: Provider,
  text: string,
  year: number,
): SourceSeries {
  const values = new Map<string, number>();
  let metric: "contributions" | "activity_level" = "contributions";
  if (provider === "github") {
    const tooltips = new Map(
      [...text.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)].map(
        (m) => [attr(m[1], "for"), m[2].replace(/<[^>]+>/g, "").trim()],
      ),
    );
    const cells = [...text.matchAll(/<(?:td|rect)\b([^>]*data-date=[^>]*)>/g)];
    const parsed = cells.map((m) => {
      const date = attr(m[1], "data-date")!,
        tip = tooltips.get(attr(m[1], "id")),
        count = tip ? /^([\d,]+)\s+contribution/i.exec(tip) : null;
      return {
        date,
        exact: count
          ? Number(count[1].replaceAll(",", ""))
          : tip && /^No contributions/i.test(tip)
            ? 0
            : null,
        level: Number(attr(m[1], "data-level")),
      };
    });
    if (parsed.some((c) => c.exact === null)) metric = "activity_level";
    for (const c of parsed)
      values.set(c.date, metric === "activity_level" ? c.level : c.exact!);
  } else if (provider === "gitee") {
    const html = text
      .replace(/\\u([\da-f]{4})/gi, (_, h: string) =>
        String.fromCharCode(parseInt(h, 16)),
      )
      .replace(/\\["']/g, (m) => m[1]);
    for (const m of html.matchAll(/(\d+)个贡献[：:]\s*(\d{4}-\d{2}-\d{2})/g))
      values.set(m[2], Number(m[1]));
  } else {
    const data: unknown = JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== "object")
      throw Error("Invalid GitLab response");
    for (const [date, value] of Object.entries(data))
      values.set(date, SafeInt.parse(value));
  }
  const days = [...values]
    .filter(([d]) => d.startsWith(`${year}-`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date: DateKey.parse(date),
      value: SafeInt.parse(value),
      state: value ? ("observed" as const) : ("known-zero" as const),
      completeness: "complete" as const,
      quality:
        metric === "activity_level"
          ? ("estimated" as const)
          : ("reported" as const),
    }));
  if (!days.length) throw Error("No calendar cells found for requested year");
  return SourceSeries.parse({
    id: provider,
    client: { github: "GitHub", gitee: "Gitee", gitlab: "GitLab" }[provider],
    metric,
    accountingProfile: metric + "-v1",
    scopeId: "public-calendar",
    unitScale: 1,
    calendar: { dateBasis: "source-reported" },
    coverage: [{ from: days[0].date, to: days.at(-1)!.date, kind: "partial" }],
    days,
    provenanceIds: [provider + "-public"],
    sample: false,
  });
}
export async function fetchCalendar(
  provider: Provider,
  handle: string,
  year: number,
  fetcher: typeof fetch = fetch,
  timeoutMs = 12000,
): Promise<SourceSeries> {
  const url = calendarURL(provider, handle, year);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new DOMException("Calendar timeout", "TimeoutError")); }, timeoutMs); });
  const work = async (): Promise<SourceSeries> => {
    const response = await fetcher(url, {
      redirect: "error",
      signal: controller.signal,
      headers:
        provider === "gitee" ? { "X-Requested-With": "XMLHttpRequest" } : {},
    });
    if (!response.ok)
      throw Error(`Calendar upstream returned ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw Error("Empty calendar response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Calendar response too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      ...parseCalendar(provider, new TextDecoder().decode(bytes), year),
      publicIdentity: { provider, kind: "username", value: handle, provenance: "explicit-public-handle" },
    };
  };
  try { return await Promise.race([work(), deadline]); } finally { clearTimeout(timer); }
}
// Fixed-path handler shared by the relay and Vite. Public-only, bounded cache.
export function calendarHandler(fetcher: typeof fetch = fetch, options: {timeoutMs?: number; now?: () => number} = {}) {
  const now = options.now ?? Date.now;
  const cache = new Map<string, { at: number; data: SourceSeries }>();
  return async (raw: string) => {
    if (!raw.startsWith("/api/calendar/")) throw Error("Invalid calendar request");
    const url = new URL(raw, "http://localhost");
    const match = /^\/api\/calendar\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (
      !match ||
      [...url.searchParams.keys()].some((k) => k !== "year") ||
      url.searchParams.getAll("year").length !== 1
    )
      throw Error("Invalid calendar request");
    const [, provider, handle] = match,
      year = Number(url.searchParams.get("year"));
    validateRequest(provider, handle, year);
    const key = `${provider}:${handle}:${year}`,
      hit = cache.get(key);
    if (hit && now() - hit.at < 3600000) return structuredClone(hit.data);
    const data = await fetchCalendar(provider, handle, year, fetcher, options.timeoutMs);
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: now(), data: structuredClone(data) });
    return data;
  };
}

export function calendarErrorResponse(error:unknown){
 const e=error instanceof Error?error:new Error();
 if(e.message==='Invalid calendar request')return {status:400,error:'Bad provider, handle or year. Edit the request.'};
 if(e.message==='Calendar upstream returned 429')return {status:429,error:'Rate limited. Retry later.'};
 if(['TimeoutError','AbortError'].includes(e.name))return {status:504,error:'Calendar timeout. Retry later.'};
 return {status:502,error:'Calendar upstream or network failure. Retry later.'};
}
