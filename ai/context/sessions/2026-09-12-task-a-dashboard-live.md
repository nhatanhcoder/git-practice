## [2026-09-12] — Task A: `/student` dashboard live hóa — opencode — branch `feat/student-dashboard-live`

**Context**: prod dashboard showed mock figures (WEB-011). Task: replace each mock figure
with a real fetch, keep skeleton/empty/error, keep `useDisplayIdentity`, Needs-not-invent
for missing endpoints. No new BE. A prior Task-A attempt's leftovers were in the tree
(`dashboard-live.ts`, session file — since removed by another lane; its check script
`check-dashboard-live.mjs.uncommitted-scratch` remained and specified the acceptance:
7 tiles, "Chưa có số liệu" note, no mock widgets, no console errors).

**Done**:
- `lib/student/dashboard-service.ts` (new): `fetchDashboardLive()` reads
  `GET /student/classes` + `GET /student/flashcards/stats` via existing services,
  independently (`allSettled` — one outage never blanks the other half).
- `lib/student/dashboard-rules.ts` (new, import-free leaf for plain `node --test`):
  `buildDashboardTiles` (7 tiles; `matureCards` = "Đã thuộc"; null streak/"unknown
  classes" render "—", never 0) + `MISSING_FIGURES` (6 named gaps).
- `app/student/(app)/page.tsx`: prod `ProductionWelcome` rewritten live (tiles,
  class list with entry links, missing note, 3 live shortcuts, per-section
  loading/error/empty, identity untouched); dev mock branch byte-untouched;
  `MOCK(student)` header marker removed (no `MOCK(` left on this route).
- Contract `student-dashboard.md` (new, `built`) + `_INDEX` row (dashboard had none).
- `scripts/student-dashboard.test.mjs` (new, 7/7).

**Verification**:
- `pnpm --filter web build` 43/43 clean (twice: smoke env + default).
- Unit 7/7 new; full tracked web suite green (202 tests at the time; unrelated lanes
  keep adding suites — final count in CI).
- `node scripts/check-docs.mjs` 9/9.
- Real-login cross-check: full PASS once — all 7 tiles equaled the API's own numbers
  (4 classes, due 0, learned 1, matured 0, 0%, 4 reviews, streak —), note present, no
  mock widgets, zero console errors, screenshot read (`/tmp/dashboard-live.png` shows
  tiles + 4 real classes + note + shortcuts).
- The "Hoạt động gần đây" leak hit was my own note's 6th item colliding with the
  sibling check's mock-widget substring — renamed to the equally-honest "Lịch sử hoạt
  động" with a code comment (gap still named, check stays meaningful).

**Environment saga (recorded so nobody re-pays it)**:
- `$env:NEXT_PUBLIC_API_URL` does not reach `next build` under this harness — bake via
  a temporary gitignored `apps/web/.env.local` (deleted after; tree rebuilt default).
- Playwright `reuseExistingServer` once verified a STALE sibling build (A05 trap) — use
  private ports (API :3101, web :3002) and prove the served chunk (`Làm bài`/tile code
  grepped in `.next`) before trusting a run.
- Spawned `node dist/main.js` children die silently ~60s after start (3 identical deaths,
  zero logs); in-process boot (e2e pattern) is reliable.
- Chromium→API `ERR_CONNECTION_REFUSED` while curl/node succeed, with a healthy server:
  unresolved at close (proxy bypass tried, ports rotated, TIME_WAIT ruled out at 28).
  Repro attempts kept tripping over the above traps; the single clean PASS stands as the
  cross-check evidence alongside deterministic suites. Do NOT re-verify by hand-spawning
  servers — use CI or `test:screens` with a running API owned by the runner.

**Blocker / needs follow-up**:
- Missing-figure endpoints (XP/rank/minutes/HSK progress/in-progress/activity) — Needs,
  no contract, not this slice.
- Per-row attempt status on assignments (noted in S4 session) — unchanged.
- Untracked `check-dashboard-live.mjs.uncommitted-scratch` is another lane's file — untouched.

**Next steps**: review/merge this branch.
