> M6 current product scope: GitHub / Gitee / GitLab (beta) contribution calendars only. One source = one independent model. No activity-file import, agent prompt or public protocol distribution. GitHub/Gitee official defaults and kill switches remain as documented in [M6 notes](../M6_NOTES.md). The design below is historical and does not override M6.

> M5 owner correction takes precedence over all historical combination/layout/default-logo proposals below: one source = one independent model, first-edition sloped plinth and front logo–ID–year lockup. Multiple inputs produce switchable, separately exported models. Official marks are not bundled; local BYO SVG is supported. See [M5 notes](../M5_NOTES.md).

> M3 course correction (takes precedence over historical collector plans below): the primary flow is a zero-install public GitHub/Gitee username website. AI/file import and explicit one-shot CLI are optional; no daily tasks, resident collectors or forced CLI. See [M3 report](M3_ONLINE_REPORT.md).

> Redacted copy: personal usage figures, machine inventory and owner-specific names/examples removed. Generic documented source discovery paths remain. The Milestone 1 owner brief overrides this design.

# VibeSkyline — Design & Build Spec (v1.0, 2026-11-20)

> **What this is:** the converged build spec for **VibeSkyline** (repo `vibeskyline`), produced from 13 rounds of Codex ⇄ Gemini design iteration (log: `rounds.md`, raw outputs: `raw/`) plus the coordinator's own verification of data sources (`VERIFIED_DATA.md`) and final judgment. It is written to be handed to a coding agent. Section 15 lists where the coordinator deliberately overrides the converged draft; section 16 records dissent; section 17 lists decisions only the owner (the owner) can make.
>
> **Status words:** *MUST* = launch blocker; *SHOULD* = launch target, may slip; *LATER* = explicitly out of MVP. Numbers in mm are engineering targets to be physically qualified, not claims of finished testing.

---

## 0. One-page brief

**Slogan:** “Your year, built.” / **“把这一年，筑成天际线。”**

**Product:** VibeSkyline turns a developer's year — Git contributions (GitHub / Gitee / GitLab) **plus** AI coding-agent usage (Codex, Claude Code, Gemini/Antigravity, Cursor, Copilot, DeepSeek, Kimi, Qwen, Doubao, GLM, MiniMax, Trae, CodeBuddy, 通义灵码 …) — into **one** rotatable 3D skyline on a plinth that carries **the year, the username, and the real logos of every source**, and exports it for 3D printing (multi-color 3MF for Bambu/Orca, STL) and for social sharing (bilingual cards).

**What the viral hit looks like:** someone posts a photo of a small architectural object next to their keyboard: four colored "districts" (e.g. GitHub + Codex + Gemini + DeepSeek), a clipped-corner plinth, `2026`, their name, and four embossed logos. Followers play *Guess my stack*, then type their own GitHub/Gitee handle on the site (no login), watch a 7.5-second reveal, run `npx vibeskyline` to add their local AI agents, copy the look ("一键抄作业"), and either print it (two-tone on any printer, or 4-color AMS) or send a ready-made pack to a 淘宝/闲鱼 print shop. A week later real desk photos start the second wave.

**Why it's not a clone:** `tokscale` (MIT core / AGPL web) already parses ~60 agents and has a 3D web graph, a Wrapped image and a leaderboard; `ccusage` aggregates the major CLIs; `gh-skyline` / gh-skyline.dev / monolith do GitHub-only printable skylines. **Nobody** combines Git + AI into one printable object with real logos, faithful multi-color export, honest coverage, and Chinese-ecosystem support. VibeSkyline **imports tokscale/ccusage output** for breadth and wins on the object.

**MVP (target: release candidate Dec 23, 2026; owner decides public launch):**

| Area | MVP commitment |
|---|---|
| Collection | Public GitHub / Gitee / GitLab calendars (no login); native Codex (`.jsonl` + `.jsonl.zst`), Claude Code, Gemini CLI, Qwen Code; `tokscale` + `ccusage` JSON import; vendor CSV/ZIP import (Cursor, Copilot, DeepSeek, GLM, Ark); manual CSV; Antigravity = 2-day timeboxed Beta |
| Combination | 1–6 sources merged into one model; **Annual Districts** (default) + **Compact Stack** physically qualified; Daily Lanes + Normalized Blend shipped as *Maker Preview* |
| Identity | Plinth = year + printable name (Latin + CJK) + real source logos ON by default; neutral-glyph toggle |
| Color | 6 themes; per-source / base / text / logo overrides; height bands; live in 3D; physical palette is what gets exported |
| Printing | Mono STL; **Two-Tone** (one filament change at plinth top); verified Bambu/Orca multi-color 3MF; Core 3MF; print-shop pack |
| Sharing | 7.5 s reveal; X / 小红书 (4 slides) / 朋友圈 / 即刻 cards; Guess-my-Stack pair; style-only look links; README SVG |
| Privacy | Raw logs never leave the machine; local CLI aggregation or in-browser parsing; no raw-upload endpoint; optional Ed25519-signed bundles |
| Proof | 6 real printed objects + 2 logo/typography calibration plates + 1 external print-shop order before launch |

**LATER:** accounts, hosted sharing / dynamic OG images, video export, team panoramas, year-vs-year (Wave 1.5), official usage APIs (Moonshot, Ark), modular trays/terraces, any leaderboard (never global token leaderboards).

---

## 1. Positioning & principles

1. **The object is the protagonist.** Charts and stats support the object; every screen answers "what will be on my desk".
2. **Combination is the headline.** Single-source is the degenerate case of the multi-source model, not the other way round.
3. **Honest data.** Unknown ≠ zero. Commits, tokens, credits and premium requests are never summed into one score. Every card states its scale and coverage ("各来源独立归一化 · AI记录不完整 · 截至2026-11-20").
4. **Local-first privacy.** Raw session logs are parsed on the user's machine (CLI or browser Web Worker) and immediately reduced to daily aggregates. There is no endpoint that accepts raw logs.
5. **Real logos, real craft.** Platform marks are ON by default (owner decision) and engineered to print; neutral mode is one click away.
6. **Chinese ecosystem first-class.** Gitee, Chinese models, CJK names on the plinth, 小红书/朋友圈/即刻 kits, 淘宝 print-shop flow, bilingual parity (`zh-CN` + `en`).
7. **Anti-vanity.** No global token/spend leaderboard. Social energy goes to *Guess my stack*, *Use this look*, *Desk Proof Wall*, and (later) year-vs-year and friend/team objects.

