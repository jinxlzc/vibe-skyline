import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ActivityBundle, SourceSeries } from "../packages/contracts/src/index";
import { startLiveServer } from "../apps/web/live-server";
if (process.env.LIVE !== "1") {
  console.log("Skipped: opt in with LIVE=1");
  process.exit(0);
}
const exec = promisify(execFile);
let failures = 0;
const evidence: unknown[] = [];
const output = "docs/acceptance/m3-live.json";
const usernames: Record<string,string> = { github: "torvalds", gitee: "jinxlzc" };
const year = new Date().getFullYear();
const { server, origin } = await startLiveServer();
try {
  for (const provider of ["github", "gitee"]) {
    const username = usernames[provider];
    try {
      const result = await exec(
        process.execPath,
        [
          "--import",
          "tsx",
          "packages/cli/src/index.ts",
          "--dry-run",
          "--json",
          "--codex-dir",
          "fixtures/adapters/codex",
          "--year",
          String(year),
          "--" + provider,
          username,
        ],
        { timeout: 25000, maxBuffer: 2 * 1024 * 1024 },
      );
      const b = ActivityBundle.parse(JSON.parse(result.stdout));
      if (!b.sources.some((s) => s.id === provider && s.days.length > 0))
        throw Error();
      evidence.push({provider, username, path:"CLI", status:"PASS", days:b.sources.find(s=>s.id===provider)!.days.length});
      console.log(`CLI ${provider}: PASS`);
    } catch {
      console.log(
        `CLI ${provider}: FAIL (request or parse failed; response not retained)`,
      );
      evidence.push({provider, username, path:"CLI", status:"FAIL"});
      failures++;
    }
    try {
      const r = await fetch(
        `${origin}/api/calendar/${provider}/${username}?year=${year}`,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!r.ok) throw Error(`HTTP_${r.status}`);
      const source = SourceSeries.parse(await r.json());
      evidence.push({provider, username, path:"dev relay", status:"PASS", http:r.status, year, metric:source.metric, days:source.days.length, first:source.days[0].date, last:source.days.at(-1)!.date, sha256:createHash('sha256').update(JSON.stringify(source)).digest('hex')});
      if (provider === 'github') {
        await mkdir('docs/examples/m3-online', {recursive:true});
        const bundle = ActivityBundle.parse({schema:'vibeskyline.activity.v1',year,generatedAt:new Date().toISOString(),sources:[source],provenance:[{id:'github-public',adapter:'github',version:'m3',method:'public-http',status:'verified'}],reconciliation:[]});
        await writeFile('docs/examples/m3-online/public-github-live.bundle.json', JSON.stringify(bundle,null,2)+'\n');
      }
      console.log(`dev proxy ${provider}: PASS`);
    } catch (error) {
      const detail =
        error instanceof Error && /^HTTP_\d+$/.test(error.message)
          ? error.message
          : (error as { cause?: { code?: string } }).cause?.code ===
              "ECONNREFUSED"
            ? "listener unavailable"
            : "request timeout or response/schema failure";
      console.log(
        `dev proxy ${provider}: FAIL (${detail}; response not retained)`,
      );
      evidence.push({provider, username, path:"dev relay", status:"FAIL", detail});
      failures++;
    }
  }
} finally {
  await server.close();
  await mkdir("docs/acceptance", {recursive:true});
  await writeFile(output, JSON.stringify({recordedAt:new Date().toISOString(),year,failures,evidence,gitlab:"not attempted; beta",ai:"synthetic fixtures only; not live verified"},null,2)+"\n");
}
process.exitCode = failures ? 1 : 0;
