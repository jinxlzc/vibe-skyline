import { it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  parseCalendar,
  calendarHandler,
  fetchCalendar,
  calendarURL,
} from "./index";
const fixture = (name: string) =>
  readFile(
    new URL("../../../fixtures/calendars/" + name, import.meta.url),
    "utf8",
  );
it("golden GitHub tooltip counts and level fallback preserve units", async () => {
  const text = await fixture("github.html");
  expect(parseCalendar("github", text, 2026).days.map((d) => d.value)).toEqual([
    0, 1234,
  ]);
  const fallback = parseCalendar(
    "github",
    text.replace(/<tool-tip[\s\S]*/, ""),
    2026,
  );
  expect(fallback.metric).toBe("activity_level");
  expect(fallback.days.map((d) => d.value)).toEqual([0, 2]);
});
it("Gitee parses text without execution and trims boundaries", async () => {
  expect(
    parseCalendar("gitee", await fixture("gitee.txt"), 2026).days.map(
      (d) => d.value,
    ),
  ).toEqual([0, 7]);
});
it("GitLab keeps only requested year and rejects unsafe integers", async () => {
  expect(
    parseCalendar("gitlab", await fixture("gitlab.json"), 2026).days.map(
      (d) => d.value,
    ),
  ).toEqual([0, 6]);
  expect(() =>
    parseCalendar("gitlab", '{"2026-01-01":9007199254740992}', 2026),
  ).toThrow();
});
it("proxy rejects SSRF, URL injection, unknown hosts, traversal and invalid years without fetching", async () => {
  const fetcher = vi.fn(),
    handler = calendarHandler(fetcher);
  for (const url of [
    "/api/calendar/evil.com/alice?year=2026",
    "/api/calendar/github/http://evil?year=2026",
    "/api/calendar/github/%2e%2e?year=2026",
    "/api/calendar/github/alice?year=abc",
    "/api/calendar/github/alice?year=1969",
    "/api/calendar/github/alice?year=2026&url=https://evil.com",
    "/api/calendar/github/a@evil.com?year=2026",
    "/api/calendar/github/alice?year=2026&year=2025",
  ])
    await expect(handler(url)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("cache and fixed upstream headers, redirects and timeout", async () => {
  const fetcher = vi.fn(async () => new Response(await fixture("github.html"))),
    h = calendarHandler(fetcher as typeof fetch);
  await h("/api/calendar/github/synthetic?year=2026");
  await h("/api/calendar/github/synthetic?year=2026");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toMatchObject([
    calendarURL("github", "synthetic", 2026),
    { redirect: "error", headers: {}, signal: expect.any(AbortSignal) },
  ]);
  await expect(
    fetchCalendar(
      "gitee",
      "synthetic",
      2026,
      async () => new Response("", { status: 429 }),
    ),
  ).rejects.toThrow("429");
});

it("records only the requested public username after a successful fetch", async () => {
  const html = '<span data-user="session-private-CANARY"></span>' + await fixture("github.html");
  expect(parseCalendar("github", html, 2026).publicIdentity).toBeUndefined();
  const fetcher = vi.fn(async () => new Response(html));
  const source = await fetchCalendar("github", "orchard", 2026, fetcher);
  expect(source.publicIdentity).toEqual({
    provider: "github", kind: "username", value: "orchard", provenance: "explicit-public-handle",
  });
  expect(JSON.stringify(source)).not.toContain("CANARY");
  fetcher.mockClear();
  for (const value of ["ghp_CANARY", "org-CANARY", "session-CANARY", "private-CANARY.local"]) {
    await expect(fetchCalendar("github", value, 2026, fetcher))
      .rejects.toThrow(/^Invalid calendar request$/);
  }
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(['asian-artist', 'asiamaker', 'akia-studio', 'eyJensen', 'aiza-maker'])(
  'accepts the explicitly entered public alias %s through the calendar endpoint', async alias => {
    const html = await fixture('github.html');
    const fetcher = vi.fn(async () => new Response(html));
    const result = await calendarHandler(fetcher)('/api/calendar/github/' + alias + '?year=2026');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.publicIdentity).toEqual({
      provider: 'github', kind: 'username', value: alias, provenance: 'explicit-public-handle',
    });
  },
);

it('rejects credential-shaped handles with a redacted error before fetching', async () => {
  const fetcher = vi.fn();
  const handler = calendarHandler(fetcher);
  const canaries = [
    'ASIACANARY1234567890', 'AKIACANARY1234567890', 'AIza' + 'x'.repeat(35),
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.x', 'ghp_CANARY', 'glpat-CANARY', 'sk-proj-CANARY',
  ];
  for (const canary of canaries) {
    await expect(handler('/api/calendar/github/' + canary + '?year=2026')).rejects.toThrow(/^Invalid calendar request$/);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