---

## 2. User flow

### 2.1 First ten seconds
- Landing shows a combined **4-source Hero Specimen** (lightweight isometric SVG first, Three.js lazy), badged **示例数据 / Sample**.
- One input: GitHub / Gitee / GitLab handle + year → personal calendar renders with no login, no modal.
- Below it: `npx vibeskyline` (with npmmirror variant for mainland) and a drop zone ("drop tokscale/ccusage JSON, CSV exports, or log folders").
- "Remix this look / 一键抄作业" copies style only, never activity.
- Sample AI can be mixed into a personal preview only with a persistent label "个人日历＋示例AI"; personal Wrapped/print exports require removing sample series.

### 2.2 Four entry paths
1. **Public handle** via relay (web) or direct fetch (CLI).
2. **Local collector** `npx vibeskyline` → ledger + portable JSON bundle → Studio.
3. **Browser import** (bundles, aggregator JSON, CSV/ZIP, uncompressed and `.zst` logs) in cancellable Web Workers.
4. **Manual CSV** (`date,source,metric,value,timezone,quality`) with explicit units and permanent `manual` provenance.

### 2.3 Studio (4 tabs + persistent footer)
- **Sources / 数据源:** handles, imports, 1–6 groups, Tool-vs-Provider grouping, coverage timeline, overlap reconciliation.
- **Shape / 形态:** layout, date window, max height, normalization γ, year, printable name, logo mode.
- **Colors / 配色:** theme, per-source/base/text/logo colors, height bands, print tier, hardware slots.
- **Share & Print / 分享与打印:** reveal, cards, Guess pair, look link, exports, print-shop pack.
- Footer always shows real `W × D × H mm`, coverage status, source count, material count, printer fit, qualification badge. Blocking issues only: unresolved overlap, unsupported units, invalid geometry, unresolved material capacity.

### 2.4 Partial history (very common — verified)
In a private example, Codex logs cover only a short retained period and Claude Code deletes transcripts after ~30 days by default. So:
- If AI coverage < 112 days, **recommend** a shared **Recent Sprint** window (28 / 56 / 91 days) or calendar Q4 with before/after preview; never silently crop.
- Full-year designs before Dec 31 say **"2026 · 截至目前 / Year so far"**.
- Unknown dates get `0.40 mm` recessed cells where structurally valid (per district in Annual Districts; only fully-unknown cells in Stack/Blend). Future dates are omitted.
- Copy: "First retained record: Oct 12" — never "You adopted AI in October".
- Retention hook: "Save what's still on disk: run `npx vibeskyline snapshot` weekly."

---

## 3. Data acquisition — workstream #1

One engineer owns acquisition from day 1. Preference order: **verified local files → official exports / read-only official APIs → aggregator import → guided manual data.** Unofficial account-session scraping (Cursor cookie, DeepSeek web token) is **excluded from MVP** (ToS/credential risk); may return later as explicit opt-in.

Capability status is attached to *method + producer version*: `qualified` | `beta` | `via-aggregator` | `manual-only` | `unavailable`. "Chinese first-class" = real identity, logo, localized guide, attribution and a truthful route — not invented API coverage.

### 3.1 Feasibility matrix (✅ = coordinator verified by real request / on the owner's machine / official doc, 2026-11-20)

