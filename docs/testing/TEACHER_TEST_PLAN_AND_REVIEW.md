# Teacher Module Review & Comprehensive Test Plan

> **Date**: 2026-09-03
> **Scope**: Teacher Backend APIs (`apps/api`) & Teacher Frontend Interfaces (`apps/web`)
> **Status**: Completed & Verified (All Tests Passing)

---

## 1. System Review — Current State of Teacher Module

### 1.1 Backend Architecture (`apps/api`)
- **Classes Module** (`src/classes/`):
  - `POST /api/v1/teacher/classes`: Creates class, enforces HSK level 1–9, auto-generates collision-resistant 8-character uppercase alphanumeric code (`F2.1`).
  - `GET /api/v1/teacher/classes`: Lists own classes with `studentCount` and `lessonCount`.
  - `GET /api/v1/teacher/classes/:id`: Detail view + active student roster with `joinedAt` and profile details.
  - `PATCH /api/v1/teacher/classes/:id`: Updates name, level, description with ownership check (`INV-CLASS-03`).
  - `PATCH /api/v1/teacher/classes/:id/archive`: Sets `status = archived`. Enforces `INV-CLASS-04`: blocks edits and new enrollments with 400 `CLASS_ALREADY_ARCHIVED`.
  - `POST /api/v1/teacher/classes/:id/enrollment-code/regenerate`: Regenerates 8-character enrollment code, revoking the old code.
  - `GET /api/v1/admin/classes`: Admin audit view of all classes.
- **Lessons Module** (`src/lessons/`):
  - `POST /api/v1/teacher/classes/:classId/lessons`: Auto-assigns incremental `orderIndex = max + 1`.
  - `GET /api/v1/teacher/classes/:classId/lessons`: Returns lessons sorted by `orderIndex ASC`.
  - `GET /api/v1/teacher/lessons/:id`: Single lesson detail.
  - `PATCH /api/v1/teacher/lessons/:id`: Updates title, description, contentType.
  - `DELETE /api/v1/teacher/lessons/:id`: Deletes lesson and re-packs remaining order indices.
  - `PATCH /api/v1/teacher/classes/:classId/lessons/reorder`: Two-phase transaction eliminating unique constraint collisions during swaps.
- **Access Control & RBAC**:
  - `JwtAuthGuard` + `RolesGuard` `@Roles('teacher')` restricts endpoints to active teachers.
  - Ownership assertion prevents teachers from modifying classes/lessons belonging to others (`403 CLASS_ACCESS_DENIED`, `403 LESSON_ACCESS_DENIED`).

### 1.2 Frontend Architecture (`apps/web`)
- **Pages**:
  - `/teacher` (Dashboard overview: quick actions, current classes, active stats).
  - `/teacher/classes` (List of classes, search filter, status filter, modal create, modal archive).
  - `/teacher/classes/[classId]` (Class overview, enrollment code copy chip, code regeneration modal, student roster table).
  - `/teacher/classes/[classId]/lessons` (List of lessons, modal create/edit, modal delete, drag-and-drop & up/down reordering).
- **Service Integration** (`src/lib/teacher-service.ts`):
  - Real API calls via `api-client.ts` with offline/SSG resilient fallbacks.
  - Strict typing matching Prisma entities and Page Contracts.

---

## 2. Test Plan Matrix

