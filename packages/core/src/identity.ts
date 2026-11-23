import { PublicIdentity, type SourceSeries } from "@vibeskyline/contracts";

const priority = ["github", "gitee", "gitlab", "source"] as const;
const reasons = {
  github: "Explicit public GitHub username.",
  gitee: "Explicit public Gitee username.",
  gitlab: "Explicit public GitLab username.",
  source: "Explicit public source ID.",
  fallback: "No eligible public identity was supplied.",
};

export interface DefaultIdentity {
  name: string;
  provider: PublicIdentity["provider"] | "fallback";
  reason: string;
}

export function selectDefaultIdentity(sources: readonly SourceSeries[]): DefaultIdentity {
  let skipped = "";
  for (const provider of priority) {
    for (const source of sources) {
      if (source.sample || source.publicIdentity?.provider !== provider) continue;
      const parsed = PublicIdentity.safeParse(source.publicIdentity);
      if (!parsed.success) continue;
      const identity = parsed.data;
      if (identity.kind === "username" && source.id !== identity.provider) continue;
      // PublicIdentityValue permits only ASCII, so here length equals grapheme count.
      if (identity.value.length > 24) {
        skipped = " A public identity exceeded the 24-grapheme print limit.";
        continue;
      }
      return { name: identity.value, provider, reason: reasons[provider] + skipped };
    }
  }
  return { name: "skyline-demo", provider: "fallback", reason: reasons.fallback + skipped };
}
