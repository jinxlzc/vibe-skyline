import { describe, expect, it } from "vitest";
import { SourceSeries } from "@vibeskyline/contracts";
import { selectDefaultIdentity } from "./identity";

function source(id: string, value?: string, sample = false) {
  const provider = ["github", "gitee", "gitlab"].includes(id) ? id : "source";
  return SourceSeries.parse({
    id, client: "account-CANARY", scopeId: "session-CANARY", provider: "org-CANARY",
    model: "host-CANARY", accountingProfile: "user-CANARY", metric: "events", unitScale: 1,
    calendar: {dateBasis: "source-reported"}, days: [], coverage: [], provenanceIds: [], sample,
    publicIdentity: value === undefined ? undefined : {
      provider, value, kind: provider === "source" ? "public-id" : "username",
      provenance: provider === "source" ? "explicit-public-id" : "explicit-public-handle",
    },
  });
}

describe("default printable name", () => {
  it("ranks only declared public identities from non-sample sources", () => {
    const sources = [source("codex", "river-studio"), source("gitlab", "maple"),
      source("gitee", "elm"), source("github", "birch")];
    for (const name of ["birch", "elm", "maple", "river-studio"]) {
      expect(selectDefaultIdentity(sources).name).toBe(name);
      sources.pop();
    }
    expect(selectDefaultIdentity([source("github", "sample-birch", true), source("codex")]))
      .toMatchObject({name: "skyline-demo", provider: "fallback"});
  });

  it("skips long handles without shortening them or disclosing them in the explanation", () => {
    const long = "spring-collection-at-the-orchard";
    const selected = selectDefaultIdentity([source("github", long), source("gitee", "elm")]);
    expect(selected).toMatchObject({name: "elm", provider: "gitee"});
    expect(selected.reason).toContain("24");
    expect(selected.reason).not.toContain(long);
  });

  it.each(["canary@example.com", "host-canary.lan", "localhost", "/home/CANARY",
    "C:\\Users\\CANARY", "123456789", "ghp_CANARY000000123456", "github_pat_CANARY",
    "glpat-CANARY", "sk-proj-CANARY", "AKIACANARY1234567890", "session-CANARY",
    "org-CANARY", "88affc13-94e2-4992-976c-222222222222", "0123abcdaeed123456789ab0"
  ])("rejects private identifier shapes at the input boundary", value => {
    for (const id of ["github", "codex"]) expect(() => source(id, value)).toThrow();
  });

  it("honors the print boundary exactly", () => {
    expect(selectDefaultIdentity([source("github", "g".repeat(24))]).name).toBe("g".repeat(24));
    expect(selectDefaultIdentity([source("github", "g".repeat(25))])).toMatchObject({
      provider: "fallback", reason: expect.stringContaining("24"),
    });
  });

  it("keeps malformed declarations and diagnostic messages free of private text", () => {
    const valid = source("github", "elm");
    for (const patch of [{value: "ghp_CANARY"}, {provider: "CANARY"},
      {provenance: "CANARY"}, {kind: "CANARY"}, {CANARY: "extra"}]) {
      const invalid = {...valid, publicIdentity: {...valid.publicIdentity, ...patch}};
      const parsed = SourceSeries.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.message).not.toContain("CANARY");
      expect(selectDefaultIdentity([invalid as SourceSeries]).provider).toBe("fallback");
    }
  });

  it("requires a matching provider, kind and explicit declaration", () => {
    const valid = source("github", "elm");
    for (const patch of [{id: "codex"}, {publicIdentity: {...valid.publicIdentity, provenance: "inferred"}},
      {publicIdentity: {...valid.publicIdentity, kind: "public-id"}}]) {
      expect(SourceSeries.safeParse({...valid, ...patch}).success).toBe(false);
    }
  });
});
