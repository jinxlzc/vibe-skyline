# Security and privacy

Raw Codex logs stay on the user's machine. Parsers retain only opaque SHA-256 event identifiers, timestamps and inclusive token counters; session metadata is used transiently for deduplication. Bundles contain daily values, coverage and provenance, never prompt/code/path fields. No telemetry. Synthetic canaries test this boundary.

The loopback dev/preview proxy accepts only GitHub, Gitee and gitlab.com provider names with strict handles and years. It constructs fixed HTTPS URLs, rejects redirects, forwards no client headers/tokens, limits response size, uses a timeout and bounded cache, and logs no handles. M3 uses the same restricted relay handler in standalone and dev/preview modes, adding exact-origin CORS, pinned public IPv4 DNS, credential rejection, per-process quotas and no-store HTTP responses. Do not expose the dev server publicly. TLS/edge policies, production load qualification and actual hosting remain deferred; see [relay safeguards and limits](docs/CALENDAR_RELAY.md).

Imports have file, expanded-byte and batch limits. The optional CLI requires explicit directories and ignores symlinks inside those selected folders; it never discovers a home directory implicitly. Only select files/directories you intend to parse. Bundles may contain your public handle indirectly through user-edited fields; review portable JSON before sharing. No authenticity claim or signature is made.

Report a vulnerability privately to the repository owner using GitHub private vulnerability reporting when enabled. Do not attach real session files or credentials. Use a minimized synthetic reproduction. Never commit secrets or fetched personal activity.
