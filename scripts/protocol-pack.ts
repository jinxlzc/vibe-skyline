import { readFile, writeFile } from "node:fs/promises";
import { zipSync } from "fflate";
const files: Record<string, Uint8Array> = {};
for (const [src, dst] of [
  ["spec.md", "spec.md"],
  ["activity-v2.schema.json", "activity.schema.json"],
  ["synthetic.bundle.json", "synthetic.bundle.json"],
])
  files[dst] = new Uint8Array(
    await readFile(`packages/contracts/protocol/${src}`),
  );
const pack = zipSync(
  Object.fromEntries(
    Object.entries(files).map(([name, bytes]) => [
      name,
      [bytes, { mtime: new Date("2026-01-01T00:00:00Z") }],
    ]),
  ),
  { level: 9 },
);
// Internal fixture only: never write to the website public directory.
await writeFile("packages/contracts/protocol/offline-pack.zip", pack);
