---
module: classes-enrollment
status: accepted
blocked_by: - (resolved via Option A full implementation with Teacher and Admin endpoints)
owner: -
last_updated: 2026-09-03
---

# Module Spec — Classes + Enrollment

## 0. Summary

Classes and enrollment. **This module does not serve any Admin screen** — Admin neither creates
classes nor enrolls students (see RBAC: `Class.create` = ❌ for Admin).

It exists here because **Sessions/Attendance and Payroll depend on it**. Without `Class` there is
no `ClassSession`; without `ClassEnrollment` there is no `SessionAttendance`. The whole payroll
branch stands on these two tables.

This is a **scope gap**, not a module deferred due to low priority.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Class` | Write (Teacher) · Read (Admin, indirect) | Admin only reads through session/payroll |
| `ClassEnrollment` | Write (Student join) · Read | Admin only reads |
| `User` | Read | teacherId, studentId |

## 2. Endpoints

**No endpoints are defined for Admin.** RBAC assigns create/edit rights to Teacher and
enrollment rights to Student.

> **Cross-checked 2026-09-01 (`API-006` closed).** This table previously used bare
> `/api/v1/classes` paths. The owner settled the convention as **role-prefixed**, matching
> `API_ADMIN.md`, `API_TEACHER.md` and `API_STUDENT.md` — all three already used it; this spec
> and `FLOW_ENROLLMENT.md` were the only two documents that did not. Paths below are now the ones
> in the role API docs, quoted verbatim.

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/api/v1/teacher/classes` | teacher | Create class, generate 8-char `enrollmentCode` | defined (`API_TEACHER.md`) |
| PATCH | `/api/v1/teacher/classes/:id` | teacher (own) | Edit class | defined (`API_TEACHER.md`) |
| PATCH | `/api/v1/teacher/classes/:id/archive` | teacher (own) | Archive class | defined (`API_TEACHER.md`) |
| GET | `/api/v1/teacher/classes` | teacher (own) | List own classes | defined (`API_TEACHER.md`) |
| GET | `/api/v1/teacher/classes/:id` | teacher (own) | Class detail — **student list is embedded here** | defined (`API_TEACHER.md`) |
| GET | `/api/v1/admin/classes` | admin | Read-only audit of all classes for sessions/payroll | accepted |
| GET | `/api/v1/admin/classes/:id` | admin | Read-only class detail with student roster | accepted |
| GET | `/api/v1/student/classes` | student (enrolled) | List enrolled classes | defined (`API_STUDENT.md`) |
| POST | `/api/v1/student/classes/join` | student | Enroll via `enrollmentCode` | defined (`API_STUDENT.md`) |
| DELETE | `/api/v1/student/classes/:id/leave` | student | Leave class → `status = dropped` | defined (`API_STUDENT.md`) |

Two consequences of the cross-check, recorded rather than smoothed over:

- **The old `GET /classes` row served two roles at once.** Under the role-prefixed convention it
  splits into two endpoints, and both already exist. No new surface.
- **There is no separate `GET /classes/:id/students`.** `API_TEACHER.md` embeds the roster in
  `GET /api/v1/teacher/classes/:id`. The old row implied a standalone endpoint that no role API
  doc defines — if the roster ever needs its own paginated endpoint, that is new surface and
  needs adding to `API_TEACHER.md` first.

**The minimal part Sessions needs** (if option B in section 16 is chosen):

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/admin/classes` | admin | Read classes, to display the class name in session/payroll screens |
| GET | `/api/v1/admin/classes/:id/enrollments` | admin | Read `active` students, to compute attendance |

These two endpoints **do not exist in `API_ADMIN.md`** yet.

## 3. DTO

Not specified here. The DTO belongs to the Teacher/Student module and will be written once the
scope is locked. Only the Admin-read part is recorded:

```
ClassSummary  = { id, name, hskLevel, teacherId, teacherName, status, studentCount }
EnrollmentRef = { studentId, nickname, status, joinedAt }
```

`studentCount` is derived (`COUNT(ClassEnrollment WHERE status='active')`), not a column.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-CLASS-01 | `enrollmentCode` is exactly 8 alphanumeric characters, **globally unique** |
| INV-CLASS-02 | Only classes with `status = active` can be enrolled into |
| INV-CLASS-03 | Only the teacher who owns the class can edit it: `class.teacherId === req.user.id` |
| INV-CLASS-04 | Archiving a class **does not** delete existing enrollments and assignments |
| INV-CLASS-05 | `UNIQUE(classId, studentId)` — a student enrolls at most once per class |
| INV-CLASS-06 | Leaving a class = `status = dropped`, **no record deletion** (history kept) |
| INV-CLASS-07 | A student can only view class content when their enrollment `status = active` |
| INV-CLASS-08 | Every `ClassSession` must point to an existing `Class` — no orphan sessions |

## 5. Ownership / RBAC

```
Teacher   class.teacherId === req.user.id           create/edit/archive
Student   enrollment.studentId === req.user.id      only classes they enrolled, status=active
Admin     ❌ create/edit  ·  👁️ read (display only in session/payroll)
```

Admin being able to read a class **does not** mean Admin can edit it. The guard must keep these
two rights separate.

## 6. State machine

```
Class:            active ──archive──► archived
                      ▲                    │
                      └──── (undecided: allow un-archive?) ────┘

ClassEnrollment:  (join) ──► active ──leave──► dropped
                                  ▲                │
                                  └── (undecided: can they re-join?) ──┘