| Source | Method · auth | Granularity · history | Reliability · legal/ToS risk | MVP route |
|---|---|---|---|---|
| **GitHub** | ✅ `GET github.com/users/<u>/contributions?from=YYYY-01-01&to=YYYY-12-31` → HTML, 365 `data-date` cells + `data-level` 0–4; exact counts only in `<tool-tip>` text ("4 contributions on January 4th."). **No CORS** → relay or CLI. ✅ GraphQL `contributionsCollection` needs a token (unauth 403); REST `/events/public` ≈ 90 days only | Daily, any year | HTML drift risk (fixture tests); public page, low risk; respect rate limits | Native via relay/CLI; private contributions via user's token = LATER |
| **Gitee 码云** | ✅ `GET gitee.com/<u>/contribution_calendar?year=YYYY` with `X-Requested-With: XMLHttpRequest` → JS string containing cells `data-content='N个贡献：YYYY-MM-DD' date='YYYYMMDD'`; no auth; default rolling 12 months; `?year=2024` returned 2023-12-31..2024-12-31 (coordinator tested public handles). ✅ OpenAPI v5 `/api/v5/users/<u>` and `/events/public` work (CORS `*`) but events are sparse — not a calendar | Daily counts | **Unofficial endpoint**, medium drift; parse as text, **never execute** the JS; trim boundary overlap | Native parser + fixtures (relay/CLI) |
| **GitLab** | ✅ `GET gitlab.com/users/<u>/calendar.json` → `{"YYYY-MM-DD": n}`; no auth; no CORS; same path on self-hosted | Daily, rolling ~12 months (no arbitrary past year) | Stable, low risk | Native; relay only gitlab.com, self-hosted via CLI |
| **Codex CLI** | ✅ `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl[.zst]` + `~/.codex/archived_sessions/` (private file counts redacted). Lines `{timestamp, type:"event_msg", payload:{type:"token_count", info:{last_token_usage, total_token_usage, model_context_window}}}`; keys `input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens, reasoning_output_tokens, total_tokens`. ✅ Node `zlib.zstdDecompressSync` decodes natively | Per-event timestamps; history = whatever is still on disk (private usage figures redacted) | Local, no ToS issue; dedupe archive copies & repeated snapshots | **Native qualified** (CLI + browser via `fzstd`) |
| Codex cloud / ChatGPT | No personal token-history export found | — | — | Manual only |
| **Claude Code** | `~/.claude/projects/**/*.jsonl` (+ `~/.claude/transcripts/`, `~/.config/claude/projects/`); assistant `message.usage {input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens}`; dedupe by `message.id + requestId`, final revision | Per message; **default cleanup ≈30 days** | Local; low risk | Native qualified (fixture validation required) |
| **Gemini CLI** | ✅(source code) `~/.gemini/tmp/<projectHash>/chats/*.json(l)`, `messages[]` where `type:"gemini"`, `tokens {input, output, cached, thoughts, tool, total}` (cached ⊂ input), `model`, `timestamp` | Per message | Schema drift (ccusage marks Beta) | Native qualified |
| **Antigravity CLI / IDE** | ✅ `~/.gemini/antigravity-cli/conversations/*.db` (agy example; tables `steps, gen_metadata, trajectory_meta…`, protobuf blobs); IDE: `~/.gemini/antigravity/conversations/*.db`. tokscale (MIT) reads it directly | Per step | Protobuf schema undocumented; live WAL → must use SQLite online backup, never copy files | **2-day timeboxed Beta**; else via tokscale |
| **Cursor** | No token counts on disk. ✅(docs) Admin API is **team-only**; personal data via dashboard "Export CSV" (columns `Date, Kind, Model, Input (w/ Cache Write), Input (w/o Cache Write), Cache Read, Output Tokens, Total Tokens, Cost`). Undocumented cookie endpoints exist (used by tokscale) | Per event, exported range | Cookie/session extraction = medium ToS risk → excluded | CSV importer (qualified on fixture) |
| **GitHub Copilot** | CLI: `~/.copilot/session-store.db` (`assistant_usage_events`) + `~/.copilot/otel/*.jsonl`; personal "AI usage" CSV (≤31 days/export); REST `GET /users/{u}/settings/billing/premium_request/usage` (premium requests, 24 months, token auth) | Requests ≠ tokens | Official; metric must stay `premium_requests` | CSV + aggregator; native/API LATER |
| **DeepSeek** | ✅(docs) API key reads only `/user/balance`. Daily tokens only via platform web-session endpoints (`/api/v0/usage/...`) — excluded. Console monthly export ZIP (`amount-YYYY-M.csv`). Local: DeepSeek Harness `~/.dsh/sessions/**/session.jsonl.zstd`. Also DeepSeek models used inside Claude Code/OpenCode (routed) | Daily via export; UI window ≤30 days | Export = safe; session token = ToS risk | ZIP/CSV import + routed attribution + aggregator |
| **Kimi / Moonshot** | ✅(official docs) Admin API `GET api.moonshot.cn/v1/admin/organizations/usage/completions?start=<ms>&end=<ms>&granularity=1d` (Admin Key with `billing:read`; ≤93 days/window; CST days; prompt/completion/cached tokens, request_count); daily bills kept 365 days. Local: `~/.kimi/sessions/`, `~/.kimi-code/sessions/` | Daily, up to 365 days | Official; org scope may exceed personal use | Aggregator + routed + manual in MVP; Admin API **LATER (Wave 2)** |
| **Qwen / 通义** | ✅(official) Qwen Code ledger `~/.qwen/usage/token-usage-YYYY-MM.jsonl` + `/stats export daily|monthly --format csv|json`; also `~/.qwen/projects/`. Bailian: `bl monitor metrics` / console | Per event / daily | Official local ledger = very reliable; prefer ledger over projects | **Native qualified** |
| **Doubao / Volcengine Ark (Trae CN)** | ✅(official) OpenAPI `GetInferenceUsage` (AK/SK signed; `QueryInterval=Day`; InputTokens/OutputTokens/TotalTokens/ReqCnt; ApiKeyID filter); `arkcli usage stats --interval Day`; `ListBillDetail` monthly (≤24 months, money) | Daily | Official | `arkcli` JSON/CSV import + routed; native API LATER |
| **Zhipu GLM / Z.ai / CodeGeeX** | ✅(docs) no public PAYG token-history API; console 费用账单→导出记录 CSV. Coding Plan `GET open.bigmodel.cn/api/monitor/usage/quota/limit` = quota % only. Local ZCode `~/.zcode/cli/db/db.sqlite` (via tokscale); GLM routed via Claude Code | Export-dependent | CSV schema unverified → mapper | CSV + routed + aggregator |
| **MiniMax** | Routed models (MiniMax-* in Claude Code/OpenCode); console export format unverified | — | — | Identity + logo + guide; routed/manual |
| **Trae** | Personal edition shows **credits, not tokens**; enterprise console exports tokens; tokscale syncs via account API | Credits / tokens kept separate | — | Aggregator + credit/token CSV |
| **CodeBuddy** | Local `~/.codebuddy/projects/**/*.jsonl` (+ `/cost`); web = credits | Per event | — | Aggregator; native LATER |
| **通义灵码 Lingma** | No personal token export found | — | — | Guide + manual import |
| **Others** (OpenCode, Amp, Windsurf, Kiro, Cline/Roo, Aider, OpenRouter, Warp, Droid…) | Via tokscale / ccusage schemas or mapped CSV | Producer-dependent | Don't equate an upstream brand list with verified compatibility | Registry + aggregator |
| **Aggregators** | `tokscale graph --output data.json`; `ccusage daily --json` | Daily | Pin real schemas from fixtures; keep MIT notices; never reuse tokscale's AGPL web code | **First-class importers** |

**Routed-model attribution:** the same observation keeps both `client` (Claude Code) and `provider` (DeepSeek) — UI offers Tool view vs Provider view; regrouping never duplicates. Model alias → provider is a *suggestion* shown in reconciliation, not silent truth. Unknown stays "unattributed".

### 3.2 Collector CLI — `npx vibeskyline`

```sh
npx vibeskyline                       # detect agents, aggregate, terminal receipt, write bundle
npx vibeskyline --github alice --gitee a_cn --gitlab bob
npx vibeskyline studio                # optional offline Studio (@vibeskyline/studio-local)
npx vibeskyline snapshot              # update ~/.vibeskyline/ledger.v1.json (run weekly)
npx vibeskyline import <paths...>     # tokscale/ccusage JSON, vendor CSV/ZIP
npx vibeskyline export -o 2026.json [--sign]
npx vibeskyline verify <bundle.json>
npx vibeskyline badge --year 2026 --out .github/
npx vibeskyline doctor [--verbose]    # parser versions, coverage, no content
# flags: --year --tz --only codex,claude --dry-run --json --offline --with-tokscale --no-open
```

