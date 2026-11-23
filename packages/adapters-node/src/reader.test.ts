import { it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { collectCodex, decodeZstd } from "./index";
import { readFile } from "node:fs/promises";
import { decompress } from "fzstd";
import { codexParser, aggregateCodex } from "@vibeskyline/adapters-core";
const root = fileURLToPath(
  new URL("../../../fixtures/adapters/codex", import.meta.url),
);
it("plain + zstd + archived duplicates + repeated snapshots sum deltas only; canaries drop", async () => {
  const result = await collectCodex(root, 2026, "UTC");
  expect(result.days.map((d) => [d.date, d.value])).toEqual([
    ["2026-01-02", 360],
    ["2026-01-03", 60],
  ]);
  expect(JSON.stringify(result)).not.toMatch(
    /CANARY|SYNTHETIC_CANARY_PATH|8000/,
  );
  expect(result.days[0].tokens).toEqual({
    in: 300,
    out: 60,
    cacheRead: 150,
    reasoning: 30,
  });
  expect(result.days[0].tokens).not.toHaveProperty("cacheWrite");
});
it("browser fallback and native zstd agree; timezone changes day buckets", async () => {
  const bytes = await readFile(root + "/sessions/compressed.jsonl.zst");
  expect([...decodeZstd(bytes)]).toEqual([...decompress(bytes)]);
  const observations = await codexParser.parse(decompress(bytes));
  expect(
    aggregateCodex(observations, 2026, "Asia/Shanghai").days.map(
      (d) => d.value,
    ),
  ).toEqual([120, 300]);
});
