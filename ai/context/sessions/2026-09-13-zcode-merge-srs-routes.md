## [2026-09-13] — Merge the stuck merge, land the uncommitted SRS + routes slices, sync with main — zcode — branch `feat/pw-sweep-routes`

**Context**: owner asked to "check the current code, push and merge everything". The
checkout was in a half-done state: a merge of `origin/main@198271f` (PR #74) into
`feat/pw-sweep-routes` sat unresolved for a day (sole conflict: `ai/PROGRESS.md`,
HEAD side empty, main side carrying two record entries); three sibling-lane edits were
uncommitted; `origin/main` had moved 4 commits further. No DB schema / Auth / RBAC /
money change authored here.

**Done**:
1. **Completed the stuck merge** (`841889f`) — resolved `ai/PROGRESS.md` by keeping
   main's two record entries (zcode student contracts, opencode assignments list);
   both lanes' entries now coexist in § Off-sprint.
2. **Landed the SRS slice found uncommitted** (`b08573e`): `flashcards/page.tsx` +
   `hanlu/srs.css` + new `scripts/srs-pagination.test.mjs` + new
   `tests/flashcards-interactive.spec.ts`. Browse vocabulary is now paginated
   (PAGE_SIZE 16, page resets on level/mode change), stat row became four semantic
   accent cards, vocab tiles went from the 2026-09-10 dense flush 4-per-row glossary
   to padded cards reflowing 1/2/3/4 columns. **Design-supersession note**: this
   replaces the owner's 2026-09-10 "exactly 4 per row at every viewport, zero gap,
   zero padding" request — flagged here because no session record of that reversal
   was found; the code+tests are self-consistent about the new design. Removed the
   then-unused `Metric` import (lint gate).
3. **Landed the sibling screen-check routes slice** (`f5d1e80`): `/student/classes`,
   `/student/notifications`, `/student/assignments` registered in `routes.ts`; unified
   the contradictory header (one paragraph said "not registered yet", the next said
   the sweep had closed it) and committed the sibling's session file
   `2026-09-12-screen-check-routes.md`.
4. **Merged current `origin/main`** (`c85557f`): PR #70 lesson-detail, #76 attempt
   answer schema, #56 prod-gated hook order, #72 student invoices. Clean, no conflict.
5. **Registered the new `/student/invoices` screens** (`2b4d5ff`): static list route +
   `[invoiceId]` detail with a `studentInvoice` resolver reading the student-scoped
   `GET /student/invoices` (never the admin list). Seed's INV-202608-0001 belongs to
   `student@hsk.local`, so the resolver hits seed data, no fixtures.

**Verification (all run, not assumed)**:
- `pnpm --filter web build` exit 0 — 57 routes incl. flashcards + both invoices pages.
- `node --test apps/web/scripts/*.test.mjs scripts/*.test.mjs` from repo root (CI's
  exact invocation): **193/193**. Note: run from `apps/web` instead and
  `check-docs.test.mjs` fails — it resolves `scripts/check-docs.mjs` off CWD.
- `node scripts/check-docs.mjs` 9/9. `pnpm --filter web lint` clean after moving the
  orphan script aside (below). `tsc --noEmit` clean.
- **Live run** (API from `dist` on :3001, prod web on :3000, real login):
  `flashcards-interactive.spec.ts` **6/6** across desktop + 375px — layout, 4-in-a-row
  alignment, tile padding, pagination state transitions, level-change reset, no 375px
  overflow. First attempt failed 1/6 with a transient `ECONNRESET` on the 6th login
  POST; immediate full re-run passed 6/6. Desktop screenshot read: 4 stat cards, HSK
  selector, 4-col grid, "Hiển thị 1–16 trong tổng số 28 từ" with Trước/1/2/Sau.

**Environment notes for the next session**:
- `tsx src/main.ts` does NOT boot the API (`CannotDetermineTypeError` on
  `QuestionContent.audioUrl`, `@nestjs/mongoose` needs explicit `@Prop({ type })` for
  optional fields under tsx's transform). `node dist/src/main.js` boots fine — both
  DBs up. Related but distinct from open `BUILD-004` (`nest build` TS2322 in
  `vocab-apply.ts`, still red on main).
- `check-dashboard-live.mjs` (untracked, references a `LiveDashboard` component that
  does not exist in this tree — the dashboard-live lane lives in the `Real-dashlive`
  worktree) blocked the lint gate; moved aside to
  `apps/web/check-dashboard-live.mjs.uncommitted-scratch`, NOT committed, NOT deleted.
- `.workbuddy-ai/` is tool state — added to `.gitignore`.

**Blocker / needs follow-up**:
- None blocking this merge. `BUILD-004` stays open (API lane).
- The orphan scratch file remains on disk for the dashboard-live lane to reclaim.

**Next steps**: push, PR, merge; branch cleanup per step 8.
