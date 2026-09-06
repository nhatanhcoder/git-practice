## [2026-09-06] — Replacing the learner area with the Hán Lộ UI — Claude Code — branch `feat/student-hanlu-restore`

**Context**:
With PRs #35, #36, #37 and #38 all merged, signing in as a student still landed on the old
"Hành trình HSK" layout. That is the mock spike from 2026-08-28; PR #38 (mine) had only
repainted its tokens dark, which was the wrong reading of "lấy cái tối làm chính" — the owner
meant the actual Hán Lộ product, not the old screens in dark paint.

**How the branch came back**: the owner had asked me to delete `feat/student-hanlu-ui` earlier,
and I did — local and remote. When it turned out to hold the wanted UI, the commit `16be0b1`
was still unreferenced-but-present in the local object store, so `git branch feat/student-hanlu-ui
16be0b1` restored it in full. **That was luck, not design**: an intervening `git gc` would have
made it unrecoverable. Before deleting a branch again, say plainly what functionality dies with
it — I had described it as "52 files, +15.9k/−3.3k", which reads as a cost, not as "this is the
student UI".

**Done** — ported from `16be0b1`: 38 route files, 6 components, 12 data modules and the
six-stylesheet stack. Brings 17 routes `main` did not have (`classes`, `assignments`,
`attempts`, `exams`, `badges`, `flashcards`, `lego`, `placement`, `progress` + detail routes).

**Three things deliberately not taken from the source branch** — each would have been a
regression:

1. **The login guard.** That branch predates PR #32 and its `student/layout.tsx` has no
   `RequireAuth`. Every learner route was therefore ported **inside** the `(app)` route group
   rather than at the flat path. A straight copy would have put the whole learner area back in
   front of anonymous visitors, and nothing would have failed loudly enough to notice.
2. **`/student/landing`** keeps main's copy — public, outside `(app)`, and it took two
   corrections to get right (missing teacher photos, then the missing stylesheet stack).
3. **`/student/mistakes`** keeps main's file. The source branch's is 271 lines with **zero API
   calls**; main's is the SRS slice from PR #36, wired to `/student/flashcards` and covered by
   6 e2e tests. Replacing tested, wired code with a mock is not a port.

**`student.css` deleted, `student-ground.css` added.** Nothing imported the old file once the six
sheets landed, but one rule was still needed: `globals.css` paints `html`/`body` light for the
whole app (Admin and Teacher still want that) and **none of the six Hán Lộ sheets touch `html` or
`body`**, so a light strip shows wherever the root does not reach the viewport edge. The
replacement scopes the dark ground with `:has(.student-root)`.

**`check-docs.mjs` fixed in the same commit.** Its status-drift check built paths as
`app/<route>/page.tsx` and did not know Next.js route groups exist, so every route that moved into
`(app)` was reported as *"marked built but missing"* — a false failure that blocks CI while the
page works. `pageExists()` now tries the literal segment then any `(group)` beside it, recursing
for nested groups. **Verified to still fire**, per the project's own rule that a check must be
proven to catch the thing it guards: moving the mistakes page away reproduces the failure,
restoring it clears it.

**Verification** — browser, live API:
- signing in lands on the Hán Lộ dashboard; `"Hán Lộ"` present and `"Hành trình HSK"` absent from
  the rendered page
- anonymous `/student` → `/login?next=%2Fstudent`, and anonymous `/student/classes` (a newly
  added route) → `/login?next=%2Fstudent%2Fclasses`, so the guard covers the new routes
- `/student/landing` stays public with no learner sidebar
- `pnpm --filter web build` clean · API suite **170/170 across 27 suites** · web script tests
  36/36 · `check-docs` 8/8

**Blocker / needs follow-up**:
- **17 new routes, and the backend for most of them does not exist.** `classes` has a real API
  (PR #31); `assignments`, `attempts`, `exams`, `placement` and `progress` do not. Those screens
  run on the source branch's mock data. They should be audited against `WEB-011`'s rule — a
  fallback the caller never checks is a screen that cannot say it is disconnected.
- The old learner screens are gone from the tree, so anything that referenced them by path needs
  re-checking. `_INDEX.md` statuses were not revisited beyond making the checker correct.
- `feat/student-hanlu-ui` is restored **locally only** — still 0 on origin. Push it, or the same
  near-loss can happen again.
