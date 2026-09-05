## [2026-09-05] — Student enrollment API: closing the cross-actor chain — Claude Code — branch `feat/s2-student-enrollment`

**Context**:
The owner asked which APIs matter most for linking Student + Teacher + Admin, and to plan the
code from there. Auditing `apps/api/src` against `API_STUDENT.md` / `API_TEACHER.md` /
`API_ADMIN.md` produced four cross-actor chains. Chain 1 — *Admin approves → Teacher creates
class → **Student joins** → Teacher sees roster → Admin audits* — was **three of four links
already live and one link missing entirely**. `ClassEnrollment` already existed in the schema
with the right shape, the spec `03-classes-enrollment.md` was `accepted`, its eight invariants
were written, and all six error codes were already in `error-codes.ts`. Nothing had to be
invented; the endpoints simply did not exist.

The other three chains were left alone on purpose: Sessions→Payroll and Invoicing are claimed
by Antigravity in `ai/PROGRESS.md` and are additionally blocked on ADR-010 (money
representation, never asked) and `API-002` (two contradictory rate-reading formulas).

**Done**:
- Four endpoints in `apps/api/src/classes/student-classes.controller.ts` +
  `ClassesService` methods `joinByCode` / `leave` / `findMyEnrolledClasses` /
  `findEnrolledClassDetail`, plus `JoinClassDto`.
- Migration `20260905120000_add_enrollment_rejoined_at` — one nullable `rejoined_at` column.
- 19 e2e tests in `apps/api/test/student-enrollment.e2e.test.ts`.
- Closed the open re-join question in `docs/api/modules/03-classes-enrollment.md` § 16 and
  wrote the decision up as a new § 8.1.
- `ai/PROGRESS.md`: F2.3 / F2.4 / F2.6 → `✅`, with an explicit caveat that the Sprint 2 DoD is
  **not** fully met because no student FE screen exists.
- `KNOWN_ISSUES.md`: `BUILD-002`, `WEB-014`.

**Temporary decisions to preserve**:
- **Re-join after `dropped` reactivates the existing row** (owner, 2026-09-05). `joinedAt` is
  preserved, `rejoinedAt` records the return. `UNIQUE(classId, studentId)` makes a second row
  impossible, so the only alternative was blocking — rejected because a student who mis-clicks
  *Rời lớp* would be stranded with no re-admit endpoint anywhere, the same defect class as
  `API-003`.
- **Per-question score → a join table `AssignmentQuestion { assignmentId, questionId,
  orderIndex, points }`** replacing `Assignment.questionIds: text[]` (owner, 2026-09-05).
  **Approved but not yet implemented** — it belongs to the Assignments slice. It also requires
  editing `ENTITY_ASSIGNMENT.md` and the `questionIds` line in `working-rules.md` § Database
  Rules, which the owner approved as part of the same decision.
- The owner's standing criterion for these: the platform is not deployed and cannot be tested
  end to end, so prefer whichever option stays easiest to change later.

**Blocker / needs follow-up**:
- **`WEB-014` — there is no `/student/classes` screen.** The API is real and tested; a human
  still cannot join a class in a browser. The chain is proven by an e2e test, not by a person.
  This is the single most important follow-up and it is why Sprint 2's DoD is not closed.
- **`BUILD-002`** — a fresh worktree's `pnpm install` leaves `@prisma/engines/dist/index.js`
  missing, which breaks every Prisma command. Worked around by copying the directory from the
  main checkout; root cause (pnpm not running the postinstall) not fixed.
- **`DOC-014` is real and getting worse.** `BUILD-002` and `WEB-014` were numbered against
  `origin/main`; other unmerged branches hold ids main cannot see. Merge the issue lists by
  hand.

**Environment notes — read before starting work here**:
- The main checkout `D:\\PersonalProject\\Real` was **occupied by another agent mid-session**:
  it started on `feat/admin-10-apis` with a clean tree and moved to `feat/teacher-4-pages` with
  102 uncommitted lines in the sessions module while this session was running. All work was
  therefore done in a sibling worktree `../Real-claude-student`, per
  `multi-agent-workflow.md` §5. Four worktrees now exist.
- That worktree points at an **isolated local database `hsk_dev_student`**, not the shared
  `hsk_dev`. This was deliberate: applying a migration to the shared database would record it in
  `_prisma_migrations` while the migration file lives only on this branch, so the next
  `prisma migrate dev` from another checkout would report drift and could offer to reset the
  development database — with that agent's uncommitted work still in the tree.
- The API suite still shares one MongoDB Atlas cluster across worktrees (`DEBT-004` territory);
  the question-bank tests were unaffected here but the exposure remains.

**Verification** (full lane — RBAC/permission boundaries were touched):
- `pnpm --filter api build` — clean.
- Full API suite **112/112 across 17 suites** (baseline 93 + 19 new), `--test-concurrency=1`,
  against a real PostgreSQL and real Atlas. Includes two concurrent joins asserting exactly one
  enrollment row survives, and a re-join asserting `joinedAt` was not overwritten.
- `node scripts/check-docs.mjs` — 8/8.
- **No browser verification, because there is no screen to open.** Backend-only slice; the
  usual desktop + 375px screenshot pass applies to `WEB-014` when the FE is built.

**Next steps**:
1. `WEB-014` — `flow-mapper` for `/student/classes` and `/student/classes/[classId]`, then build
   and wire. This is what actually closes the Sprint 2 DoD.
2. Assignments slice with the approved `AssignmentQuestion` join table; it also unblocks
   `WEB-013` (`usageCount` has no source until `Assignment` exists).
3. Open the PR for this branch and reconcile `KNOWN_ISSUES.md` ids by hand (`DOC-014`).