```

Neither of the two question-marked transitions is specified in any document.

## 7. Transaction boundary

- **Enrollment**: check `enrollmentCode` + check class is `active` + create `ClassEnrollment` — one
  transaction. Otherwise two concurrent requests create two duplicate records before the unique
  constraint can block the second commit.
- **Create class**: generate `enrollmentCode` + INSERT — one transaction, retry on unique
  collision.

## 8. Idempotency & concurrency

| Scenario | Mechanism |
|---|---|
| Duplicate `enrollmentCode` generated | `UNIQUE(enrollmentCode)` + retry up to N times. Never trust randomness alone |
| Two concurrent join requests | `UNIQUE(classId, studentId)` is the last line of defense. Service-level check **is not enough** |
| Re-join after dropped | Must decide: UPDATE the old record back to `active`, or block? See section 16 |

## 9. Error → code mapping

| Error branch | HTTP | code | Status |
|---|---|---|---|
| Enrollment code does not exist | 404 | `CLASS_ENROLL_CODE_INVALID` | ✅ exists |
| Class already archived | 400 | `CLASS_ALREADY_ARCHIVED` | ✅ exists (registry says HTTP 400) |
| Already enrolled | 409 | `CLASS_ALREADY_ENROLLED` | ✅ exists |
| Not the class owner | 403 | `AUTH_INSUFFICIENT_ROLE` | ✅ exists |
| Validation failed | 400 | `VALIDATION_ERROR` | ✅ exists |

All three codes **already exist** in `API_ERROR_CODES.md` § Class Errors. The first spec draft
wrote wrong names (CLASS_CODE_INVALID, CLASS_ARCHIVED — two codes that do not exist) —
`pnpm check:docs` caught it, fixed 2026-08-19.
This is exactly the error kind the check exists to block: inventing new names while the correct
code was already there.

## 10. Side effects & notifications

No notification type in `ENTITY_NOTIFICATION.md` is tied to enrollment or class creation.
If the business needs one (e.g. telling a teacher a new student joined), a **new enum type must
be added** — that is a migration, not a detail.

## 11. Index & query

```
Class.enrollmentCode          UNIQUE       lookup at join time, hot path
Class.teacherId                            teacher's class list
ClassEnrollment(classId, studentId) UNIQUE constraint + lookup
ClassEnrollment.studentId                  student's class list
ClassEnrollment(classId, status)           count active headcount
```

**N+1 risk**: class list with `studentCount` — counting in a loop is wrong. Use a single
aggregate query with `GROUP BY classId`.

## 12. Migration & seed

No migration yet. When done, `Class` and `ClassEnrollment` must be migrated **before**
`ClassSession` and `SessionAttendance` — foreign-key relationships force this order.

Seed needed for payroll testing: at least 1 teacher · 1 class · 3 enrolled students · 5
`approved` sessions spanning a month boundary.

## 13. Security & rate limit

- `enrollmentCode` is a **weak secret**: anyone with the code can enter the class. Rate limiting
  on `POST /classes/join` is needed to stop code guessing (8 alphanumeric chars = guessable with
  unlimited attempts).
- Never return `enrollmentCode` to students in any response.

## 14. Observability

Log: class creation, successful/failed enrollments, wrong-code guessing attempts by IP.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-CLASS-01 | service | Generate 1000 codes: no duplicates, exactly 8 alphanumeric chars |
| INV-CLASS-01 | **real DB** | Force a code collision → unique constraint blocks, retry succeeds |
| INV-CLASS-02 | integration | Join an `archived` class → 409 |
| INV-CLASS-03 | integration | Teacher B edits teacher A's class → 403 |
| INV-CLASS-04 | service | Archive a class → enrollments still there, assignments still there |
| INV-CLASS-05 | **real DB** | Two concurrent join requests → exactly 1 record, the other gets 409 |
| INV-CLASS-06 | service | Leave → `status=dropped`, record still exists |
| INV-CLASS-07 | integration | `dropped` student reads class content → 403 |
| INV-CLASS-08 | **real DB** | Delete a Class that has sessions → FK blocks |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| **SCOPE-01: scope of this module** — full implementation (pull Teacher scope in early) or minimal enough for Sessions? | **All of Sessions + Payroll**. Without Class, `GET /admin/sessions/pending` is permanently empty | - | before Phase 3 |
| **API-004**: the three transitions `scheduled → in_progress → completed_pending` have no endpoint anywhere | The `session_submitted_for_review` notification has no producer | - | same as SCOPE-01 |
| Is un-archiving a class allowed? | state machine | - | when working on the module |
| Re-join after `dropped`: UPDATE back to `active` or block? | INV-CLASS-05, unique constraint | - | when working on the module |

| `hskLevel` of Class says 1–9, GLOSSARY says 1–6 (DOC-004) | validation | - | before migration |

### Two options for SCOPE-01

**A. Full implementation** — Class + Enrollment become a complete BE module, pulling the Teacher
side of the scope in earlier than planned.
*Gain*: Sessions/Payroll get a real foundation, no rework later. The future Teacher module has
less to do.
*Cost*: the Admin phase scope grows; Teacher/Student APIs must be designed now.

**B. Minimal** — only the Admin-readable part (the 2 endpoints in section 2) + seed class data
via script, no API path to create classes yet.
*Gain*: fast, enough for Sessions/Payroll to run and be tested.
*Cost*: the system is not truly usable yet (nobody can create a class via UI); must come back
and finish.

**Recommendation: B**, with the condition recorded in `PROGRESS.md` that Sessions/Payroll are
built on a temporary foundation, and full Class/Enrollment is mandatory before real users exist.
