## [2026-09-12] — PW screen sweep: dynamic routes registered, PW_ALL=1 101/102 — opencode — branch `feat/pw-sweep-routes`

**Context**: `routes.ts` documented dynamic routes as unregistered (ids only valid per seed
run). Task: register the missing routes + full sweep on a prod build + record. No
schema/Auth/RBAC/money touch. Sibling lane has uncommitted `routes.ts` header + 3 static
rows, `flashcards/page.tsx` and `srs.css` edits in this checkout — left untouched, my
hunks staged per-hunk at commit.

**Done**:
1. **`routes.ts`**: `Screen.resolve?` key + 13 entries — 4 mock-id routes with literal keys
   from `content.ts` (`exams/e-h1-1` + `/result`, `workplace/sc-1`, `writing/w1`) and 9
   dynamic (student class/lesson/attempt/attempt-result, teacher class/lessons, admin
   user/invoice/payroll-period). Header "not registered yet" paragraph closed with a pointer
   to the mechanism. `PW_ROUTES` matches placeholders literally.
2. **`tests/resolve-ids.ts`** (new): seed-first resolution (admin users/invoices/payroll,
   teacher classes, student classes via seeded logins); timestamped sweep fixtures ONLY for
   attempt+lesson (class + 2 questions + assignment + started attempt + lesson, `PW sweep …`
   titles, public API only — join code, no DB access, no seed writes); unresolvable → SKIP
   with reason, never a faked id. Per-worker cache.
3. **`screens.spec.ts`**: check body extracted to `runScreenCheck` (identical assertions);
   dynamic entries resolve in-test and skip honestly when unresolvable.
4. **Sweep** (`PW_ALL=1`, prod build, isolated API :3101 + web :3002, sibling :3000/:3001
   untouched, `--workers=1`): **101 passed, 1 failed, 0 skipped, 0 console errors
   elsewhere** across desktop + mobile-375. All 13 new routes green both viewports.
   Fixture leftovers in dev DB: `PW sweep class/assignment/lesson …` rows (+2 questions,
   1 attempt) — timestamped, traceable; CI runs disposable DBs.

**The 1 failure — `WEB-021` (new, pre-existing, admin lane, not this slice)**:
`/admin/payroll` renders 591px wide at 375px (ledger table, no mobile-card fallback).
Filed with fix pointer (mirror `admin-invoices` cards). Note: no screenshot exists for it —
the spec asserts overflow before capturing, so only trace.zip remains.

**Environment notes**: Playwright `reuseExistingServer` once verified the WRONG build
(sibling Real-invoices `:3000`) — reran on `:3002` with API on `:3101` (baked via a
temporary gitignored `apps/web/.env.local`, deleted after; tree rebuilt default-green
43/43 afterwards). `$env:NEXT_PUBLIC_API_URL` does not reach `next build` under this
harness — the file route is the reliable one (same lesson as the DoD session).

**Blocker / needs follow-up**: review/merge this branch; WEB-021 fix belongs to admin FE;
sweep fixtures accumulate slowly in dev (documented, timestamped).

**Next steps**: merge review.
