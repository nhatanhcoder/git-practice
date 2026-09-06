## [2026-09-06] — Student Contracts Audit, SRS Route Alignment & Classes Page Contracts (TASK A00) — Antigravity — branch `codex/student-contracts-srs-classes`

**Context**:
Audit and consolidate the Student contracts for SRS and Classes following the merge of PR #39 (Hán Lộ UI restore). S-SRS had been erroneously bound to `/student/mistakes` while calling `/api/v1/student/flashcards/*`, conflating vocabulary flashcards with a mistake notebook. Additionally, Student Classes screens referenced `student-classes-list.md`, which did not exist on disk despite full backend implementation in PR #31 (`StudentClassesController`).

**Done**:
1. **Audited All Student Routes**:
   - Mapped all 21 student routes (landing, dashboard, flashcards, mistakes, classes, and 16 unbacked prototype/mock screens).
   - Documented explicit data source and backend status (IMPLEMENTED vs NOT IMPLEMENTED) for every route.
2. **Re-pointed SRS Flashcards Contract**:
   - Updated `docs/front-end-design-docs/pages/student-pages/student-srs.md` and `docs/front-end-design-docs/specs/student-pages/student-srs.spec.md` to declare `route: /student/flashcards` (was `/student/mistakes`).
   - Aligned contract actions with SM-2 lifecycle: single-card review ("Ôn thẻ này"), queue freeze, reveal, and 4-grade rating (Again=0, Hard=3, Good=4, Easy=5).
3. **Drafted Student Classes Page Contracts**:
   - Created `docs/front-end-design-docs/pages/student-pages/student-classes-list.md` for `/student/classes` (S-CLS-1 Join by code, S-CLS-2 List active classes).
   - Created `docs/front-end-design-docs/pages/student-pages/student-class-detail.md` for `/student/classes/[classId]` (S-CLS-3 Class details, S-CLS-4 Leave class, S-LESSON-1 Ordered lesson syllabus).
   - Reflected real API envelopes and error codes (`CLASS_ENROLL_CODE_INVALID`, `CLASS_ALREADY_ARCHIVED`, `CLASS_ALREADY_ENROLLED`, `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`, `CLASS_NOT_ENROLLED`, `VALIDATION_ERROR`).
4. **Separated Mistake Notebook (`S-MSTK`) from Flashcard SRS**:
   - Explicitly decoupled `/student/mistakes` (S-MSTK) from Vocabulary Flashcard SRS (`S-SRS-1..5`).
   - Recorded `/student/mistakes` as deferred to Sprint 4 (Assignments & Attempts error collection) without applying any silent or unapproved redirects.
5. **Updated Documentation Index & Flow**:
   - Updated `docs/front-end-design-docs/pages/student-pages/student-flow.md` to map both SRS Flashcard and Classes branches.
   - Updated `docs/front-end-design-docs/pages/_INDEX.md` with `/student/flashcards`, `/student/classes`, and `/student/classes/[classId]`.
   - Logged `DOC-016` in `ai/known-issues/KNOWN_ISSUES.md`.
   - Updated `ai/PROGRESS.md` Sprint 2 and Sprint 5.

**Verification**:
- `node scripts/check-docs.mjs`: **all 8 checks passed**.
- `git status`: working tree clean (only documented contract additions/modifications).

**Blocker / needs follow-up**:
- Frontend UI wiring reconciliation: `/student/flashcards/page.tsx` still runs Leitner mocks while `/student/mistakes/page.tsx` contains the live API client. Needs follow-up coding task to swap the live client onto `/student/flashcards` and provide clean placeholder on `/student/mistakes`.
- Unbacked prototype routes in `apps/web/src/app/student/(app)` need honest unavailable/empty states for production build.

**Next steps**:
- Commit and open PR for `codex/student-contracts-srs-classes`.
- Proceed to wire `/student/classes` and `/student/classes/[classId]` to `apps/api` per newly defined Page Contracts.
