## [2026-09-04] — Self-review of the Teacher Classes / Lessons API, four fixes — Claude Code — branch `feat/s1-teacher-classes-api`

**Context**: asked to review my own and the branch's recent backend work and fix what was
actually broken. Static read of `classes.service.ts`, `lessons.service.ts`,
`users.service.ts`, the guards, the exception filter and the envelope interceptor, then the
full e2e suite against the real database.

**Four defects found and fixed** — `API-008`, `API-009`, `API-010`, `DEBT-004`:

1. **`PATCH .../lessons/reorder` accepted payloads `@@unique([classId, orderIndex])` cannot
   satisfy.** The `+10000` shift only avoids collisions when the payload is a complete
   permutation, and nothing checked that. A partial payload (which `ArrayMinSize(1)`
   explicitly permits) collides with the untouched lesson holding the target index; a
   duplicated `orderIndex` collides with itself inside the shift step. Now rejected as
   `VALIDATION_ERROR` before any write.

2. **`ClassesService.findById` failed open.** `if (!isAdmin && teacherId && ...)` meant that
   a call with no teacher id and no admin flag skipped the ownership check and returned any
   class with its roster. Both current callers pass one or the other, so it was latent —
   but "argument missing" resolving to "no check" is the wrong default in the one place
   ownership is enforced.

3. **Deleting a lesson re-packed order indices outside the transaction.** A failure between
   the delete and the loop left a permanent gap: `create()` takes `max + 1`, so nothing
   reuses it. Both steps now share one `$transaction`.

4. **The e2e suites were racing each other.** `node --test` parallelises test files; every
   suite shares one database and two of them create users. The INV-USERS-07 pagination walk
   saw the total move from 7 to 9 mid-run and failed as though a row had been duplicated —
   then passed on re-run with no code change. Fixed with `--test-concurrency=1`.

**Verification**:
- `pnpm --filter api test` — **79/79 pass**, 68s, deterministic across two runs. Five of
  those tests are new: partial reorder, duplicate id, duplicate index, out-of-range index,
  and one asserting the stored order is unchanged after each rejection.
- `pnpm --filter web build` — Compiled successfully.
- `node --test apps/web/scripts/*.test.mjs` — 39/39.
- `node scripts/check-docs.mjs` — 8/8.

**Noted, not changed**: `GET /teacher/classes` and `GET /admin/classes` return every row with
no pagination and no `meta`, while `API_CONVENTIONS.md` § Pagination specifies `{ data, meta }`
for lists. Changing the response shape now would break the Teacher screens another agent
wired to it this week, so it belongs in a deliberate pass with the FE, not in a review fix.

**Workspace warning, repeated**: three agents are sharing one working tree with no worktrees.
During this session the branch was switched and reset underneath an in-progress task; the work
survived only because it landed in `stash@{0}` (17 files, 2,742 lines — the Student LMS slice,
its Page Contracts and its flow map). That stash was taken on `feat/student-hanlu-ui` and its
imports no longer match this branch, whose Student component layer has since been rewritten
(`primitives`/`controls`/`overlay`/`toast` replaced by `ui.tsx` + `drawer.tsx`). It needs a
decision before it can be restored — see the previous session note.

**Next steps**:
- Decide where the stashed Student LMS slice lands: `feat/student-hanlu-ui` (imports match) or
  ported onto this branch's new component API.
- Give each agent its own git worktree, per `multi-agent-workflow.md` §5.