- **Detect → preview → write.** Prints the sources found, date ranges, observed days and coverage, then a 24-bit **ANSI mini-skyline receipt** ("4 tools · 248 observed days · Local-only · 0 raw logs sent"), respects `NO_COLOR`. `--dry-run` prints the exact JSON that would be written.
- **Never** executes competing collectors silently; `--with-tokscale` shows and runs an already-installed binary only.
- **Output:** `vibeskyline-2026.json` (portable bundle ≤ 2 MiB, typically tens of KiB) + ledger update. Handoff to web = user drags the bundle into hosted Studio (no localhost fetches → no Private-Network-Access breakage), or runs `npx vibeskyline studio` (loopback `127.0.0.1`, random 256-bit token in URL fragment, Host/Origin checks, idle shutdown 30 min).
- **Ledger** `~/.vibeskyline/ledger.v1.json` (+ `.bak`, `.lock`, `install.secret`, `signing.key`): daily buckets + opaque HMAC event keys/revision indexes/counter checkpoints so rescans replace rather than double-count, and deleted upstream logs don't erase preserved days. Atomic write (lock → temp → fsync → rename → backup). No raw messages.
- **Signed upload/share (owner asked "optional signed upload"):** MVP ships **local Ed25519 signing** over RFC 8785 canonical JSON (`export --sign`, `verify`). It proves integrity + key continuity, **not** that the usage is genuine. Hosted upload of signed aggregates is LATER and would accept only explicitly selected aggregates, never raw sessions.
- **Runtime:** Node ≥ 22.15 target (see §15 override), feature-detect zstd/sqlite and fail with an actionable message. Zero telemetry, no postinstall scripts. Size budget: CLI compressed closure ≤ 1.5 MiB (measured, not a blocker); offline Studio separate.
- **Browser drop path:** `.jsonl`, `.jsonl.zst` (via `fzstd` in worker — see §15), JSON, CSV/ZIP. Limits: 50 MiB compressed/file, 256 MiB expanded/file, 512 MiB/batch, 5,000 files, reject nested/encrypted archives, warn at > 50:1 ratio; UTF-8/BOM and GB18030/GBK sniffing for Chinese CSVs. SQLite inputs → hand off to CLI.

### 3.3 Adapter interfaces

```ts
// packages/contracts
export interface AdapterManifest {
  id: string;                       // "codex", "gitee", "deepseek-export"…
  brand: string;                    // logo registry key
  methods: Array<"local" | "file" | "public-http" | "official-api" | "aggregator" | "manual">;
  metric: Metric;
  status: "qualified" | "beta" | "via-aggregator" | "manual-only";
  producerVersions: string[];       // fixture-backed
  runtimes: Array<"node" | "browser">;
}
export interface PureParser {        // browser + node; bytes in, observations out
  manifest: AdapterManifest;
  sniff(prefix: Uint8Array, hint: FileHint): MatchScore;
  parse(bytes: AsyncIterable<Uint8Array>, ctx: ParseContext): AsyncIterable<NormalizedObservation>;
}
export interface LocalReader {       // node only: discovery, SQLite snapshots, zstd
  manifest: AdapterManifest;
  discover(env: HostEnv): Promise<LocalTarget[]>;
  read(t: LocalTarget, ctx: ParseContext): AsyncIterable<NormalizedObservation>;
}
export interface PublicCalendarFetcher { // github / gitee / gitlab
  manifest: AdapterManifest;
  fetchYear(handle: string, year: number, http: HttpClient): Promise<SourceSeries>;
}
```
Parsers drop prompts, code, paths, repo names and tool args immediately. Observations keep only: opaque event id, timestamp/date, usage numbers, client/provider/model, revision/counter metadata, provenance. ESLint import boundaries keep Node-only deps out of browser bundles.

---

## 4. Canonical data model & accounting

```ts
type Metric = "contributions" | "tokens" | "events" | "credits" | "premium_requests" | "activity_level";
type DayState = "observed" | "known-zero" | "unknown" | "future";

interface DailyValue { date: string; value: number | null; state: DayState;
  completeness: "complete" | "partial" | "unknown"; quality: "reported" | "derived" | "estimated" | "manual";
  tokens?: { in: number; out: number; cacheRead?: number; cacheWrite?: number; reasoning?: number } }

interface SourceSeries { id: string; client: string; provider?: string; model?: string;
  accountingProfile: string; scopeId: string; metric: Metric; unitScale: number;
  calendar: { timezone?: string; dateBasis: "timestamp-derived" | "source-reported" };
  coverage: Array<{ from: string; to: string; kind: "full" | "partial" }>;
  days: DailyValue[]; provenanceIds: string[] }

interface ActivityBundle { schema: "vibeskyline.activity.v1"; year: number; generatedAt: string;
  sources: SourceSeries[]; provenance: AdapterProvenance[];
  reconciliation: ReconciliationDecision[]; attestation?: Attestation }
```

Rules (MUST, each with fixtures):
- **Token semantics:** `total = in + out`; `cacheRead/cacheWrite ⊂ in`, `reasoning ⊂ out` — never added twice. Adapters convert disjoint vendor fields (Claude, Cursor) into this inclusive form.
- **Codex:** sum `last_token_usage` deltas per stable event; dedupe archive copies and repeated snapshots (fixture-proven); never assign an unknown opening cumulative balance to the first retained day.
- **Claude:** final complete revision per `message.id + requestId`; suppress proven subagent echoes.
- **Gemini:** cached ⊂ input. **Qwen:** prefer usage ledger/export over `projects/`.
- **Aggregators:** keep producer semantics; daily summaries can't be event-deduped against native data → overlapping buckets require an explicit persisted decision (choose authority / declare disjoint / exclude). **Never silently sum.**
- Timestamped observations are bucketed in the chosen IANA timezone (default system, e.g. Asia/Shanghai); daily-only imports keep their source timezone and are flagged.
- Integers checked as safe (BigInt intermediates); credits fixed-point; money never converted to tokens.

---

## 5. Combination layouts (headline feature)

CAD frame: right-handed, Z-up, millimeters; weeks along +X, weekdays/districts along +Y. Reference process: 0.40 mm nozzle, 0.20 mm layers.

### 5.1 Calendar grid
With weekday offset `o`, day count `d`, pitch `p`: `N = ceil((o+d)/7)` columns (53, sometimes 54), tower footprint `b = p − 0.60`, `Gx = (N−1)p + b`, `G7 = 6p + b`. Default `p = 2.80 mm` → `b = 2.20`, `G7 = 19.00`. Week start explicit (default Sunday; Monday option — see §17). Bed-fit assist may shrink pitch in 0.05 mm steps to 2.60 mm; Sprint windows may enlarge pitch up to 5.20 mm; everything recomputes, never non-uniform stretching.

