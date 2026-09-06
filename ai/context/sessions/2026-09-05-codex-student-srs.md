## [2026-09-05] — Student SRS production slice — Codex — branch `codex/student-srs`

**Context**:
The owner requested implementation of all Student self-study functions, then explicitly approved
the full Student scope, including DB/Auth/RBAC-sensitive work. Repository inspection showed that
only S-SRS-1..5 had an approved four-endpoint API contract. S-SRS-6/7, F9–F16, Skill Drill and
Student analytics still lack approved transport contracts; the source corpus is outside the repo.

**Done**:
- Implemented the Mongo `Flashcard` and `UserFlashcardState` runtime schemas and registered the
  Student flashcard module.
- Implemented browse, due queue, SM-2 review and statistics endpoints with Student RBAC and
  per-user ownership enforced server-side.
- Added public ratings 0/3/4/5, first-review upsert, retention counters and registered error codes.
- Replaced the `/student/mistakes` mock/ComingSoon page with a live HSK 1–9 browser and SRS review
  surface, including loading, empty, partial and error states.
- Added the Student SRS backend module spec, Page Contract, flow map and page spec.
- Moved the work to clean branch `codex/student-srs`; unrelated Admin commit `9803a9b` remains
  preserved on `codex/full-student-scope` and is not part of this branch.

**Not implemented / blockers**:
- Production vocabulary seed: `DOC-011`; no approved repository-owned source/import strategy.
- SRS streak: timezone/calendar boundary is not approved, so the API returns `streak: null`.
- S-SRS-6/7, F9–F16, Skill Drill and Student analytics: no approved endpoint/payload contracts.
- XP curve, leaderboard privacy, F14 input mode and content unlock behavior remain product
  decisions. No API, schema or fallback fixture was invented for them.

**Verification**:
- `pnpm --filter api build` — pass.
- `pnpm --filter api exec jest --runInBand test/student-flashcards.e2e.test.ts` — 6/6 pass
  against the configured PostgreSQL and MongoDB services.
- `pnpm --filter web build` — pass; `/student/mistakes` included in the production route table.
- `node --test apps/web/scripts/*.test.mjs` — 36/36 pass.
- `node scripts/check-docs.mjs` — 8/8 pass before each implementation commit.
- Full `pnpm --filter api test -- --runInBand` — **not green**: SRS remained 6/6 and the run
  reached 111 passes, but 13 existing enrollment/teacher/admin tests failed and 23 were cancelled
  because the configured database lacks `class_enrollments.rejoined_at`. The migration belongs to
  the separate Student Enrollment lane and was not applied or changed here.

**Commits before RECORD**:
- `d708957` — claim the Student scope.
- `bb6de45` — Student SM-2 backend and tests.
- `9575054` — live Student SRS frontend and contracts.

**Next steps**:
1. Approve a repository-owned vocabulary/content import strategy and provide/licence the source.
2. Approve the missing Student API contracts and the five unresolved product rules.
3. Then implement S-SRS-6/7, analytics and F9–F16 as separate contract-first logical units.
