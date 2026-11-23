# M6 landing form polish

Branch: `feat/m6-form-polish`, created from the clean `feat/m6-code-sources-only` worktree at `4c867f67bce94ca72c289f65a3684412d6935ce4`.

The calendar entry uses the existing native select/input and shadcn/Base UI button. A joined border, shared focus ring, pinned chevron, and 16px text inset keep source selection and username entry together. The year input aligns with the username column. Controls are 48px high; disclosure targets are at least 44px. Disabled submit uses an opaque neutral surface; enabled submit retains the existing dark green.

The helper, native disclosure, sample-studio action, and relay note share one responsive stack. The select and disclosure use the same decorative SVG chevron. The shorter English placeholder “Public handle” retains the meaning and fits the narrow Studio panel. No new UI dependencies or changes to relay/model/export behavior.

## Screenshot matrix

Captured from the production preview in Chromium at 1440×1000 and 375×1000, in English and zh-CN. These are cropped form regions with an 8px margin to include focus rings. Typed handles and calendar responses are synthetic; screenshots do not establish public-source or print qualification.

| Filename pattern | State |
| --- | --- |
| `landing-{en,zh-CN}-{1440,375}-empty.png` | GitHub, empty handle, disabled submit |
| `landing-{en,zh-CN}-{1440,375}-focus.png` | Keyboard-selected Gitee, username focus, shared ring |
| `landing-{en,zh-CN}-{1440,375}-ready.png` | GitHub, synthetic handle, enabled submit |
| `landing-{en,zh-CN}-{1440,375}-gitlab.png` | GitLab beta, enabled submit, expanded qualification |
| `studio-{en,zh-CN}-{1440,375}.png` | Same controls in the Studio Sources panel |

Regenerate with `pnpm build && pnpm test:e2e tests/m6-form-polish.spec.ts`, then copy `test-results/m6-form-polish/*.png` here. The acceptance spec checks alignment, text fit and padding, tap targets, horizontal overflow, keyboard navigation, disclosure toggling, disabled/enabled states, and recovery from a synthetic relay error.

## Validation — 2026-11-22

- `pnpm typecheck` and `pnpm lint`: passed.
- `pnpm test`: 296 tests passed across 26 files.
- `pnpm build`: passed, including the production website; existing large Scene chunk advisory remains.
- `pnpm test:e2e`: all 29 tests passed in 6.4 minutes, including the five new form cases, calendar relay fixtures, code-only product scope, protocol exclusion, official-logo kill switches, editable identities, and STL/3MF downloads.
- Independent patch review found no actionable issues. Desktop and mobile crops were visually inspected, including keyboard rings and expanded disclosure.
- The full suite also refreshed `examples/m5/landing-desktop.png` and its hash/size entry in `examples/m5/manifest.json`. Model export files are unchanged.

Browser scope is the repository's Chromium setup; Safari/Firefox and physical touch devices have not been manually tested.
