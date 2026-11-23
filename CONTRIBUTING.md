# Contributing

Node >=22.15, pnpm 10. Install, then run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`. CI uses Node 22.

Use synthetic fixtures only. `pnpm exec tsx scripts/make-fixtures.ts` regenerates the Codex/calendar samples using native Node zstd compression; decompression supports fzstd fallback. Never use real session directories in tests. The optional LIVE=1 test uses the authorized public handle and never saves a response.

Contracts own interchange validation; core owns grid/normalization/material planning; adapters-core must stay browser-safe; adapters-node owns filesystem discovery. ESLint prohibits Node imports in browser production modules. Calendar fetching is fixed-host, no token forwarding. Geometry validation is separate from generation. Export geometry and preview use the same plan.

Add evidence before promoting a source to verified. Do not vendor official marks without license/brand review. Do not add fake integrations or infer missing usage. Physical print qualification needs real proof. Do not commit secrets, real session files, or fetched personal activity.
