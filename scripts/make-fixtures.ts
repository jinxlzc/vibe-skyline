import { writeFile, mkdir } from "node:fs/promises";
import { zstdCompressSync } from "node:zlib";
const root = "fixtures/adapters/codex";
await mkdir(root + "/sessions", { recursive: true });
await mkdir(root + "/archived_sessions", { recursive: true });
const usage = (input: number, output: number) => ({
  input_tokens: input,
  output_tokens: output,
  cached_input_tokens: Math.floor(input / 2),
  reasoning_output_tokens: Math.floor(output / 2),
  total_tokens: input + output,
});
const event = (
  timestamp: string,
  input: number,
  output: number,
  cumulative: number,
) => ({
  timestamp,
  type: "event_msg",
  payload: {
    type: "token_count",
    info: {
      last_token_usage: usage(input, output),
      total_token_usage: usage(cumulative, Math.floor(cumulative / 4)),
    },
    private_prompt: "CANARY_PRIVATE_PROMPT",
    path: "/SYNTHETIC_CANARY_PATH",
  },
});
const rows = [
  {
    type: "session_meta",
    payload: { id: "synthetic-session-1", cwd: "/SYNTHETIC_CANARY_PATH" },
  },
  {
    type: "event_msg",
    timestamp: "2026-01-02T10:00:00Z",
    payload: {
      type: "token_count",
      info: { total_token_usage: usage(8000, 2000) },
    },
  },
  event("2026-01-02T12:00:00Z", 100, 20, 8100),
  event("2026-01-02T12:01:00Z", 100, 20, 8100),
  event("2026-01-02T23:30:00Z", 200, 40, 8300),
  event("2026-01-03T12:00:00Z", 50, 10, 8350),
  { type: "response_item", payload: { text: "CANARY_SECRET_TOKEN_123" } },
];
const text =
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n{malformed\n";
await writeFile(root + "/sessions/plain.jsonl", text);
await writeFile(
  root + "/sessions/compressed.jsonl.zst",
  zstdCompressSync(text),
);
await writeFile(root + "/archived_sessions/copy.jsonl", text);
await writeFile(
  "fixtures/calendars/github.html",
  `<td id="a" data-date="2026-01-01" data-level="0"></td><td id="b" data-date="2026-01-02" data-level="2"></td><tool-tip for="a">No contributions on January 1st.</tool-tip><tool-tip for="b">1,234 contributions on January 2nd.</tool-tip>`,
);
await writeFile(
  "fixtures/calendars/gitee.txt",
  `window.calendar = "<span data-content='9个贡献：2025-12-31' date='20251231'></span><span data-content='0个贡献：2026-01-01' date='20260101'></span><span data-content='7个贡献：2026-01-02' date='20260102'></span>"; NEVER_EXECUTE_SYNTHETIC();`,
);
await writeFile(
  "fixtures/calendars/gitlab.json",
  JSON.stringify({ "2025-12-31": 8, "2026-01-01": 0, "2026-01-02": 6 }),
);