### 5.2 Four layouts

| Layout | Construction | Status |
|---|---|---|
| **Annual Districts** (default) | One full 7-row calendar per source, front-to-back on one flat plinth, 4.20 mm avenues, each district's logo on its left shoulder | Qualified for 1–4 sources; 5–6 experimental |
| **Compact Stack** | Per day, fixed-order colored bands stacked (no air gaps); logo legend with color key bars on the apron | Qualified for 1–4 sources |
| **Daily Lanes** | Each weekday cell split into source micro-lanes (2.00 / 1.80 / 1.60 mm for 2 / 3–4 / 5–6 sources), height ≤ min(16, 8w) mm | Maker Preview |
| **Normalized Blend** | One height per day = weighted mean of available normalized sources (unknown excluded, known-zero included); color = dominant source or height palette | Maker Preview |

Dimensions (Annual Districts): width `L + Gx + R` with `L ≥ max(18, logoWidth+4)`, `R ≥ 6` → **171.80 mm** for 53 columns. District depth `T = max(G7+0.60, logoHeight+4)`; total depth `A + S·T + (S−1)·4.20 + 4.00`, apron `A ≥ 16` → **4 sources ≈ 171.8 × 111.0 mm**, 6 sources ≈ 158.6 mm deep. Height profiles 18 or 22 mm above the 3.20 mm base.
Compact Stack: width `12 + Gx = 159.80 mm` (fits a 180 mm bed with 5 mm brim), depth `A + 1 + G7 + 4` = 46 mm (A=22) or 58 mm (two-row apron). Per-source ceiling `floor((22/S)/0.2)·0.2 mm`.
Note: 171.8 mm + 2×5 mm brim exceeds a 180 mm plate → footer offers tighter pitch, Compact Stack, shorter window or bigger plate (Model Fit vs Full-Plate Fit incl. ~35×35 mm prime tower).

### 5.3 Per-source normalization
Commits and tokens differ by 5+ orders of magnitude, so **default = independent per-source scale** (a tall day = high for *that* source). For positive days: `m` = median, `C` = P95 (nearest rank) if ≥ 20 positive days else max.
```
r(v) = ln(1 + min(v,C)/m) / ln(1 + C/m)
h(v) = quantize_0.20[ 0.80 + (H − 0.80) · r(v)^γ ],  γ = 0.78 (UI 0.55–1.00)
```
Known zero → 0 height; unknown → recess; outliers capped at C and flagged in the inspector. Option **Linked token scale** (shared across token sources with compatible metric/profile) is available; shared *linear* scale is the only one labelled "proportional". Weighted "effort" formulas (e.g. 3× output) are rejected. Normalization parameters + window are stored in the recipe; every card prints its scale label.

---

## 6. Color system (full customization)

- **Themes (MVP 6):** Porcelain Atelier 白瓷工作室 (`#EFECE6`/`#23262B`; sources `#2F5D8C #D96B43 #3A7D6B #7C5EA8 #C89B3C #B84A62`), Obsidian Desk 黑曜桌面 (`#181C22`/`#D6DCE5`; `#4CC9F0 #F77F00 #52B788 #B583FF #F4D35E #FF5D8F`), Cinnabar & Xuan 朱砂宣纸 (`#F2EAE0`/`#2B2523`; `#9E2A2B #2F4858 #C88D32 #4A6B5D #6C4675 #B85D3B`), Celadon & Ink 青瓷墨韵 (`#1B2428`/`#D8C39E`; `#7FB3A8 #D8A46F #5D8AA8 #C46D5E #A3B18A #E0C097`), Monochrome Architectural, Brand Palette (registry brand colors). Wave 1.5: Bauhaus Primary, Neon Dusk, Terracotta & Sand, Glacier Translucent 冰川透光.
- **Overrides:** every source, base/plinth, text, and logo color; **height mapping** = discrete height bands (K colors by Z) or continuous digital gradient that is mapped to approved finite physical bands before export.
- **Live preview:** the 3D view defaults to **Physical preview** (what the 3MF will actually contain); a divergent digital-only palette is visibly labelled. Design recipe vs Print recipe are separate objects; share cards of the physical object use the print recipe.
- **Print tiers:** (1) **Monochrome** – one material. (2) **Two-Tone Studio** – base up to Z = 3.20 mm in material A, everything above in B (towers, embossed text/logos): one extruder, two spools, one change "after the completed 3.20 mm base" (with 0.20 mm first layer: after layer 16) using the slicer's verified pause/color-change — no universal M600 promise. (3) **Multi-color** – each source its own filament, base/text/logo configurable.
- **Slot allocation:** track distinct materials, simultaneous slots, and sequential changes separately; hardware profiles 1-extruder-manual, 2/4/5/8 slots. 4 sources + distinct base = **5 materials** → over capacity on a 4-slot AMS requires an explicit choice: share base with a source, reuse identity colors, approve a previewed Oklab merge, switch tier, or unrestricted. Never silent recolor; adjacent stack bands never merge silently. Purge/time numbers only from an actual slice.

---

## 7. Logo pipeline & plinth identity

- **Default ON real marks** for: GitHub, Gitee, GitLab, OpenAI/Codex, Claude, Gemini, Antigravity, Cursor, Copilot, DeepSeek, Kimi, Qwen, Doubao, GLM/Zhipu, MiniMax, Trae, CodeBuddy, 通义灵码 (+ registry-extensible). In combined models every district/band/legend entry gets its logo. **Neutral Glyphs** mode (own CC0 geometric set) one click away; user-supplied SVG override supported (sanitized, stored locally).
- **Repo layout:**
  ```
  packages/logos/
    manifest.json                 # brand → source URL, revision, colors, sizes, license/trademark note
    originals/<brand>/<rev>.svg   # official vector as published by the owner (pinned by hash)
    print-masters/<brand>/<size>.svg  # reviewed printable redraws per physical size
    compiled/<brand>/<size>.json  # outlines after pipeline (CI artifact)
    proofs/                       # coupon photos
    licenses/TRADEMARKS.md
  ```
