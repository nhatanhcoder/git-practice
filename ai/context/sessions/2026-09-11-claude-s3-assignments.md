## [2026-09-11] — S3 AssignmentsModule: DB + backend + both FE screens, end to end — claude — branch `feat/s3-assignments`

**Context**: the user's "check tính năng nào chưa code thì làm hết đi" gap map picked the S3
Assignments slice as the largest unbuilt feature with complete paperwork (teacher spec
03-assignments.md, ENTITY_ASSIGNMENT/LESSON_ASSIGNMENT/ATTEMPT, agreed `ASSIGNMENT_*` codes).
The DB-schema change was covered by the user's standing instruction for uncoded features;
each migration sits in its own commit for review.

**Done**:
1. **Migrations**: `assignments` + `lesson_assignments` (entity-spec shapes, snake_case
   columns, FK cascade); `attempts` (S3 only READS it — the attempt-freeze and stats
   invariants are unimplementable without it; the official-attempt partial unique index was
   added by hand since Prisma cannot express it); + one fix migration renaming two camelCase
   columns the diff generator missed.
2. **Backend** (`apps/api/src/assignments/`): DTOs with cross-field validation, service with
   all 8 INV-TASG rules, teacher controller (create/list/detail/update/delete) + student
   `GET /student/assignments`. Publish fans out `new_assignment` notifications per
   active-enrolled student (the `notifications` table already existed — no new table invented).
   `ASSIGNMENT_*` codes added to `error-codes.ts` exactly as the registry defines them.
3. **Three real bugs the e2e suite caught** (and fixes): INV-TASG-02 silently stripped
   homework time limits instead of rejecting (both create and update paths); every service
   return was `{data:…}`-wrapped, double-wrapping under the EnvelopeInterceptor (list/detail
   create-update-student paths all fixed); `computeStats` groupBy 500'd on the live DB →
   plain findMany. Lesson: the first suite run was 10 pass / 22 — each failure was a real
   defect or an invented test input (I had used `grammar/reorder`, which does not exist —
   only the nine ENTITY sub-types do; fixed to reading/sentence_ordering).
4. **Frontend**: `/teacher/assignments` wired (real classes/questions/list; single-flight
   create/update/delete; stats drawer with server-derived counts + honest S4 note for
   per-student names; MOCK markers removed). `/student/assignments` rewritten off
   `lms-data` mocks onto `GET /student/assignments` + real enrolled classes; no fake
   attempt-status badges — a note says S4 unlocks làm-bài.

**Verification**: assignments e2e 22/22 · **full API suite 210/210 (35 suites)** · web build
clean · web tests 145/145 · check-docs 9/9 · browser production build against live API:
teacher list shows both seeded fixtures; drawer "1 học viên active / 0 đã nộp" matches the
DB; student sees the published mock_test only (the draft never leaks); 375px no overflow.

**Environment incident worth repeating**: mid-task the `Real-s3-assignments` worktree was
**emptied by an external process** (another lane or a cleanup) — no `.git`, empty `apps/api`.
Nothing was lost: the branch had been adopted at the main checkout with all my commits intact
(`8169509` = my module + tests, committed by the parallel lane), and the main checkout had
`feat/s3-assignments` checked out with full node_modules. I removed the stale worktree
registration and continued at the main checkout. If a worktree vanishes: check `git worktree
list` + the main checkout's `git log` BEFORE assuming data loss.

**Not done (tracked)**: WEB-013 (usageCount gate on question delete) — needs the
question-list response to carry usage; teacher grading screen (T-GRADE) and attempts (S4)
are the next slices, both now unblocked by the `attempts` table existing.

**DB/Auth/RBAC/money**: 3 new tables (review-committed separately); no auth/RBAC change;
no money code.

**Merge review (2026-09-12)**: updated the branch onto current `main` and repaired the nine
reported lint failures without changing runtime contracts: the e2e response helper now uses a
generic typed body, student imports contain only the icon used, and the teacher question picker
memo includes `bankQuestions`. Removed the obsolete Assignments hook suppression. Verified
`pnpm lint`, API type-check/build, `pnpm --filter web build`, and check-docs 9/9. The database
suite was not rerun against developer data; isolated GitHub CI is the merge gate.
