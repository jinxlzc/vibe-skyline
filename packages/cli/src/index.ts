#!/usr/bin/env node
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { ActivityBundle } from "@vibeskyline/contracts";
import { registry } from "@vibeskyline/registry";
import { collectClaude, collectCodex } from "@vibeskyline/adapters-node";
import { fetchCalendar } from "@vibeskyline/calendars";
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      offline: { type: "boolean" },
      year: { type: "string" },
      tz: { type: "string" },
      only: { type: "string" },
      "codex-dir": { type: "string" },
      "claude-dir": { type: "string" },
      github: { type: "string" },
      gitee: { type: "string" },
      gitlab: { type: "string" },
      output: { type: "string", short: "o" },
    },
  });
  if (positionals[0] === "doctor") { process.stdout.write(JSON.stringify(registry.map(({id,status,reason,evidence})=>({id,status,reason,evidence})),null,2)+"\n"); return; }
  if (positionals.some((p) => p !== "export"))
    throw Error("Supported command: export");
  if (values.only && !["codex","claude"].includes(values.only))
    throw Error("Choose --only codex or --only claude");
  if(values.only === "claude" && !values["claude-dir"])throw Error("Supply --claude-dir explicitly");
  const year = Number(values.year ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 1970 || year > 2100)
    throw Error("Invalid year");
  const tz = values.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (values.only === "codex" && !values["codex-dir"]) throw Error("Supply --codex-dir explicitly");
  if (!values["codex-dir"] && !values["claude-dir"] && !values.github && !values.gitee && !values.gitlab)
    throw Error("Choose an explicit input; no home directory discovery");
  const source = values.only === "claude" || (!values["codex-dir"] && values["claude-dir"])
    ? await collectClaude(values["claude-dir"]!, year, tz)
    : values["codex-dir"] ? await collectCodex(values["codex-dir"], year, tz) : undefined,
    sources = source?.days.length ? [source] : [];
  const provenance: ActivityBundle["provenance"] = source?.days.length
    ? [
        {
          id: source.provenanceIds[0],
          adapter: source.id,
          version: "m2",
          method: "local",
          status: "fixture-tested",
        },
      ]
    : [];
  if (values["codex-dir"] && values["claude-dir"] && values.only !== "claude" && values.only !== "codex") {
    const claude=await collectClaude(values["claude-dir"],year,tz);
    if(claude.days.length){sources.push(claude);provenance.push({id:'claude-local',adapter:'claude',version:'m2',method:'local',status:'fixture-tested'});}
  }
  if (!values.offline && !values.only)
    for (const provider of ["github", "gitee", "gitlab"] as const) {
      const h = values[provider];
      if (h) {
        sources.push(await fetchCalendar(provider, h, year));
        provenance.push({
          id: provider + "-public",
          adapter: provider,
          version: "m2",
          method: "public-http",
          status: registry.find(r=>r.id===provider)!.status,
        });
      }
    }
  const bundle = ActivityBundle.parse({
      schema: "vibeskyline.activity.v1",
      year,
      generatedAt: new Date().toISOString(),
      sources,
      provenance,
      reconciliation: [],
    }),
    json = JSON.stringify(bundle, null, 2) + "\n";
  if (values.json || values["dry-run"]) process.stdout.write(json);
  else {
    const tint =
        process.env.NO_COLOR !== undefined ? "" : "\x1b[38;2;217;107;67m",
      reset = process.env.NO_COLOR !== undefined ? "" : "\x1b[0m";
    process.stdout.write(
      `${tint}▁▃▂▅▇▄▂▆▃▁${reset}  VibeSkyline\n${sources.length} sources · ${sources.reduce((n, s) => n + s.days.length, 0)} observed source-days · 0 raw logs sent\n`,
    );
  }
  if (!values["dry-run"])
    await writeFile(values.output ?? `vibeskyline-${year}.json`, json, {
      mode: 0o600,
    });
}
main().catch(() => {
  process.stderr.write(
    "VibeSkyline failed: check input format, year, timezone, directory permissions or calendar connectivity. No raw content logged.\n",
  );
  process.exitCode = 1;
});