- **Pipeline:** `fast-xml-parser` → reject scripts/external refs/rasters/filters/masks/unoutlined text → flatten transforms and strokes (`svgpath`) → preserve fill-rule, holes/counters and disconnected islands (`clipper2-wasm`) → curve tolerance 0.03 mm, quantize 0.001 mm → measure features at physical size (min positive stroke 0.80 mm, min gap/hole 0.60 mm) → if failing, **enlarge** (10 → 14 → 16/18/22 mm) and re-layout; never fill defining counters or blindly thicken → extrude with `manifold-3d`: emboss 0.60 mm (default, needed for two-tone) or flush inlay Z 2.60–3.20 mm (multi-color) → each separately colored logo is a closed material region.
- **Plinth content:** year (5 mm start), printable name (Latin 4 mm / CJK 8 mm start, enlarge or reflow, never silently shrink below printable), logos (10 mm start, ~12.4 mm pitch). 3.20 mm plinth, 6×6 mm 45° clipped front-left corner (signature), 0.60 mm relief. Optional physical spec stamp from real output, e.g. `171.8 × 111.0 × 25.2 mm · 5 MATERIALS · 0.20 mm LAYER`.
- **Typography:** `harfbuzzjs` shaping + `opentype.js` outlines; bundled `Inter-Bold` + licensed `NotoSansSC-Bold` GB2312-L1 subset (3,755 chars); missing glyph → download one static full font (no per-character requests), supply local TTF/OTF, or edit; NFC normalize, grapheme-aware.
- **README trademark note (MUST):** "Platform names and logos are trademarks of their respective owners. VibeSkyline is an independent project, not affiliated with or endorsed by them. Logos are included so you can make a personal keepsake of your own usage; generating a model grants no trademark license, and commercial use/resale is your responsibility. Switch to Neutral Glyphs at any time." Never use any third-party mark as the VibeSkyline product icon (own icon: a miniature skyline with the clipped corner).

---

## 8. Geometry & export pipeline