| ID | Test Tier | Target / Invariant | Method / Path | Expected Result | Verification |
|---|---|---|---|---|---|
| **TP-01** | Unit | 8-char code generator | `generateEnrollmentCode(level)` | Length 8, prefix `HSK<level>`, alphanumeric | `teacher-service.test.mjs` ✅ |
| **TP-02** | Unit | HSK level bounds | Input validation | Only 1..9 accepted | `teacher-service.test.mjs` ✅ |
| **TP-03** | Unit | Vietnamese status labels | `classStatusLabels`, `enrollmentStatusLabels`, `contentTypeLabels` | Accurate localized labels | `teacher-service.test.mjs` ✅ |
| **TP-04** | Unit | Lesson title validation | `isValidLessonTitle(title)` | Minimum 3 non-whitespace chars | `teacher-service.test.mjs` ✅ |
| **TP-05** | API E2E | F2.1 Create Class | `POST /teacher/classes` | 201 Created, auto code, `status: active` | `teacher-classes.e2e.test.ts` ✅ |
| **TP-06** | API E2E | Role Guard | Student calls `POST /teacher/classes` | 403 `AUTH_INSUFFICIENT_ROLE` | `teacher-classes.e2e.test.ts` ✅ |
| **TP-07** | API E2E | F2.1 List Classes | `GET /teacher/classes` | 200 OK, array of own classes | `teacher-classes.e2e.test.ts` ✅ |
| **TP-08** | API E2E | Class Detail & Roster | `GET /teacher/classes/:id` | 200 OK, class info + `students[]` | `teacher-classes.e2e.test.ts` ✅ |
| **TP-09** | API E2E | F2.2 Edit Class | `PATCH /teacher/classes/:id` | 200 OK, updated fields | `teacher-classes.e2e.test.ts` ✅ |
| **TP-10** | API E2E | Regenerate Code | `POST /teacher/classes/:id/enrollment-code/regenerate` | 200 OK, new 8-char code !== old | `teacher-classes.e2e.test.ts` ✅ |
| **TP-11** | API E2E | INV-CLASS-03 Ownership | Teacher 2 edits Teacher 1's class | 403 `CLASS_ACCESS_DENIED` | `teacher-classes.e2e.test.ts` ✅ |
| **TP-12** | API E2E | INV-CLASS-04 Archive | `PATCH /teacher/classes/:id/archive` | 200 OK, status archived, subsequent edits return 400 | `teacher-classes.e2e.test.ts` ✅ |
| **TP-13** | API E2E | Admin class listing | `GET /admin/classes` | 200 OK with admin token | `teacher-classes.e2e.test.ts` ✅ |
| **TP-14** | API E2E | Lesson auto-orderIndex | `POST /teacher/classes/:classId/lessons` | `orderIndex = 1, 2, ...` sequentially | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-15** | API E2E | List lessons sorted | `GET /teacher/classes/:classId/lessons` | 200 OK, sorted `orderIndex ASC` | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-16** | API E2E | Update lesson | `PATCH /teacher/lessons/:id` | 200 OK, updated content | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-17** | API E2E | Lesson ownership | Non-owner modifies lesson | 403 `LESSON_ACCESS_DENIED` | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-18** | API E2E | Transactional Reorder | `PATCH /teacher/classes/:classId/lessons/reorder` | 200 OK, no unique collision | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-19** | API E2E | Delete & Pack order | `DELETE /teacher/lessons/:id` | 200 OK, remaining indices re-packed | `teacher-lessons.e2e.test.ts` ✅ |
| **TP-20** | FE Build | Static Generation | `pnpm --filter web build` | 31/31 static pages build cleanly | Build Runner ✅ |

---

## 3. Test Execution Results

```text
Backend E2E:
✔ Admin User Approval Lifecycle (8 tests)
✔ access control (8 tests)
✔ GET /admin/users (11 tests)
✔ GET /admin/users/:id (3 tests)
✔ error envelope (1 test)
✔ POST /auth/register (4 tests)
✔ POST /auth/login (4 tests)
✔ POST /auth/refresh & Replay Attack (3 tests)
✔ GET /auth/me & PATCH /auth/me (3 tests)
✔ POST /auth/change-password & POST /auth/logout (2 tests)
✔ Teacher Classes API (9 tests)
✔ Teacher Lessons API (7 tests)
Total: 64/64 tests pass (100%)

Frontend Scripts:
✔ Password Strength Evaluator (4 tests)
✔ Profile Helpers & Formatting (3 tests)
✔ Status Color Mapping (3 tests)
✔ Admin users v2 structure (3 tests)
✔ Teacher Rules A1, A2, B1, C1 (15 tests)
✔ Teacher Data & Service Utilities (5 tests)
✔ User Detail & Status (6 tests)
Total: 39/39 tests pass (100%)

Build & Docs:
✔ pnpm --filter web build: 31/31 static routes generated cleanly.
✔ check-docs.mjs: All 8 checks passed.
```
