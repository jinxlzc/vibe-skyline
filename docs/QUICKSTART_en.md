# Public username → independent skyline

Choose **GitHub**, **Gitee** or **GitLab (beta)**, enter a public username and year, then **Fetch calendar → Generate skyline**. Preview, customize Colors and Shape, then Export → STL or Core 3MF. Each source has an independent sloped plinth, logo seat, editable ID and year; switch sources and export separate files. No login or CLI is required.

The sample studio contains synthetic code-hosting calendars, not real account activity. Fetching a public calendar replaces samples. GitHub/Gitee fetchers have recorded public-request evidence. GitLab remains beta: fixture-tested only, with a rolling past-12-month window and no live qualification. Unknown is not zero.

The default engraving uses the selected source username or `skyline-demo`, with VibeSkyline Grid. GitHub and Gitee use official marks under owner-accepted brand-policy risk; GitLab has a reserved plate. Shape offers per-source/global empty-plate controls and local BYO SVG. Operator switches are documented in [trademark notices](../licenses/TRADEMARKS.md).

Sizes are in mm, with free material groups and no default printer or slot caps. The slicer owns filament mapping. **Not sliced or physically printed; print time and purge remain unknown.**

## Maintainers: run locally

Use Node >=22.15 and pnpm 10 on `feat/m6-code-sources-only`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173`. The development server includes the restricted relay. No public deployment URL exists for this milestone. [Relay configuration](CALENDAR_RELAY.md) · [Privacy](PRIVACY.md) · [M6 notes](../M6_NOTES.md).
