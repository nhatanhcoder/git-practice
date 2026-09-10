## [2026-09-07] — A08: Student class detail & lessons from real GET /student/classes/:id — Antigravity — branch `feat/a08-student-class-detail`

**Context**: TASK A08 from `docs/prompts/student-integration-checklist.md`, built on top of `codex/a06-student-classes-list` @ `2f12310`.

**The defect A08 fixes**:
The student class detail screen `/student/classes/[classId]` and lesson detail screen `/student/classes/[classId]/lessons/[lessonId]` previously relied on hardcoded fixtures `classById`, `lessonsForClass`, `lessonById`, and `assignmentById` from `lib/student/lms-data.ts`. This caused valid real UUIDs to fail lookup with "Không tìm thấy lớp", leaked teacher `enrollmentCode` on student screens, fabricated attached homework counts, and mutated fake local state upon leaving a class with `DemoStateSwitcher`.

**Done**:
- Extended `apps/web/src/lib/student/classes-rules.ts`:
  - Added types `EnrolledLesson`, `EnrolledClassDetail`, `ClassDetailOutcome`, `LessonDetailOutcome`.
  - Added pure helpers: `isValidUuid` (UUID v4 validation), `resolveClassDetailOutcome` (handling 7 UI states: loading, invalid_id, not_found, forbidden, error, empty, ready), `resolveLessonDetailOutcome`, and `formatClassJoinedDate`.
- Extended `apps/web/src/lib/student/classes-service.ts`:
  - Added `fetchEnrolledClassDetail(classId)` calling `GET /student/classes/:id`.
- Rewrote `apps/web/src/app/student/(app)/classes/[classId]/page.tsx`:
  - Replaced fixtures with `fetchEnrolledClassDetail(classId)`.
  - Implemented 7 UI states per contract: `loading` (SkeletonPanel), `invalid_id` (400 validation error), `not_found` (404 not found), `forbidden` (403 access denied when un-enrolled), `error` (ErrorState with retry CTA), `empty` (zero published lessons), and `ready` (class facts + ordered lessons list).
  - RBAC & Security: stripped `enrollmentCode` from student view, omitted peer roster, and removed fabricated assignment counts.
  - Removed `DemoStateSwitcher`.
  - Gated leave class modal with clear notice pending A09 without faking success.
- Rewrote `apps/web/src/app/student/(app)/classes/[classId]/lessons/[lessonId]/page.tsx`:
  - Replaced fixtures with `fetchEnrolledClassDetail(classId)` and matched lesson metadata from real class payload.
  - Handled invalid UUID, not found, forbidden, error, and ready states.
  - Explicitly rendered "Chưa khả dụng" notice for lesson body content and assignments lacking approved endpoints in `API_STUDENT.md` rather than fabricating mock data or actions.
  - Backlink cleanly navigates to `/student/classes/${detail.id}`.
  - Removed `DemoStateSwitcher`.
- Created `apps/web/scripts/student-class-detail.test.mjs` with 28 automated tests covering UUID validation, class detail outcomes, lesson detail outcomes, date formatting, removal of `lms-data` fixtures and `DemoStateSwitcher`, and security invariants.
- Updated `docs/front-end-design-docs/pages/student-pages/student-class-detail.md` last_updated date.
- **QC Review Follow-up**:
  - Fixed minor defect 1: Replaced fake-empty copy on lesson assignments panel with explicit notice: "Bài tập gắn với bài học sẽ khả dụng khi API bài tập (S-LESSON-3) hoàn tất", adhering strictly to criterion 5.
  - Fixed minor defect 2: Replaced nonexistent CSS token `var(--color-text-muted)` with `var(--text-3)` and removed nonexistent `.caption` class across both detail pages.
  - Addressed observation 1: Linked empty lesson list rendering explicitly to `outcome === "empty"`.
  - Added test assertions guarding against `var(--color-text-muted)` and fake-empty assignment copy.

**Verification**:
- `node scripts/check-docs.mjs`: all 8 checks passed.
- `node --test apps/web/scripts/student-class-detail.test.mjs`: 28/28 tests passed.
- `node --test apps/web/scripts/*.test.mjs`: 25 suites, 112/112 tests passed (0 failures).
- `pnpm --filter web build`: clean production build, exit code 0, 42/42 pages compiled (`ƒ /student/classes/[classId] 7.46 kB`, `ƒ /student/classes/[classId]/lessons/[lessonId] 4.41 kB`).

**Next task**:
TASK A09 — Implement real class leave action `DELETE /student/classes/:id/leave`.

**A08 completion addendum (follow-up on approval)**:
- Added `leaveEnrolledClass(classId)` in `classes-service.ts`, calling the documented
  `DELETE /student/classes/:id/leave` endpoint and returning the server's dropped-enrollment
  result.
- Replaced the A09 placeholder in the class-detail modal with a real confirmation action. A ref
  lock prevents duplicate requests; the modal buttons are disabled while pending; API failures
  remain inline and do not navigate or claim success; redirect to `/student/classes` happens only
  after the server confirms success.
- Added 3 regression assertions to `student-class-detail.test.mjs`. Red phase observed: 28 pass,
  3 fail for the missing leave service/wiring. Green phase: 31/31 pass.
- Serial verification: `node --test apps/web/scripts/*.test.mjs` passed, `pnpm --filter web build`
  passed with 42 routes, and `node scripts/check-docs.mjs` passed 8/8. Docker Desktop's Linux engine
  was unavailable, so live Postgres/API/browser leave verification is **NOT RUN**, not counted as pass.
