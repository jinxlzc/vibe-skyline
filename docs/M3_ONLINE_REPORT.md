# M3 — zero-install public calendar flow

Branch: `feat/m3-zero-install-site`. Base: `2b9c1c586dfd94a863c7a9aa439a1b5fd36da011` (clean `feat/m2-public-defaults` verified before branching). Implementation SHA: `fd1e1ea9a12e7d1f8ba0757a0987b302a07bc2de`. Final command results are recorded in [acceptance/m3-online.json](acceptance/m3-online.json); the evidence commit follows that implementation commit. No old history was rewritten.

The website now leads with GitHub/Gitee → public username/year → fetch/generate → preview/customize → STL or multi-material Core 3MF. The primary fetch button is explicit; sample exploration is secondary. Imports live in a closed advanced disclosure, with retention/API/privacy limits. Export buttons now appear at the top of Print. Public defaults remain VibeSkyline Grid, source-username engraving, Sunday and A1 AMS lite ≤4 slots. The synthetic preview is labeled and never supplies identity; public fetch removes sample series. Imported files are described as unverified activity. Returning home restores the labeled demo.

The existing public-page fetchers are reused. A standalone loopback relay and Vite middleware share the same handler, with configurable exact CORS origins, fixed source routes, public IPv4 DNS checks pinned to TLS, all redirects blocked, 2 MiB body limit, overall timeout, concurrency/rate limits, isolated bounded public cache, no-store responses and redacted errors. No arbitrary URL proxy, raw upload, browser token or private-data API exists. GitLab's existing fixed route remains beta; no new source is added. The optional CLI now requires explicit source inputs and no longer discovers home directories.

**Real logos ON by default: NOT satisfied. Not sliced / not physically printed.** Original replaceable marks remain; no slicer or printer was connected or launched. Bambu filament mapping, purge/time and physical qualification remain unknown.

## Validation and evidence

See the machine-readable [command results](acceptance/m3-online.json). Workspace install, typecheck, lint, tests and builds plus root TypeScript/ESLint and the root test suite were run. Root tests include standalone relay safeguards; browser tests cover qualification labels, primary/optional hierarchy, demo identity isolation, public username retention, four-slot defaults, downloads, local-only synthetic import, zh-CN/English and mobile overflow. The legacy defaults test now writes regenerated artifacts into ignored `test-results/`, preserving earlier evidence and keeping private calibration artifacts out of M3 examples.

| Check | Result |
|---|---|
| Frozen install, recursive typecheck/lint/build | PASS |
| Recursive unit tests | 171 passed |
| Root TypeScript / ESLint | PASS |
| Root unit suite (includes relay) | 176 passed / 20 files |
| Full Playwright acceptance | 17 passed / 1.5 min |
| Final provenance/defaults follow-up | 32 state/helper tests + 4 browser tests passed after final web rebuild |
| Live public requests | GitHub CLI/relay PASS; Gitee relay PASS, latest CLI FAIL; earlier complete pass retained |

The final browser result is recorded in acceptance JSON. Earlier targeted browser validation caught a test expectation that incorrectly used a synthetic identity; the existing selector correctly ignores sample identities. The test now expects `skyline-demo`. A live diagnostic caught and fixed the Node DNS lookup callback shape by using explicit IPv4 connections. Vite still warns about the large lazy Three.js chunk; it builds successfully.

Live requests on 2026-11-20 UTC:

| Source | Username | Latest result |
|---|---|---|
| GitHub | `torvalds` | CLI PASS; dev relay HTTP 200; 365 source-reported 2026 date cells, contributions metric |
| Gitee | `jinxlzc` | Dev relay HTTP 200; 365 source-reported 2026 date cells; latest CLI request FAIL (request/parse failure, raw response not retained) |
| GitHub + Gitee earlier run | `octocat` / `jinxlzc` | Both CLI and relay PASS; preserved separately |
| GitLab | — | No live attempt in this bounded slice; beta / fixture-tested |
| AI / CSV | — | Synthetic fixtures only; no live qualification |

[Latest exact response hashes/timestamps](acceptance/m3-live.json) · [Earlier complete public smoke pass](acceptance/m3-live-octocat.json). Gitee availability was intermittent across runs. This does not remove its established public-fetch qualification or guarantee future connectivity. Returned full calendar grids can include future zero cells; neither day count nor verification promises complete history. No real personal usage logs or home directories were read.

[Browser screenshots](screenshots/m3-online/) cover landing in English and zh-CN, Gitee, GitLab beta, qualifications, synthetic demo, source username, export-ready public GitHub, advanced import, synthetic bundle/export, privacy and mobile. Public-result screenshots explicitly label replay of a live-recorded response. [Examples and hashes](examples/m3-online/README.md) include public GitHub and SYNTHETIC bundle exports; no owner real-name coupons.

## Relay/local and future deployment configuration

```sh
pnpm install --frozen-lockfile
pnpm dev  # integrated loopback relay + frontend
# Or, in separate terminals:
RELAY_HOST=127.0.0.1 RELAY_PORT=8787 \
RELAY_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:4173 pnpm relay
VITE_CALENDAR_RELAY_URL=http://127.0.0.1:8787 pnpm dev
# Build only, using a placeholder overseas origin:
VITE_CALENDAR_RELAY_URL=https://calendar-relay.example.invalid \
pnpm --filter @vibeskyline/web build
```

[Full relay contract, safeguards, env examples and limitations](CALENDAR_RELAY.md) · [Optional import/API research](ADVANCED_IMPORT.md) · [Privacy](PRIVACY.md).

China static hosting calling an overseas relay still has cross-border latency/connectivity risk. Mainland public hosting may require ICP filing depending on provider/regulations. Nothing was purchased, filed or deployed; the owner's running instance was untouched. No PR, merge, visibility change, npm publication, force-push or global Codex configuration change.

Remaining work: public hosting/TLS/edge policies, distributed quotas and production load qualification, upstream format drift, GitLab real public smoke, actual AI-format qualification if authorized later, Bambu mapping and physical printing. Current limits are per-process, IPv4 only, with no coalescing, stale fallback or circuit breaker. Reverse proxies share a conservative socket-IP quota because forwarding headers are intentionally ignored. Future GraphQL requires a server-side token even for other users' public calendars; none is configured or bundled here.
