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

---

## [2026-09-03] — Verification rule replaced: Playwright + screenshots are now mandatory — Claude Code

**Why**: the owner instructed that the workflow's testing rule be re-enabled — an agent must
actually drive the pages in a browser and produce screenshots **before** committing. The
"Verify — FAST by default" rule, which allowed a build plus one glance and explicitly skipped
375px and per-state captures, is gone.

**Done**:
- Installed `@playwright/test` in `apps/web` (chromium only) with `playwright.config.ts`:
  two projects, `desktop` (1280×800) and `mobile-375` (375×812), `webServer` running
  `next start` — not `next dev`, because dev overlays and unminified timing have masked real
  regressions here before.
- `apps/web/tests/routes.ts` — the route manifest, with valid ids for the dynamic routes, and
  `selectScreens()` reading `PW_ROUTES` / `PW_AREA` / `PW_ALL`. Selecting nothing throws rather
  than passing: a check that silently verifies zero screens is worse than no check.
- `apps/web/tests/screens.spec.ts` — per screen: HTTP < 400, a visible `<h1>` inside `<main>`,
  that heading is not a "Không tìm thấy" fallback, no console error or uncaught exception, no
  horizontal scroll; then a full-page screenshot to
  `apps/web/test-results/screens/<viewport>/<area>-<screen>.png`.
- `ai/rules/working-rules.md` § Verify rewritten, and step 6 of § The flow updated to match.
- `.github/workflows/screens.yml` — runs the whole matrix with `PW_ALL=1` on any PR touching
  `apps/web/**` and uploads the screenshots as an artifact.
- Identical "Before you commit UI code" block added to **both** `AGENTS.md` and `CLAUDE.md`
  (check 8 fails if they drift) so the contract is in front of every agent at startup.

**Two real bugs the very first runs found** — recorded as `WEB-007` and `WEB-008`:
- Every learning-path lesson above HSK 1, and the entire Hán Ngữ curriculum, rendered
  "Không tìm thấy chặng": the id parser looked for `-L<n>-` and a `han_yu` prefix, neither of
  which any generated id has. The earlier smoke test passed because its single fixture,
  `std-1-l1`, matched the parser's own fallback.
- Two screens scrolled horizontally at 375px — the lesson page (388px) and `/admin/payroll`
  (409px, then 378px after the first of two separate causes was fixed).

**Verification**:
- `pnpm --filter web build` — exit 0.
- `pnpm --filter web test:screens` with `PW_ALL=1` — **70/70 passed** (35 screens × 2
  viewports) in 1.6 minutes, screenshots written for all of them.
- `node --test apps/web/scripts/*.test.mjs` — 34/34.
- `pnpm check:docs` — still the same 18 pre-existing `DOC-013` violations, no drift between
  `AGENTS.md` and `CLAUDE.md`.

**Trap worth knowing** (now commented in `playwright.config.ts`): `reuseExistingServer` will
reuse a server already on the port. Reusing one started from an older build silently verifies
the wrong code — an already-applied 375px fix still reported as broken, and a preview server's
instrumentation added a spurious 400 to every page. Stop stray servers before trusting a run.

**Blocker / needs follow-up**:
- `DOC-013` still blocks `check:docs`; it belongs to the docs/API owner.
- `.github/workflows/screens.yml` has never executed — there is no PR yet. Its first run is
  the real test of the CI half.

**Addendum — `/student/landing`**: the route landed on this branch (commit `4c88b62`) while the
screen check was being written, so it was not in the first manifest. Added, and it failed
immediately at 375px with a 443px document: the sitebar keeps a 158px premium CTA beside the
theme toggle and burger, and the final CTA's label measures 416px against the global
`white-space: nowrap` on `.btn` — a button wider than the viewport, spilling out of both edges.
Both fixed in `landing.css`; the CTA hide is scoped to `.sitebar__actions` because the mobile
menu reuses the same class for its own copy of that link. Full matrix now **72/72**.

One flake worth knowing: running the landing page's two viewports in parallel locally makes both
slow (~1.4 min) and can truncate the trace, because each worker spins up its own WebGL context
for the Three.js hero. It passes in 6s on its own, and CI runs `workers: 1`, so this is a local
parallelism artifact rather than a page problem.
