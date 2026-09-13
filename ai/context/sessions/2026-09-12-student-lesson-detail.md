## [2026-09-12] — Student lesson detail (S-LESSON-2): contract + endpoint + FE wiring — opencode — branch `feat/student-lesson-detail`

**Context**: user-ordered 4-step slice with an explicit RBAC gate. Startup reads done
(`AGENTS.md`, 5 always-loaded files, newest session `2026-09-12-readme-index.md`). Plan
presented before any edit; user approved full plan via the approval gate. Task type:
CODE (touches RBAC → approval was mandatory, obtained).

**Done**:
1. **Page Contract** `docs/front-end-design-docs/pages/student-pages/student-lesson-detail.md`
   (flow-mapper template, <60 lines, 7 states, existing registry codes only) — `status: built`.
   Registered in `pages/_INDEX.md` (Student table) and `student-flow.md` (tree edge + transition
   row 10). `API_STUDENT.md` Classes table gained the
   `GET /api/v1/student/classes/:classId/lessons/:lessonId` row (user-prescribed path; was
   absent — the one endpoint this slice adds, owner-approved in the plan gate).
2. **BE** `ClassesService.findEnrolledLessonDetail(studentId, classId, lessonId)` — mirrors
   `findEnrolledClassDetail`: uuid-validate both ids (`VALIDATION_ERROR`), active-enrollment
   check in service (`CLASS_ACCESS_DENIED`, `@Roles` never trusted for ownership), lesson must
   satisfy `lesson.classId === classId` (`LESSON_NOT_FOUND`, no cross-class leak). Returns the
   full `ENTITY_LESSON` row; never leaks `enrollmentCode` or the peer roster. Route
   `GET :classId/lessons/:lessonId` on `StudentClassesController` (3 segments — `:id` cannot
   swallow it). No new error code, no migration (read-only over existing tables).
3. **FE** `page.tsx` now reads `fetchEnrolledLessonDetail` (new in `lib/student/classes-service.ts`)
   instead of filtering a class payload client-side; outcome via new
   `resolveSingleLessonOutcome` in `classes-rules.ts` (adds `LESSON_NOT_FOUND` → not_found).
   Class name is best-effort header context from `fetchEnrolledClassDetail` (its failure never
   hides a loaded lesson). Assignments panel stays an honest S-LESSON-3 unavailable notice.
   Verified: no `MOCK(` markers in this slice (the stub had none — it rendered unavailable
   notices, not fixtures). `root-design-fe.md` untouched.
4. **e2e + verify**: `apps/api/test/student-lesson-detail.e2e.test.ts` — 10-test ownership
   matrix (enrolled 200 + field shape, never-enrolled 403, cross-class 404, unknown id 404,
   both malformed ids 400, teacher role 403 `AUTH_INSUFFICIENT_ROLE`, anonymous 401, dropped
   403). `pnpm --filter api build` clean · API **198/198 across 32 suites** (direct `node` +
   tsx CLI, see below) · tracked web tests **155/155** (11 new) · `pnpm --filter web build`
   42/42 · `node scripts/check-docs.mjs` 9/9 (one `status-drift` caught mid-slice: added row
   said `contracted` while code exists — corrected to `built`, contract states to `[x]`).

**Temporary decisions to preserve**:
- Lesson-only payload v1: S-LESSON-3 assignments and S-LESSON-4 supplements render as
  unavailable (`⛔` in contract + `API_STUDENT.md` § Accepted-capabilities). No join invented.
- Error mapping reuses `CLASS_ACCESS_DENIED` for dropped/never-enrolled (consistent with
  `findEnrolledClassDetail`); `LESSON_ACCESS_DENIED` NOT reused — its registry text is
  teacher-specific.
- `resolveLessonDetailOutcome` (class-payload variant) kept untouched — still referenced by
  existing tests; the page uses the new single-payload resolver.

**Blocker / needs follow-up**:
- `WEB-022` (new): eyebrow `Bài ${orderIndex + 1}` vs 1-based `orderIndex` — kept as-is, one-line fix.
- `BUILD-005` (new): `node --import tsx --test` broken on local Node 25 (tsx 4.23.12 loader);
  ran the API suite via the tsx CLI instead. CI (Node 24) unaffected.
- Pre-existing, not mine: `apps/web/.../(app)/page.tsx` (dashboard-live), `dashboard-live.ts`,
  `dashboard-live.test.mjs`, `srs-pagination.test.mjs`, `flashcards-interactive.spec.ts` are
  uncommitted sibling work in this checkout — left untouched. The 2 untracked web test files
  fail against current code; all 13 tracked suites pass.

**Next steps**:
1. Review + merge this branch (commit staged below excludes the sibling files).
2. S-LESSON-3 assignments read (Sprint 4) to fill the unavailable panel.
