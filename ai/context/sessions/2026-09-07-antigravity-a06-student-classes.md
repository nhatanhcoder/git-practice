## [2026-09-07] — A06: Student classes list from real GET /student/classes — Antigravity — branch `codex/a06-student-classes-list`

**Context**: TASK A06 from `docs/prompts/student-integration-checklist.md`, rebased on top of `origin/main` (commit `9fddcb1` with PR #46).

**The defect A06 fixes**:
The student classes screen `/student/classes` was previously hardcoded to static fixture `studentClasses` from `lib/student/lms-data.ts`, allowing local state mutations upon joining a class with fake success and leaking `enrollmentCode` on class cards. The real endpoint `GET /student/classes` existed in `StudentClassesController` but had never been wired to the web app.

**Done**:
- Created `apps/web/src/lib/student/classes-rules.ts`: holds pure helper logic (`resolveTeacherName`, `resolveClassesOutcome`, `CLASSES_ROUTE`).
- Created `apps/web/src/lib/student/classes-service.ts`: transports `GET /student/classes` via `apiRequest`.
- Updated `apps/web/src/app/student/(app)/classes/page.tsx`:
  - Fetches enrolled classes from real endpoint on mount.
  - Implements 7 states per contract: `loading` (SkeletonPanel), `error` (ErrorState with retry), `empty` (EmptyState when classes array is empty), `ready` (cards grid with real class IDs).
  - Renders only real server fields: `name`, `hskLevel`, `teacher` (nickname/email fallback), `studentCount`, `lessonCount`, `joinedAt`.
  - Removed fabricated homework/assignment numbers (`openCount`) and stripped `enrollmentCode` from student view.
  - Removed `DemoStateSwitcher`.
  - Modal "Tham gia lớp" marked as unavailable pending `POST /student/classes/join` (TASK A07), eliminating fake local mutations and false success toasts.
- Created `apps/web/scripts/student-classes.test.mjs` with 14 automated tests covering teacher name resolution, outcome resolution, real endpoint calls, fixture isolation, and join unavailability guard.

**Verification**:
- `node scripts/check-docs.mjs`: all 8 checks passed.
- `node --test apps/web/scripts/*.test.mjs`: 20 suites, 84/84 tests passed (0 failures).
- `pnpm --filter web build`: clean production build, exit code 0, 42/42 pages compiled (`○ /student/classes 6.64 kB`).
- `next start -p 3009`: verified HTTP 200 on `/student/classes`, confirmed auth protection and zero leaked fixture strings.

**Next task**:
TASK A07 — Implement `POST /student/classes/join` with real 8-character enrollment code verification and backend error handling.