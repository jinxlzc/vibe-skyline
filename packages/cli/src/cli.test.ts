import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ActivityBundle } from "@vibeskyline/contracts";
const exec = promisify(execFile),
  root = fileURLToPath(new URL("../../../", import.meta.url));
it("CLI fixture-only dry run, offline zero-network path, output and NO_COLOR receipt", async () => {
  const flags = [
    "--codex-dir",
    join(root, "fixtures/adapters/codex"),
    "--year",
    "2026",
    "--tz",
    "UTC",
    "--offline",
    "--github",
    "INVALID@HANDLE",
  ];
  const first = await exec(
    process.execPath,
    [
      "--import",
      "tsx",
      join(root, "packages/cli/src/index.ts"),
      "--dry-run",
      "--json",
      ...flags,
    ],
    { cwd: root },
  );
  const b = ActivityBundle.parse(JSON.parse(first.stdout));
  expect(b.sources[0].days.map((d) => d.value)).toEqual([360, 60]);
  expect(first.stdout).not.toContain("CANARY");
  const dir = await mkdtemp(join(tmpdir(), "vibeskyline-test-"));
  try {
    const file = join(dir, "bundle.json"),
      r = await exec(
        process.execPath,
        [
          "--import",
          "tsx",
          join(root, "packages/cli/src/index.ts"),
          "export",
          "-o",
          file,
          ...flags,
        ],
        { cwd: root, env: { ...process.env, NO_COLOR: "1" } },
      );
    expect(r.stdout).toContain("0 raw logs sent");
    expect(r.stdout).not.toContain("\x1b");
    expect(
      ActivityBundle.parse(JSON.parse(await readFile(file, "utf8"))).sources,
    ).toHaveLength(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);
it('explicit Claude reader and doctor use fixtures and the shared status vocabulary',async()=>{
 const args=['--import','tsx',join(root,'packages/cli/src/index.ts')];
 const r=await exec(process.execPath,[...args,'--dry-run','--json','--offline','--only','claude','--claude-dir',join(root,'fixtures/adapters/m2/claude-home'),'--year','2026','--tz','UTC'],{cwd:root});
 const bundle=ActivityBundle.parse(JSON.parse(r.stdout));expect(bundle.sources[0].days[0].value).toBe(25);expect(r.stdout).not.toContain('CANARY');
 const d=await exec(process.execPath,[...args,'doctor','--codex-dir',join(root,'fixtures/adapters/codex'),'--offline'],{cwd:root});
 const entries=JSON.parse(d.stdout);expect(entries.find((e:any)=>e.id==='claude').status).toBe(bundle.provenance[0].status);expect(entries.every((e:any)=>e.reason&&e.evidence.length)).toBe(true);
});

it("exports a public identity only for explicit calendar flags", async () => {
  const mock = `globalThis.fetch = async url => {
    if (url === "https://gitlab.com/users/maple/calendar.json")
      return new Response('{"2026-01-01":4}');
    throw Error("Unexpected calendar request");
  }`;
  const args = ["--import", "data:text/javascript," + encodeURIComponent(mock), "--import", "tsx",
    join(root, "packages/cli/src/index.ts"), "--dry-run", "--json",
    "--codex-dir", join(root, "fixtures/adapters/codex"), "--year", "2026", "--tz", "UTC"];
  const options = {cwd: root, env: {...process.env, USER: "private-account-CANARY",
    GITHUB_USER: "private-github-CANARY", GITLAB_USER: "private-gitlab-CANARY"}};
  const withFlag = await exec(process.execPath, [...args, "--gitlab", "maple"], options);
  const withoutFlag = await exec(process.execPath, args, options);
  const selected = ActivityBundle.parse(JSON.parse(withFlag.stdout)).sources;
  expect(selected.find(s => s.id === "gitlab")?.publicIdentity).toEqual({
    provider: "gitlab", kind: "username", value: "maple", provenance: "explicit-public-handle",
  });
  expect(selected.find(s => s.id === "codex")?.publicIdentity).toBeUndefined();
  expect(withoutFlag.stdout).not.toContain("publicIdentity");
  expect(withFlag.stdout + withoutFlag.stdout).not.toContain("CANARY");
  await expect(exec(process.execPath, [...args, "--gitlab", "glpat-CANARY"], options))
    .rejects.toMatchObject({stdout: "", stderr: expect.not.stringContaining("CANARY")});
}, 30000);

it('optional helper requires explicit input and never discovers home directories', async () => {
  await expect(exec(process.execPath, ['--import','tsx',join(root,'packages/cli/src/index.ts'),'--offline','--dry-run','--json'], {cwd:root}))
    .rejects.toMatchObject({stdout:'', stderr:expect.stringContaining('VibeSkyline failed')});
});
