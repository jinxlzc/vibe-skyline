# Railway production server (M7)

The repository root contains a two-stage `Dockerfile` and `railway.json`. Connect this repository (or a fork) in Railway with the repository root as the service root. No extra services, volumes, domains, or add-ons are required for a basic deploy.

## Build and start

The image uses Node 22.22.2 and Corepack with pnpm 10.22.0. The build stage installs development/build dependencies before setting the runtime environment to production:

```sh
corepack enable
corepack prepare pnpm@10.22.0 --activate
pnpm install --frozen-lockfile
pnpm -r build
```

The web build runs Vite and then esbuild. The runtime image contains only `apps/web/dist` and the bundled ESM server, runs as the non-root `node` user, and needs no `node_modules`, pnpm, tsx or Vite process. Start from the repository/image root:

```sh
node apps/web/server/dist/index.mjs
# Equivalent in a checkout with pnpm installed: pnpm start
```

The server binds `0.0.0.0` on `Number(process.env.PORT)`. `PORT` must be a decimal integer from 1 to 65535; missing, blank or invalid values fail before listening. The built `index.html` must exist at startup. Static paths resolve relative to the bundle, so changing the working directory does not change the document root.

`GET /healthz` returns `200 text/plain` with `ok`, without querying providers. Railway uses this path, a 30-second startup healthcheck window and a 20-second shutdown drain window. SIGINT/SIGTERM stop accepting connections and drain active requests for up to 15 seconds before closing remaining connections and exiting unsuccessfully.

## Environment

| Variable | Configuration |
| --- | --- |
| `PORT` | Injected by Railway. For a local production smoke test, supply an available port such as `4173`. |
| `NODE_ENV` | Must be `production`; the runtime image sets it. |
| `RELAY_ORIGINS` | Set to the service's public `https://<service>.up.railway.app` origin only, with no trailing slash or path. No credentials or wildcard. |
| `RELAY_LOCAL_FAKE_IP_CIDRS` | Leave unset. Ignored whenever `NODE_ENV=production`, including if accidentally set to a valid or invalid CIDR. |
| `VITE_OFFICIAL_LOGOS` | Optional **build-time** kill switch: `off` disables official marks. Unset preserves official marks on by default. |
| `VITE_DISABLED_OFFICIAL_LOGO_SOURCES` | Optional **build-time** comma-separated source kill switch, e.g. `github,gitee`. Unset disables none. |

Unset/empty `RELAY_ORIGINS` produces an empty production allowlist. Requests without an Origin can still use the relay, while every supplied unlisted Origin (including localhost) receives 403. Set the public origin explicitly so browser GET/OPTIONS requests carrying it work. Origin checks are not authentication. The combined server enforces production relay settings even if an operator omits or overrides `NODE_ENV`; local exceptions remain limited to the standalone/Vite development entry points.

The Docker build declares the logo switches as build arguments, so Railway service variables can supply them. A change requires rebuilding the browser bundle; changing only runtime values cannot modify a built site. The Docker build fixes `VITE_CALENDAR_RELAY_URL` to empty for same-origin `/api/calendar`; it excludes local dotenv files from the context. Per-source/global UI switches and BYO artwork remain available. No tokens or secrets are required.

## Routing and safeguards

- `/api/calendar` and its children use the existing relay, including CORS/preflight, no credentials, fixed providers, DNS validation and pinned HTTPS, no redirects, the 12-second upstream deadline, body limits, bounded cache, concurrency and rate limits. Other `/api` paths return 404, never SPA HTML.
- Private/reserved DNS addresses remain blocked. No production fake-IP exception is possible through environment settings. Request/header timeouts remain 15/10 seconds with at most 32 headers.
- Vite hashed `/assets` files use `public, max-age=31536000, immutable`; `index.html`, SPA responses and unhashed files use `no-cache`. MIME types include JavaScript, CSS, fonts, images and WebAssembly. GET and HEAD are supported for static files.
- Unknown non-file paths receive the SPA index. Missing assets/files and `/protocol/v2/*` return 404. Traversal, dotfiles and symlinks outside the document root are blocked. Protocol documents are not copied into the runtime image.
- The process does not log requests. Behind Railway's proxy, clients share the existing socket-IP quota: 30 GETs/minute per socket IP, 300/minute globally, 8 concurrent requests. Forwarding headers remain untrusted. Slice/purge estimates and GitLab beta status are unchanged.

## Local validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm -r build
pnpm test:e2e
```

Playwright now launches the compiled production server. Its loopback origin is an explicit test setting, not a production default. Server tests use temporary synthetic files, mocked outbound DNS/HTTPS and compiled child processes; no personal usage logs or provider credentials are read.

Optional local container smoke test (does not deploy):

```sh
docker build -t vibeskyline-m7 .
docker run --rm -p 4173:4173 -e PORT=4173 vibeskyline-m7
# GET http://127.0.0.1:4173/healthz
```

Configuration references: [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles), [Railway configuration fields](https://docs.railway.com/config-as-code/reference). The reviewer should confirm the resolved build/start/healthcheck/drain settings in Railway before deployment. No hosted availability or real provider connectivity is claimed by local tests.

M7 validation on Node 22.22.2 / pnpm 10.22.0: frozen install, root and recursive typecheck/lint, 352 unit/integration tests across 29 files, workspace production build, and 42 Playwright tests passed (6.9 minutes). The two-stage Docker image built successfully; its runtime passed 8 HTTP checks, non-root/no-node_modules assertions, missing-PORT failure and clean SIGTERM shutdown. Independent review findings were reproduced and fixed with regression tests for overridden NODE_ENV and lingering shutdown handles. Existing Vite browser-externalization/large-chunk and Playwright color-environment notices remain. No Railway deployment or live upstream-provider verification was performed.