- `ActivityBundle` + `BuildRecipe` (pure, hashed) → `BuildPlan` (bounds, material regions, identity paths, diagnostics) → meshes in a Web Worker. Preview uses instanced meshes from the **same** plan; export solids built separately.
- **Mesher:** exact grid-column B-rep for towers/bands (integer-micron Z intervals, side walls split at neighbors' breakpoints → no T-junctions), `manifold-3d` only for plinth + text/logo booleans. Material interiors never overlap; boundaries meet exactly; every component connects structurally. Mono STL = union of all parts.
- **Validation (MUST, CI):** manifold/closed/oriented, positive volume, no overlaps, no floating parts, min feature checks, Z quantized to 0.20 mm; independent checker (not the generator) + slicer fixtures.
- **Formats:** binary STL (mm), Core 3MF (`[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model`, unit mm, named parts, base materials, recipe metadata), **Bambu/Orca project-flavored 3MF** whose metadata (e.g. `Metadata/model_settings.config` part→extruder) is written **only from fixtures exported by pinned Bambu Studio/OrcaSlicer versions in week 1** and must not override the user's printer profile; PNG/SVG kits. GLB = Wave 1.5 (Y-up meters). Video = LATER.
- Deterministic: fixed ZIP order/timestamps, canonical hashes; byte-reproducible within a pinned toolchain.
- **Print-shop pack** `vibeskyline-2026-print-pack.zip`: exactly one root `PRINT_THIS_<tier>_<target>.3mf` (or `PRINT_THIS_MONO_mm.stl`), `taobao-quote-card.png` (dims, materials, swatches, "禁止缩放 · 0.4mm喷嘴 · 0.20mm层高 · 哑光PLA · 保留Logo细节 · 请报价（含换料废料与运费）并先发切片预览图"), `order-note.txt`, `spec-sheet.png`, `materials.json`, `recipe.json`, `backup-formats/`. No activity data by default; no prices, no checkout.

---

## 9. Share & viral features

- **Reveal (7.5 s, silent, skippable, reduced-motion aware):** 0–0.7 s plinth+year+name · 0.7–2.6 s primary calendar rises chronologically · 2.6–4.6 s AI districts assemble, logos land · 4.6–6.0 s hero camera (40° elev, −34° az) + factual callouts (observed days, Git+AI co-active days, busiest weekday per source, observed streak) · 6.0–7.5 s actions: Share / Guess / Copy look / Print.
- **Cards (deterministic layout, pinned fonts, physical-preview colors):** X 1200×675 · 小红书 4×1080×1440 ("我的2026代码天际线" → stack reveal → "一键抄作业" palette + plinth macro → "打印攻略") · 朋友圈 1080×1080 · 即刻 1080×1350 · shop quote 1080×1440 · engineering proof 1600×1200 · transparent hero 2400×1600. Body text ≥ 32 px on 1080 cards; object ≥ 50% of hero area. Footer always shows scale + coverage + cutoff; renders say "效果图 / Render", real photos "实拍 / Real print". Exports never auto-post.
- **Guess my Stack:** spoiler/reveal pair with identical camera/geometry; spoiler replaces logos with numbered neutral tiles and strips metadata.
- **Share privacy:** separate private printable name vs public alias (identity geometry is re-generated with the alias for public cards); no raw totals/exact peak dates/activity hashes in image metadata by default.
- **Look links:** `/look/<theme>#look=<base64url>` ≤ 1.5 KiB, style only (theme, layout, palette, tier, height, γ) — never activity or names; static theme routes have preset OG images.
- **README assets:** `npx vibeskyline badge` → light/dark 840×260 SVG + 240×28 badge + `<picture>` snippet (works on GitHub and Gitee READMEs); `--printed` = "self-reported".
- **Desk Proof Wall:** `community/desk-wall.v1.json` + EXIF-stripped permissioned photos via PR; real prints only.
- **WeChat/mobile:** SVG first paint before Three.js; download failure → full-screen "长按保存图片" sheet; test real iOS/Android WeChat WebViews.
- **Launch social mechanics:** Guess my stack · Use this look · Two-tone "any printer" challenge · desk photo wall. Year-vs-Year "Era Shift" in Wave 1.5 (GitHub/Gitee calendars support past years; AI side labelled "not recorded" where absent). Friend Duo / Team panorama LATER. **No global leaderboard.**

---

## 10. Architecture & repo layout

```
vibeskyline/
  apps/
    web/                 # Vite + React + R3F/Drei (lazy) + Zustand + Comlink workers; zh-CN/en
    relay/               # tiny stateless public-calendar relay (GitHub/Gitee/gitlab.com only)
  packages/
    contracts/           # zod schemas: ActivityBundle, BuildRecipe, BuildPlan, manifests
    registry/            # sources, brands, colors, capability status
    core/                # normalization, reconciliation, layout math, slot allocation
    adapters-core/       # PureParsers (browser+node): codex, claude, gemini, qwen, csv/zip vendors, tokscale, ccusage
    adapters-node/       # LocalReaders: discovery, zstd (node:zlib), SQLite backup (agy beta)
    adapters-browser/    # worker glue, fzstd, file limits, encodings
    calendars/           # github / gitee / gitlab fetch+parse (shared by relay and CLI)
    ledger/              # atomic ledger, HMAC keys, Ed25519 signing (@noble/ed25519)
    geometry/            # B-rep mesher, manifold-3d plinth/identity, validation
    logos/  fonts/       # asset pipelines + compiled outputs
    exporters/{stl,three-mf,glb}/   print-profiles/   # slicer fixtures → metadata writers
    svg-card/            # deterministic 2.5D SVG renderer (landing, README, cards fallback)
    cli/                 # `vibeskyline` bin (cac + @clack/prompts), receipt, badge
    studio-local/        # optional offline Studio package
  fixtures/{adapters,calendars,logos,geometry,slicers,privacy}/   # redacted real-format samples only
  community/  docs/
```
Tooling: pnpm workspaces, strict TS, Zod, Vitest + fast-check, Playwright, ESLint import boundaries, `tsdown`/esbuild for the CLI. **Dev without deployment:** Vite dev server proxies `/api/calendar/*` to `packages/calendars` so the GitHub/Gitee CORS problem is solved locally before any relay is deployed.

**Relay (when deployed):** allowlist hosts, strict handle validation, 12 h cache + up to 72 h stale with visible timestamp, request coalescing, per-host concurrency limits, backoff/circuit breaker, redact handles from logs; on 429 the UI keeps the specimen and offers the CLI path. Accepts no tokens, no logs.

**Budgets (targets, measured):** landing JS ≤ 250 KiB gz; cached handle preview < 3 s; 4-source CAD+3MF < 6 s, < 512 MiB; 4 cards < 3 s; warm local collection < 5 s.

**Release blockers:** accounting errors, raw-data leakage (privacy canary tests), invalid identity geometry, broken material assignment in the target slicers, missing physical proof. Ship bilingual README, `SECURITY.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`, SBOM. License proposal: MIT (owner decides).

---

## 11. MVP acceptance criteria (for the coding agent)

1. **Calendars:** given fixtures, `calendars` parses GitHub (tooltip counts, level fallback), Gitee (`?year=`, boundary trim, no JS eval), GitLab JSON into `SourceSeries`; live smoke test for `jinxlzc` on GitHub and Gitee passes via CLI and dev proxy.
2. **Codex:** on a fixture set containing `.jsonl` + `.jsonl.zst`, archived duplicates and repeated snapshots, daily totals equal golden output; a synthetic fixture proves daily totals without printing any content.
3. **Claude / Gemini / Qwen:** golden fixtures incl. revisions, subagent echoes, cached-⊂-input, ledger-vs-projects overlap.
4. **Imports:** tokscale `graph` JSON, ccusage `daily --json`, Cursor CSV, Copilot CSV, DeepSeek amount CSV, GLM CSV, `arkcli` JSON and manual CSV import with preview + column mapping + encoding sniff; overlap forces an explicit decision.
5. **CLI:** `npx vibeskyline --dry-run --json` emits schema-valid bundle; ledger survives kill -9 mid-write; `export --sign` / `verify` round-trip; no network unless a handle is given; `--offline` makes zero requests.
6. **Studio:** 1–6 sources; switching layouts/colors updates preview < 300 ms for 4 sources; footer dims match exported mesh bounds ± 0.01 mm.
7. **Geometry:** every layout × 1–6 sources × 53/54 columns × Sprint windows passes independent manifold/overlap/min-feature validation.
8. **Logos/fonts:** all 18 launch marks compile at their qualified size; coupon plate printed and photographed; CJK name "示例名" and Latin "sample-maker" print legibly.
9. **3MF:** Annual Districts 4-source multi-color file opens in pinned Bambu Studio and OrcaSlicer with 5 parts mapped to the intended filaments and the user's printer profile untouched; two-tone instructions verified on a real print.
10. **Share:** all card sizes render in zh-CN and en with correct footers; Guess pair has no logo leakage in pixels or metadata; look link contains no activity.
11. **Privacy canaries:** seeded secrets/prompts/paths in fixtures never appear in bundles, ledgers, cards, 3MF metadata, or network traffic.
12. **Proof:** 6 objects (both qualified layouts; mono/two-tone/multi; Latin+CJK; one shop order) documented in `community/`.

---

## 12. Milestones (5 weeks to RC; assumes ~3 engineers or owner + coding agents in parallel)

| Week | Acquisition | Object / printing | Product | Exit |
|---|---|---|---|---|
| Nov 21–27 | Calendars + Codex/Claude/Gemini/Qwen fixtures; tokscale/ccusage schemas | **Bambu/Orca slicer spike**; two-tone boundary test | Contracts, specimen, SVG landing, dev proxy | Valid combined 3MF opens correctly in both slicers |
| Nov 28–Dec 4 | Ledger, vendor CSV imports, agy 2-day spike | Districts + Stack, logos/fonts, coupon plate | Studio, coverage, allocation | First real object printed; external shop order placed |
| Dec 5–11 | CLI packaging, browser zstd, guards | Maker-preview layouts, fit, shop pack | Reveal, bilingual cards, Guess, looks | Full loop collector → card → shop pack |
| Dec 12–18 | Guides (CN sources), Windows, resilience | Defect fixes, external fulfillment | WeChat, README badge, proof wall | 6 objects + logo proof complete |
| Dec 19–23 | Freeze, privacy audit | Determinism/slicer recheck | a11y, perf, docs | Owner review packet (RC) |

If compressed, cut in this order: badges → agy Beta → Maker-preview polish → extra themes. Never cut: privacy, combination, Chinese identities, default logos, color customization, two-tone, verified multi-color export.

**Later waves:** Wave 1.5 (early Jan) Year-vs-Year, GLB, +4 themes, native Kimi/DeepSeek-Harness/CodeBuddy readers. Wave 2: Moonshot Admin API & Ark OpenAPI collectors, private GitHub via token, Copilot/ZCode native, Friend Duo / team panoramas, modular trays & terraced plinth, video export (WebCodecs), signed aggregate hosting + dynamic OG/badges, optional print-on-demand partners.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sparse/deleted local AI history makes AI districts look empty | Coverage-aware Sprint editions, unknown recesses, `snapshot` habit, honest copy |
| Unofficial endpoints drift (GitHub HTML, Gitee calendar) | Versioned fixtures, level fallback, CLI path, monitoring |
| Slicer metadata wrong → "multi-color" opens grey | Week-1 spike with pinned slicer fixtures; Core 3MF + manual mapping guide fallback |
| Multi-color stacked prints = hundreds of swaps, expensive shop quotes | Districts default, two-tone tier, honest purge warnings, slice-based numbers only |
| Trademark complaints about default logos | README note, no endorsement implication, own product icon, neutral toggle, takedown process; owner accepts residual risk (§17) |
| Double counting (routed models, aggregator + native, multi-machine) | client/provider partitions, explicit reconciliation, conservation tests |
| Viral spike kills relay (429) | caching/coalescing, CLI fallback, static specimen |
| CJK glyph gaps on plinth | shaping, subset + full-font fallback, explicit edit path |

---

## 14. How the design converged (summary of 13 rounds)

- Round 1: both proposed stacked layers as the combined default. Round 2: **both independently switched to per-source districts/lanes** after critiquing each other (stacked hides sources and costs hundreds of filament swaps).
- Codex consistently pushed accounting rigor, unknown≠zero, manufacturing honesty, release gates; Gemini consistently pushed viral mechanics (terminal receipt, Guess my stack, 小红书 carousel, look links, rich previews, desk wall), China ergonomics (WeChat, npmmirror, CJK fonts, Taobao shop pack), cold-start (hero specimen, Sprint editions) and the **Two-Tone** tier.
- Rounds 10–13 cut scope: native parsers limited to Codex/Claude/Gemini/Qwen; aggregators for breadth; video, team, dynamic OG, official APIs moved later; slicer spike moved to week 1; "no unofficial session scraping".

## 15. Coordinator overrides (my judgment on top of the converged draft)

1. **Browser `.jsonl.zst` support is MVP, not Wave 2.** Verified: almost all Codex logs on disk are zstd. "Drag your `~/.codex/sessions` folder into the browser" must work; `fzstd` is tiny and pure JS. (Draft deferred browser zstd.)
2. **Node runtime: target Node ≥ 22.15, not 24-only** — `zlib.zstdDecompressSync` landed in Node v23.8.0 and was backported to **v22.15.0** (verified in Node docs; still marked experimental → fall back to `fzstd` if absent). Node 24-only would turn away many `npx` users. (Gemini position, Codex disagreed.)
3. **Antigravity Beta stays in** (private usage context redacted) but strictly timeboxed to 2 days and only via SQLite online-backup; otherwise tokscale import.
4. **Dev proxy before relay**: since deployment is later, the web app must work locally via the Vite proxy + CLI; the relay is a deploy-time concern.
5. **Team assumption:** the converged schedule assumes ~3 engineers. With one owner + coding agents, keep the order of §12 and expect the RC to need the full 5 weeks; the physical proof (printing) is the true critical path, not code.

## 16. Dissent & alternatives (kept on record)

- **Compact Stack as default** (Gemini early, partly later): reads faster in 1080×1080 thumbnails for 4–6 tools. Rejected as default (hides sources, swap-heavy), kept as qualified option and promoted in the reveal.
- **Terraced/stadium plinth** (Gemini): better rear-district visibility; Codex: material + not proven. → LATER/optional profile after tests.
- **Drop-in tray / snap-fit multi-plate** (Gemini): zero in-print swaps, unlimited colors. Codex: tolerance products needing studies. → LATER.
- **Weighted "effort tokens"** (Gemini r1): rejected by both — invented valuation.
- **Linked token scale default** (Gemini r1/r4) vs independent per-source (Codex): independent is default; linked is a toggle.
- **Maker-preview layouts visibility:** Codex/Gemini both would hide Daily Lanes & Blend behind "Advanced"; kept visible to honor the owner's requirement, with persistent "Maker Preview" label.
- **Node 24-only** (Codex) vs Node ≥ 20/22 (Gemini) → coordinator chose ≥ 22.15 (§15).
- **Hard package-size blockers** (Gemini) vs measured budgets (Codex) → budgets, not blockers.
- **Video at launch** (Codex r7) → moved LATER in r11 by Codex itself; PNG carousels are the universal path.
- **Year-vs-Year at launch** (Gemini r8) → Wave 1.5.

## 17. Open decisions for the owner (the owner)

1. **Default logos legal posture:** confirm real marks ON by default in the public open-source repo (residual trademark risk accepted), and whether official SVGs live in the repo or are fetched at build time from brand pages.
2. **Week start & calendar:** Sunday (GitHub style) or Monday (common in China) as default?
3. **Default grouping:** Tool view (Claude Code logo) or Provider view (DeepSeek logo) when a Chinese model runs inside Claude Code?
4. **Team & printer access:** who builds (you + coding agents?), which printer(s) are available for qualification (A1 mini / P1S / X1C + AMS?), budget for ~6 proof prints + 1 shop order.
5. **Launch date & channels:** RC Dec 23 → public launch when? (needs your explicit go for npm publish, deployment, open-sourcing, posting.)
6. **License:** MIT proposed.
7. **Domain/hosting:** e.g. `vibeskyline.dev` / `.app` + mainland-reachable CDN; relay region.
8. **Opt-in unofficial syncs later?** (Cursor cookie export, DeepSeek web token) — currently excluded.
9. **Default theme** for the hero/landing: Porcelain (light) vs Obsidian (dark) vs Cinnabar 朱砂 (Chinese New Year angle).
