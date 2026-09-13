## [2026-09-12] — Sprint 4 attempt lifecycle (S-ASGN-2..7): spec + BE + FE + DoD — opencode — branch `feat/s4-attempt-lifecycle`

**Context**: full vertical slice per owner-approved plan A–F (approval = AI re-open for
§16-Q1). Task type CODE (schema + RBAC + AI key surface). No endpoint/field/code invented.

**Done**:
- **A. Spec** `docs/api/modules/student/03-attempt-lifecycle.md` (16 sections, 11 invariants)
  + student `_INDEX` row 3. Locked rules: unit scale 1pt/answer (Q7), start idempotent by
  existence, dueDate gates start only, server-side deadline (no scheduler — ADR-006 also an
  empty stub), key hidden until graded, 403/404 ownership split per 04 §5.
- **Migration** `AttemptAnswer` (entity-complete incl. AI/teacher columns) via `migrate diff`
  (`migrate dev` refuses non-interactive) + `deploy`; DB current. `Attempt` model + partial
  unique index already exact.
- **B. Student BE** (`attempts/`: service/controller/module/DTO): start/autosave/submit/result
  per spec; MCQ exact-set-match grading; `ATTEMPT_*` code family added to the code enum from
  the agreed registry (was missing — first build failure); `prisma generate` EPERM worked
  around (sibling :3001 holds the engine DLL — types regenerated, build green, DLL untouched).
- **C. Teacher BE** (`grading.service` + controller): queue/detail/grade + `graded`
  notification in one tx; grade writes teacherScore/Feedback only (A2 preserved).
- **D. AI-suggest** (`ai-suggest.service`, REST, no SDK dep): writes only the 2 AI fields on
  writing answers of submitted attempts; no/placeholder key → 401; 429/502 mapped; 20s cap.
  04 spec unparked (§16-Q1 resolved, §9 AI rows agreed, frontmatter + teacher `_INDEX` synced).
- **E. FE**: `attempt-session.ts` (seq/ref-lock/no-replay/deadline/format/clock/answered/multi
  per ENTITY_QUESTION) + `attempts-service.ts` + `teacher-attempts-service.ts`; take/result/
  grading-drawer rewritten live (zero `MOCK(`, prod-gates and `lms-data`/`grading-data` gone,
  aiOriginal never merged into draft — explicit apply button); `Làm bài` start/resume entry
  added to the assignments list (409 → honest toast; per-row attempt status is follow-up).
  Contracts take/result + `_INDEX` rows + flow §2c/rows 10–13 (+ Attempt state machine).
  16 web unit tests.
- **F. e2e**: `student-attempt-lifecycle.e2e.test.ts` 16/16 (incl. real 65s timeout test;
  self-caught: 409-vs-400 TIME_EXCEEDED — registry says 400, fixed test+spec; `answer.` vs
  top-level teacherFeedback path; stray `void teacherId`). Playwright DoD 6/6 with screenshots
  read (take → submit → grade → 1.8/2 graded + key revealed).

**Two real bugs the screenshots caught (both fixed before commit)**:
1. Submit-before-debounce race: fast submit graded empty answers (isCorrect=false shown as
   "Sai" next to teacher-given points). Submit now flushes pending autosaves first and aborts
   on flush failure — the S-ASGN-3 guarantee made structural.
2. Result precedence: a teacher-scored essay read "Chờ chấm" beside its points. `teacherScore
   != null` now renders "Đã chấm" first.

**Verification**: api build · API 268/268 (46 suites) · web build 43/43 · tracked web unit
171/171 · check-docs 9/9 · Playwright 6/6 (desktop + 375px). Fast-lane screenshots read
(take/result desktop; grading drawer asserted via test, screenshot captured).

**Environment notes**: `node --import tsx` still broken on Node 25 (BUILD-004 — tsx CLI used);
`next start` servers linger after Playwright runs (killed one on :3100 before rebuilding —
stale-build trap, A05); Playwright `reuseExistingServer` once verified the WRONG (sibling
Real-invoices :3000) build — reran on :3002 with a bundle-content proof (`Làm bài` in chunk);
`$env:NEXT_PUBLIC_API_URL` did not reach `next build` under this harness — used a temporary
gitignored `apps/web/.env.local` (deleted after). Smoke API ran on :3101, sibling :3001
untouched. DoD spec needs `--workers=1` (serial, shared attempt).

**Blocker / needs follow-up**:
- `DOC-017` (new): ADR-005 is a 0-byte stub cited as scoring authority.
- Per-row attempt status on the assignments list (needs list-DTO `myAttempt` — BE decision).
- S-ASGN-8 `correctAnswer` review only at graded (implemented); re-grade stays 409 per INV-TGRD-03.
- Mistake notebook (S-MSTK) still spec-first follow-up, untouched.

**Next steps**: review/merge this branch (PR to open).

## 2026-09-13 merge review

Migration merged first via PR #76. Reconciled current Assignments/Billing flow and retained the live attempt take/result pages when older demo gates from PR #56 merged. Lint, web production build 44/44 and check-docs 9/9 pass; current-head CI required.
