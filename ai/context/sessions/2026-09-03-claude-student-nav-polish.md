## [2026-09-03] — Student navigation & failure states — Claude Code — branch `feat/student-hanlu-ui`

**Done**:
- Finished the in-flight navigation pass that was sitting uncommitted in the working tree:
  staggered `router.prefetch` of the top-level Student routes after first paint, hover/focus
  prefetch on every rail, tab-bar and sheet link, a `.route-progress` indicator in the main
  column, and `aria-busy` + an `aria-live` announcement on `#main` so the transition is not
  sighted-only.
- Added a cap on the progress indicator. A navigation that is blocked, aborted, or resolves
  back to the same URL never changes `pathname`, and the original code only cleared the flag
  in the `pathname` effect — so the bar could spin forever. It now clears itself after 8s.
- Added `apps/web/src/app/student/error.tsx`. The Student area had no error boundary, so a
  render error fell through to the root boundary, which is painted with the Admin area's light
  tokens and drops the shell entirely. The boundary keeps the rail, topbar and theme and
  replaces only the content column, offering Next's `reset()`.
- Committed `apps/web/src/app/student/loading.tsx` (previously untracked) — the segment-level
  skeleton the progress indicator hands off to.

**Verification** (fast lane per `working-rules.md` § Verify):
- `pnpm --filter web build` — exit 0, 37 pages.
- `node --test apps/web/scripts/*.test.mjs` — 34/34.
- `pnpm check:docs` — still the same **18 pre-existing** `endpoint-undefined` violations and no
  others; that is `DOC-013`, untouched by this change.
- Browser, `/student` → `/student/learning-path`: the indicator reads
  `route-progress is-active` with `aria-busy="true"` during the transition and clears to
  `aria-busy="false"` on arrival. No console errors.

**Not verified**:
- `error.tsx` compiles and is wired as the segment boundary but was **not** exercised at
  runtime — no render error was forced to trigger it.

**Contract/temporary decisions to preserve**:
- Still `MOCK(student)` mockup mode: no API, no auth, no endpoint, field, error code, RBAC or
  schema was defined or invented.
- Styling stays scoped below `.student-root`; Admin and Teacher baselines untouched.
- `root-design-fe.md` / `_DESIGN-SYSTEM.md` not promoted — `/design-promote` is the human's call.

**Next steps**:
- Push `feat/student-hanlu-ui` and open the PR (8 commits ahead of `origin/main`).
- `DOC-013` still blocks the docs gate and belongs to the docs/API owner.
