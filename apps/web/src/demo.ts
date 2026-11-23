import { ActivityBundle } from "@vibeskyline/contracts";
import { grid } from "@vibeskyline/core";

// Website samples are synthetic code-hosting calendars, never account evidence.
export function demoBundle(year = 2026, sourceCount = 3): ActivityBundle {
  const ids = ["github", "gitee", "gitlab"].slice(0, sourceCount);
  const g = grid(year, "sunday");
  return ActivityBundle.parse({
    schema: "vibeskyline.activity.v1",
    year,
    generatedAt: new Date().toISOString(),
    sources: ids.map((id, k) => ({
      id,
      client: ["GitHub", "Gitee", "GitLab · Beta"][k],
      accountingProfile: "contributions-v1",
      scopeId: "synthetic",
      metric: "contributions",
      unitScale: 1,
      calendar: { dateBasis: "source-reported" },
      coverage: [{ from: `${year}-01-01`, to: `${year}-12-31`, kind: "full" }],
      days: Array.from({ length: g.days }, (_, i) => {
        const value =
          (i * 17 + k * 31) % 11 < 2
            ? 0
            : Math.round((1 + Math.sin(i * 0.14 + k)) * (2 + ((i * 37) % 23)));
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
