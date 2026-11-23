# Calendar relay foundation (M3; production entry added in M7, not deployed)

For the combined production website/relay process, use [Railway configuration](RAILWAY.md). Production disables the local fake-IP opt-in and implicit loopback CORS defaults across all relay entry points.

Visitors choose GitHub or Gitee, enter a public username/year, fetch, preview/customize and export STL or multi-material Core 3MF. No account, local collector, CLI or installation is required for that website flow. The live site is https://vibeskyline.com. The commands below are for local development and operators.

## Reproduce locally

Requires Node >=22.15 and pnpm 10. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
# Open http://127.0.0.1:5173 (integrated restricted relay).
```

Or exercise separate frontend/relay processes in two terminals:

```sh
# Terminal 1. No token needed by the existing public-page fetchers.
RELAY_HOST=127.0.0.1 RELAY_PORT=8787 \
RELAY_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:4173 pnpm relay
# Terminal 2. The public build-time variable must contain only a relay origin.
VITE_CALENDAR_RELAY_URL=http://127.0.0.1:8787 pnpm dev
```

`apps/web/.env.example` documents Vite configuration; `apps/relay/.env.example` documents server configuration. Copy the web example to `apps/web/.env.local` if desired. For the relay, pass variables in the shell as above (the relay does not auto-load dotenv). Static builds embed the selected relay URL:

```sh
VITE_CALENDAR_RELAY_URL=https://calendar-relay.example.invalid \
pnpm --filter @vibeskyline/web build
# apps/web/dist is the static site. This command does not upload it.
```

Future overseas relay process example (placeholder origins; not a deployment command):

```sh
RELAY_HOST=127.0.0.1 RELAY_PORT=8787 \
RELAY_ORIGINS=https://cn-site.example.invalid,https://global-site.example.invalid pnpm relay
```

A future TLS reverse proxy would forward only `/api/calendar/*` to this loopback process, disable URL/access logging, bound connection/header sizes, and enforce an external global quota. Do not use a Vite dev server as a production host. An IPv4 DNS/egress route is required; IPv6-only upstreams fail closed. Configure one relay per frontend build/region. There is no silent multi-relay failover that discloses usernames to additional operators. CORS origins must be exact (no wildcard, trailing slash, or credentials). Outside production, the integrated dev/preview relay defaults to loopback Vite origins; explicit `RELAY_ORIGINS` replaces that list in both integrated and standalone relays. Production has no implicit origins.

China static hosting plus an overseas relay still has cross-border latency and connectivity risks. It does not guarantee reachability. A mainland China public site may require ICP filing depending on the hosting provider and applicable regulations; check before any future launch. No domain/server purchase, filing, deployment or owner-machine change was performed.

## Local LAN preview with Clash TUN fake-ip

The default relay rejects DNS answers in `198.18.0.0/15`. With a trusted local TUN returning, for example, `198.18.0.40` for `github.com`, that check throws before HTTPS connects and the calendar endpoint returns a redacted **502**. Serving the app or `/protocol/v2/spec.md` does not exercise upstream DNS. Mocked DNS reproduces this exact failure in the tests; tests mock DNS and HTTPS; they do not claim a particular physical machine.

For an operator-run private LAN preview, run these commands from the repository root on the preview host (Node >=22.15, pnpm 10):

```sh
pnpm install --frozen-lockfile
# Build the browser for same-origin /api/calendar, including if a split relay was used before.
VITE_CALENDAR_RELAY_URL= pnpm build

# Explicit runtime opt-in for the trusted local TUN's existing fake-IP pool.
# Replace the example LAN address with this preview host's actual LAN address.
NODE_ENV=development RELAY_LOCAL_FAKE_IP_CIDRS=198.18.0.0/15 \
RELAY_ORIGINS=http://192.168.0.10:4173,http://127.0.0.1:4173,http://localhost:4173 \
pnpm --filter @vibeskyline/web exec vite preview --host 0.0.0.0 --port 4173 --strictPort
```

Open `http://192.168.0.10:4173` on that private LAN, adjusting the example address as above. This is an example local address, not a hosted service. Keep port 4173 on the trusted LAN: do not expose it through a public tunnel or router port forwarding. The command changes no Clash, VPN, DNS, or system network settings. `--strictPort` prevents a silent port change that would invalidate the configured Origins.

- `RELAY_LOCAL_FAKE_IP_CIDRS` is **off when unset or blank**. It accepts up to 16 comma-separated, canonical IPv4 network CIDRs contained entirely within `198.18.0.0/15` (prefix `/15` through `/32`). A narrower pool such as `198.18.0.0/24` is supported. Host bits, malformed CIDRs, empty list entries and other networks fail at startup. It cannot authorize RFC1918, loopback, link-local/metadata, CGNAT or arbitrary reserved ranges, even when explicitly misconfigured.
- Only `github.com`, `gitee.com`, and `gitlab.com` can use the exception, after hostname validation. All DNS answers must satisfy the existing public-address policy or a configured fake-IP CIDR. Unlisted fake IPs stay blocked; ordinary public IPv4 behavior is unchanged. The checked address is pinned to the connection so TUN can intercept it; there is no alternate DNS lookup or bypass to a hardcoded public GitHub address.
- TLS SNI and certificate verification use the allowlisted hostname, with verification enabled. HTTPS-only, no custom ports/userinfo, no redirects, fixed calendar routes, body/deadline limits, credential rejection and rate limits remain in force. No HTTPS/system proxy environment variable is honored by this transport.
- `RELAY_ORIGINS` replaces the entire CORS list with exact comma-separated origins. Include loopback origins if needed. An unlisted Origin returns **403** with no allow-origin header. Same-origin browser GETs may omit Origin; a curl without Origin can still reach the DNS check and return 502. CORS is not authentication.
- These two server-only variables are read from the shell environment at process startup in Vite dev, Vite preview, `pnpm relay`, and the production server. They are not loaded from Vite `.env.local` or embedded in browser JS. Restart after changing them. When `NODE_ENV=production`, fake-IP settings are ignored entirely and unset origins give an empty allowlist. Vite preview normally uses production mode: the private LAN example explicitly selects development for its local exception. Outside production, removing the variables restores conservative DNS and the dev/preview/standalone loopback origins. The production server never supplies default origins.

This validates the reported code path with synthetic fixtures, mock DNS and mock outbound HTTPS, including actual Vite dev/preview middleware. Actual TUN routing and provider reachability remain for the operator to verify after starting the preview; a 502 can also indicate another upstream/network failure. GitLab remains beta.

## Restricted contract and safeguards

Only GET `/api/calendar/{github|gitee|gitlab}/{username}?year=YYYY` is supported. GitLab is explicitly beta. No client-supplied upstream URL, token, alternate host or raw-log upload endpoint exists. POST, cookies and Authorization headers are rejected. Browser requests omit credentials and referrers. Preflight accepts GET with no custom headers; credentials are never enabled.

Upstream URLs are constructed by the existing calendar package. The production and dev relay transport independently allows only HTTPS `github.com`, `gitee.com`, `gitlab.com`, with no userinfo or custom port. By default, DNS IPv4 answers are checked conservatively against private, loopback, link-local/metadata, reserved and non-unicast ranges; mixed public/private answers fail closed. The only configurable exception is the bounded local fake-IP opt-in above. The validated address is pinned for the TLS connection with the original hostname used for certificate verification. All redirects are refused, including redirects within the allowlist. Upstream bodies are capped at 2 MiB. A 12-second overall deadline includes DNS, connect and body reading; errors return redacted categories without handles/bodies/credentials. HTTP 429, timeout 504, bad request 400, upstream 502 are distinguished. No request logging is implemented.

Per process: 30 GETs/minute per socket IP, 300 GETs/minute globally, 8 concurrent requests. Cache hits count toward limits. Forwarding headers are ignored. Behind a reverse proxy, clients therefore share that proxy's quota; this is conservative and may need a carefully configured edge limiter before scaling. Client state is bounded; restart resets quotas. No distributed limiter, durable cache, circuit breaker or coalescing is claimed.

The in-memory public-only cache holds at most 64 entries for one hour. Keys contain provider, exact username and year; values are cloned to avoid shared mutation. Expired entries are never served. Public results for the same key are intentionally reusable, but private/authenticated responses are never fetched. All HTTP responses carry `Cache-Control: no-store` and `Vary: Origin`, preventing shared intermediary caching. Rate-limit responses carry `Retry-After: 60`. Origins are browser policy, not API authentication; non-browser clients may call this public endpoint and are subject to the same limits. Operators must keep proxy/provider access logs consistent with this privacy policy.

## Source/API boundaries

- GitHub/Gitee remain qualified by this repo's real public request evidence, not by a promise of stable APIs. See [live evidence](acceptance/m3-live.json) and [M3 report](M3_ONLINE_REPORT.md). The existing public-page fetchers are retained; no new scrape is added.
- GitHub contributions are [publicly visible under its contribution rules](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference). Official [`contributionsCollection` / `contributionCalendar`](https://docs.github.com/en/graphql/reference/users) is an alternative, not implemented here. [GraphQL requires authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql) even when reading other users' public calendars. Any future site token belongs only in the overseas relay, never browser JS, `VITE_*`, URLs or logs. Private/internal details require appropriate `read:user` access and are outside this relay's contract.
- Gitee's [official OpenAPI documentation](https://api.gitee.com/api/v5/swagger) has public events; the owner research found no official year-calendar operation. The docs endpoint timed out during this slice's recheck. Existing fetcher evidence is not official API qualification.
- GitLab's [official calendar covers the past 12 months](https://docs.gitlab.com/user/profile/contributions_calendar/). Its [Events API requires `read_user` or `api`](https://docs.gitlab.com/api/events/), and is not used as an anonymous full-history substitute. No M3 GitLab live smoke was attempted; beta remains visible.
- Gitea/Forgejo and Bitbucket are not added. Gitea/Forgejo heatmaps are research only; no Bitbucket calendar API is assumed.

Provider date cells are source-reported. A returned full grid, including zero-valued future cells, does not prove a complete year of history. Missing dates stay unknown; unlike units are never summed.
