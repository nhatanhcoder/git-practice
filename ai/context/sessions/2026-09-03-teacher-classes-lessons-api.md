## [2026-09-03] — Teacher Classes, Lessons & Admin Approval Backend APIs — Antigravity — branch `feat/s1-teacher-classes-api`

**Context**:
User requested to create the spec and code the backend APIs for Admin & Teacher until the Teacher API is working.
Addressed SCOPE-01 Option A (Full implementation) and unblocked Module 02 & Module 03.

**Done**:
1. **Database Schema & Migration**:
   - Added PostgreSQL models: `Class`, `ClassEnrollment`, `Lesson` and enums `ClassStatus`, `EnrollmentStatus`, `LessonContentType` in `apps/api/prisma/schema.prisma`.
   - Applied migration `20260903154459_add_classes_and_lessons` and regenerated Prisma Client.
2. **Admin User Approval (F1.3)**:
   - Added `approve`, `suspend`, `activate` methods in `UsersService` and registered `PATCH /admin/users/:id/approve`, `suspend`, `activate` in `AdminUsersController`.
   - Resolves `USER_ALREADY_APPROVED` (409) and allows Admins to activate pending Teacher/Student accounts.
3. **Teacher Classes API**:
   - `POST /api/v1/teacher/classes`: Generates 8-character unique alphanumeric enrollment code with collision retry.
   - `GET /api/v1/teacher/classes`: Lists own classes with `studentCount` and `lessonCount`.
   - `GET /api/v1/teacher/classes/:id`: Class detail + active student roster.
   - `PATCH /api/v1/teacher/classes/:id`: Updates name, hskLevel, description with teacher ownership check.
   - `PATCH /api/v1/teacher/classes/:id/archive`: Archives class and blocks further edits (`CLASS_ALREADY_ARCHIVED`).
   - `POST /api/v1/teacher/classes/:id/enrollment-code/regenerate`: Regenerates 8-char code.
4. **Admin Classes API**:
   - `GET /api/v1/admin/classes`: Lists all classes across the platform for sessions and payroll review.
   - `GET /api/v1/admin/classes/:id`: Class detail with student roster.
5. **Teacher Lessons API**:
   - `POST /api/v1/teacher/classes/:classId/lessons`: Creates lesson, auto-assigns `orderIndex = max + 1`.
   - `GET /api/v1/teacher/classes/:classId/lessons`: Lists lessons ordered by `orderIndex ASC`.
   - `GET /api/v1/teacher/lessons/:id`: Lesson detail.
   - `PATCH /api/v1/teacher/lessons/:id`: Updates lesson.
   - `DELETE /api/v1/teacher/lessons/:id`: Deletes lesson and re-packs remaining order indices.
   - `PATCH /api/v1/teacher/classes/:classId/lessons/reorder`: Transactional two-phase reorder without unique constraint collisions.
6. **Specs & Docs**:
   - Updated `docs/api/modules/03-classes-enrollment.md` to `status: accepted`.
   - Updated `docs/api/modules/_INDEX.md` Module 2 and Module 3 to `accepted`.
7. **Teacher Frontend Integration & Test Plan**:
   - Created `apps/web/src/lib/teacher-service.ts` connecting `/teacher/classes`, `/teacher/classes/[classId]`, `/teacher/classes/[classId]/lessons` to real APIs with graceful offline fallbacks.
   - Documented comprehensive test plan matrix in `docs/testing/TEACHER_TEST_PLAN_AND_REVIEW.md` (20 test items across unit, E2E, and build tiers).
   - Created `apps/web/scripts/teacher-service.test.mjs` verifying code generation, status labels, and validation rules.
8. **Verification**:
   - `apps/api/test/teacher-classes.e2e.test.ts`: 9 tests passed.
   - `apps/api/test/teacher-lessons.e2e.test.ts`: 7 tests passed.
   - `apps/api/test/admin-user-lifecycle.e2e.test.ts`: 8 tests passed.
   - `pnpm --filter api test`: **64/64 tests passed** (12 suites).
   - `node --test apps/web/scripts/*.test.mjs`: **39/39 tests passed** (7 suites).
   - `pnpm --filter web build`: **31/31 static pages built cleanly**.
   - `node scripts/check-docs.mjs`: **8/8 checks passed**.
