# MODULE SPEC — Teacher 01: Classes + Lessons

---
module: teacher-classes-lessons
status: proposed
blocked_by: LESSON_* error codes are *proposed, not agreed* (API_ERROR_CODES.md)
owner: BE owner (unset)
last_updated: 2026-09-03
---

> Scope settled by the owner 2026-09-03 (SCOPE-01, teacher slice): **teacher-side full
> management** — create/edit/archive own classes, regenerate enrollment code, full lesson CRUD +
> reorder + assignment link/unlink, **read-only roster**. Student join/leave stays in deferred
> module `03-classes-enrollment.md`. Nothing here specs the student side.

## 0. Summary

Everything a teacher does to their own classes and the lessons inside them: class CRUD +
archiving + enrollment-code regeneration, lesson CRUD + transactional reorder, and the
Lesson↔Assignment link table. Roster (ClassEnrollment) is **read-only** here — enrollments are
created by the student lane, which is out of scope.

Sources, verbatim: `API_TEACHER.md` § Classes + § Lessons, `ENTITY_CLASS.md`,
`ENTITY_CLASS_ENROLLMENT.md`, `ENTITY_LESSON.md`, `ENTITY_LESSON_ASSIGNMENT.md`,
`docs/api/modules/03-classes-enrollment.md` (invariants INV-CLASS-*), `RBAC_MATRIX.md`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Class` | R+W | create / update / archive by owning teacher |
| `ClassEnrollment` | R only | roster in class detail; `studentCount` derived |
| `Lesson` | R+W | full CRUD + orderIndex |
| `LessonAssignment` | R+W | link / unlink |
| `Assignment` | R only | existence + same-class check at link time, titles in lesson detail |
| `User` | R only | `nickname` in roster (C1 — see §16) |
| `Attempt` | R only | delete-gate for lessons (active attempts on linked assignments) |

## 2. Endpoints

All paths prefixed `/api/v1`. Role: **teacher** (JWT), ownership checked in the service layer.

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/teacher/classes` | teacher | Create class (server generates 8-char `enrollmentCode`) | defined |
| GET | `/teacher/classes` | teacher (own) | List own classes, `?status=active\|archived` + pagination | defined |
| GET | `/teacher/classes/:id` | teacher (own) | Class detail **+ embedded student roster** | defined |
| PATCH | `/teacher/classes/:id` | teacher (own) | Update class info | defined |
| PATCH | `/teacher/classes/:id/archive` | teacher (own) | Archive class (one-way) | defined |
| POST | `/teacher/classes/:id/enrollment-code/regenerate` | teacher (own) | Regenerate the enrollment code | defined |
| POST | `/teacher/classes/:classId/lessons` | teacher (own class) | Create lesson (T-LESSON-1) | defined |
| GET | `/teacher/classes/:classId/lessons` | teacher (own class) | List lessons ordered by `orderIndex` (T-LESSON-5) | defined |
| GET | `/teacher/lessons/:id` | teacher (own) | Lesson detail + linked assignments | defined |
| PATCH | `/teacher/lessons/:id` | teacher (own) | Update lesson (T-LESSON-4) | defined |
| DELETE | `/teacher/lessons/:id` | teacher (own) | Delete lesson (T-LESSON-4) | defined |
| PATCH | `/teacher/classes/:classId/lessons/reorder` | teacher (own class) | Bulk reorder, body `[{ id, orderIndex }]` (T-LESSON-2) | defined |
| POST | `/teacher/lessons/:id/assignments/:assignmentId` | teacher (own) | Link an assignment to the lesson (T-LESSON-3) | defined |
| DELETE | `/teacher/lessons/:id/assignments/:assignmentId` | teacher (own) | Unlink — does **not** delete the assignment | defined |

There is no separate `GET /classes/:id/students` — the roster is embedded in the class detail
(same decision as module 03 §2).

## 3. DTO

### 3.1 POST `/teacher/classes` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | 1–200 chars |
| `hskLevel` | int | yes | 1–9 (entity; see C4/DOC-004 in §16) |
| `description` | string | no | nullable text |

Response `201`:

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "name": "HSK 3 Evening",
            "hskLevel": 3, "enrollmentCode": "AB12CD34", "status": "active",
            "description": null, "createdAt": "…", "updatedAt": "…" } }
```

`teacherId`, `enrollmentCode`, `status` are server-assigned. `status` starts `active`.

### 3.2 GET `/teacher/classes` — list

Query: `?status=active|archived` (optional — default: all own classes) · `?page=&limit=`.
Response row: `{ id, name, hskLevel, status, studentCount, createdAt, updatedAt }` +
`meta`. `studentCount` = `COUNT(ClassEnrollment WHERE classId AND status='active')` — derived,
never stored (module 03 §3).

### 3.3 GET `/teacher/classes/:id` — detail + roster

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "name": "…", "hskLevel": 3,
            "enrollmentCode": "AB12CD34", "status": "active", "description": null,
            "createdAt": "…", "updatedAt": "…",
            "students": [ { "studentId": "uuid", "nickname": "…", "status": "active",
                            "joinedAt": "…" } ] } }
```

Roster rows follow module 03's `EnrollmentRef` verbatim. Per `ENTITY_CLASS_ENROLLMENT.md`
("Teacher sees all students with `status = active`"), `students` returns **active enrollments
only**, ordered by `joinedAt`. The `status` field is kept in the DTO for forward-compat — see
§16-Q3 for the tension.

### 3.4 PATCH `/teacher/classes/:id` — request

`{ name?, hskLevel?, description? }` — same constraints as create. `teacherId`, `status`,
`enrollmentCode`, timestamps are **never writable** here.

### 3.5 PATCH `/teacher/classes/:id/archive`

Empty body. Response: `{ "data": { id, status: "archived", updatedAt } }`.

### 3.6 POST `/teacher/classes/:id/enrollment-code/regenerate`

Empty body. Response: `{ "data": { id, enrollmentCode: "XY56EF78", updatedAt } }`.

### 3.7 POST `/teacher/classes/:classId/lessons` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `title` | string | yes | 1–300 chars |
| `description` | string | no | nullable text |
| `contentType` | enum | yes | `text` / `video` / `document` / `mixed` |
| `contentUrl` | string | no | nullable; storage URL (CR-3 unresolved — see §16) |

`classId`, `teacherId`, `orderIndex` server-assigned. `orderIndex` = `MAX(orderIndex)+1` for
the class (first lesson: 1). Response `201` = lesson row.

### 3.8 GET `/teacher/classes/:classId/lessons`

Ordered by `orderIndex` asc. Row: `{ id, classId, title, description, contentType, contentUrl,
orderIndex, assignmentCount, createdAt, updatedAt }`. `assignmentCount` = derived
`COUNT(LessonAssignment WHERE lessonId)`.

### 3.9 GET `/teacher/lessons/:id`

Lesson fields + `assignments: [{ assignmentId, title, type, status, dueDate }]` (linked via
`LessonAssignment`, ordered by link `createdAt`).

### 3.10 PATCH `/teacher/lessons/:id`

`{ title?, description?, contentType?, contentUrl? }` — `orderIndex` is **not** writable here;
it moves only through the reorder endpoint.

### 3.11 PATCH `/teacher/classes/:classId/lessons/reorder`

Request: `[{ "id": "uuid", "orderIndex": 1 }, …]` — must be a **permutation of the class's
whole lesson set**: every lesson id exactly once, indexes exactly `1..N`. Anything else →
`VALIDATION_ERROR` 400.

### 3.12 Link / unlink

`POST /teacher/lessons/:id/assignments/:assignmentId` — empty body, `201` =
`{ lessonId, assignmentId, createdAt }`. `DELETE` → `204`.

## 4. Business rules (invariants)

**Inherited** — defined in `03-classes-enrollment.md` §4, enforced by these endpoints:
INV-CLASS-01 (code 8 chars, globally unique), INV-CLASS-02 (join active-only — student side,
not weakened here), INV-CLASS-03 (only owner edits), INV-CLASS-04 (archive keeps enrollments
and assignments), INV-CLASS-08 (no orphan sessions — FK).

**New — teacher slice:**

| ID | Invariant |
|---|---|
| INV-TCL-01 | Every class endpoint resolves the class with `class.teacherId === currentUser.id` in the service layer. A class that exists but is not the caller's → `403 CLASS_ACCESS_DENIED`; a class that does not exist → `404 CLASS_NOT_FOUND`. The list endpoint filters by `teacherId`, never by role guard alone. |
| INV-TCL-02 | `enrollmentCode` is generated server-side only: 8 alphanumeric chars, globally unique, at create **and** at regenerate, inside a transaction that retries on unique collision (module 03 §7). No request can supply or suggest a code. |
| INV-TCL-03 | Archive is one-way: `active → archived`. Archiving an archived class → `400 CLASS_ALREADY_ARCHIVED`. Archiving deletes nothing (INV-CLASS-04). Un-archive does not exist (module 03 §16 — still undecided). |
| INV-TCL-04 | `PATCH /teacher/classes/:id` accepts only `name`, `hskLevel`, `description`. `teacherId`, `status`, `enrollmentCode`, `createdAt`, `updatedAt` are server-controlled; a request containing them is rejected (`whitelist`) or ignored — never written. |
| INV-TCL-05 | `studentCount` and the roster derive from `ClassEnrollment` at read time; no endpoint writes `ClassEnrollment`. Roster rows are active enrollments only. |
| INV-TCL-06 | Lesson ownership is inherited from the parent class: every lesson endpoint resolves the lesson **joined with its class** and requires `lesson.class.teacherId === currentUser.id`. `403 LESSON_ACCESS_DENIED` when it is another teacher's. The role guard alone never authorizes a lesson write. |
| INV-TCL-07 | `orderIndex` is 1-based and unique per class (`UNIQUE(classId, orderIndex)`). Create appends `MAX+1`. `PATCH /teacher/lessons/:id` cannot change `orderIndex`. |
| INV-TCL-08 | Reorder validates the payload is a permutation of the whole set (all ids, indexes exactly `1..N`) and swaps the whole set in **one transaction**. A partial write must never commit — a unique violation mid-transaction aborts everything and surfaces `409 LESSON_ORDER_INDEX_CONFLICT`. |
| INV-TCL-09 | A lesson cannot be deleted while any **linked** assignment has an active Attempt (`Attempt.status ∈ {in_progress, submitted}` on an assignment joined via `LessonAssignment`) → `409 LESSON_HAS_ACTIVE_ATTEMPTS`. |
| INV-TCL-10 | Linking requires: the lesson's class owns the assignment (`assignment.classId === lesson.classId`, else `404 ASSIGNMENT_NOT_FOUND` — scoped read, see §16-Q6), and the pair is unique (`UNIQUE(lessonId, assignmentId)`, else `409 LESSON_ASSIGNMENT_ALREADY_LINKED`). Unlinking a pair that is not linked → `404 LESSON_ASSIGNMENT_NOT_LINKED`. Unlink never deletes the assignment (ENTITY_LESSON_ASSIGNMENT). |

## 5. Ownership / RBAC

```
Teacher   class.teacherId === req.user.id                 all 14 endpoints (service layer)
Student   ❌ every endpoint in this module
Admin     ❌ every endpoint in this module (Admin reads class data via sessions/payroll DTOs only)
```

Predicate for lessons: `lesson.class.teacherId === req.user.id` (one JOIN; never trust a
client-supplied `teacherId`).

## 6. State machine

```
Class:   active ──archive──► archived      (one-way; un-archive undecided, module 03 §16)
Lesson:  no status column — no state machine. Lifecycle = created → (reordered) → deleted.
```

## 7. Transaction boundary

- **Create class / regenerate code**: generate code + INSERT/UPDATE — one transaction, retry on
  unique collision (module 03 §7).
- **Reorder**: validate permutation (read set) + write the whole set — one transaction. The
  read-validate-write must be inside the same tx to stop a concurrent create from splitting the
  `1..N` sequence.
- **Link**: FK existence checks (lesson+class, assignment) + INSERT — one statement; the unique
  constraint is the concurrency guard.
- Class update / archive / lesson create / update / delete: single-row writes.

## 8. Idempotency & concurrency

- Code generation: retry loop on `P2002` (collision) — module 03 §7.
- Regenerate is **not** idempotent by design (every call yields a new code).
- Archive called twice → `400 CLASS_ALREADY_ARCHIVED` (not 200).
- Two concurrent reorders: one commits, the other hits the unique constraint → `409
  LESSON_ORDER_INDEX_CONFLICT`. No partial order ever exists.
- Concurrent lesson create + reorder: the tx in §7 serializes them.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Class id not found | 404 | `CLASS_NOT_FOUND` | agreed |
| Class exists, not the caller's | 403 | `CLASS_ACCESS_DENIED` | agreed |
| Archive an archived class | 400 | `CLASS_ALREADY_ARCHIVED` | agreed |
| Lesson id not found | 404 | `LESSON_NOT_FOUND` | **proposed, not agreed** |
| Lesson exists, not the caller's | 403 | `LESSON_ACCESS_DENIED` | **proposed, not agreed** |
| Delete blocked by active attempts | 409 | `LESSON_HAS_ACTIVE_ATTEMPTS` | **proposed, not agreed** |
| Reorder unique conflict / partial write | 409 | `LESSON_ORDER_INDEX_CONFLICT` | **proposed, not agreed** |
| Link pair already exists | 409 | `LESSON_ASSIGNMENT_ALREADY_LINKED` | **proposed, not agreed** |
| Unlink a pair that is not linked | 404 | `LESSON_ASSIGNMENT_NOT_LINKED` | **proposed, not agreed** |
| Link an assignment outside the lesson's class | 404 | `ASSIGNMENT_NOT_FOUND` (scoped) | agreed — **scoping choice needs sign-off, §16-Q6** |
| Field validation (name length, hskLevel, contentType, permutation shape) | 400 | `VALIDATION_ERROR` | agreed (fallback family) |

No code is invented. No branch uses an undefined code.

## 10. Side effects & notifications

None. `ENTITY_NOTIFICATION.md` has no type for class or lesson events (module 03 §10: adding
one requires an enum migration — not this module's call).

## 11. Index & query

- `Class(teacherId, status)` — list filter.
- `ClassEnrollment(classId, status)` — roster + `studentCount`.
- `Lesson(classId, orderIndex)` UNIQUE — list ordering + reorder conflict detection.
- `LessonAssignment(lessonId)`, `LessonAssignment(assignmentId)` — link lookups + delete-gate.
- Roster and lesson list are single queries with proper indexes — no N+1. `studentCount` in the
  list endpoint is one `groupBy(classId)` over enrollments, not per-row subqueries.

## 12. Migration & seed

Adds tables (none exist yet — `schema.prisma` today holds only `User` + `RefreshToken`):
`Class`, `ClassEnrollment`, `Lesson`, `LessonAssignment`, matching `ENTITY_*.md` verbatim
(field names, enums, nullability, unique constraints; `text[]` for nothing here — all scalar).
Seed: 1 teacher + 2 classes (one active, one archived) + 3 active enrollments + 3 lessons with
`orderIndex` 1..3 + 1 linked assignment.

## 13. Security & rate limit

- `enrollmentCode` is returned **only to the owning teacher** (module 03 §13: never to
  students). All endpoints here are teacher-only, so the code may appear in class responses.
- Regenerate is audit-logged (old + new code, actor, timestamp) — it invalidates a shared
  secret in the wild.
- The code is a weak secret; brute-force protection belongs to the (deferred) student join
  endpoint, not here.
- Roster exposes `nickname` — no email, no phone (C1 in §16).

## 14. Observability

- Log: class create/archive, code regenerate (with actor), reorder conflicts (count), lesson
  delete refusals (which assignment blocked).
- Metric: `class_archive_total`, `lesson_reorder_conflict_total`.

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TCL-01 | integration | teacher B calls every class endpoint on teacher A's class → 403 `CLASS_ACCESS_DENIED`; unknown id → 404; student token → 401/403 |
| INV-TCL-02 | integration (real DB) | create N classes; codes are 8 alphanumeric + unique; regenerate changes the code, old code never reappears while referenced; collision retry exercised by seeding a duplicate |
| INV-TCL-03 | integration | archive active → 200 archived; archive again → 400 `CLASS_ALREADY_ARCHIVED`; enrollments/assignments still exist after archive |
| INV-TCL-04 | integration | PATCH with `teacherId`/`status`/`enrollmentCode` in body → fields not written (whitelist) |
| INV-TCL-05 | integration | roster contains only `status='active'`; `studentCount` matches `COUNT` after a drop (seeded) |
| INV-TCL-06 | integration | teacher B hits every lesson endpoint on A's lesson → 403 `LESSON_ACCESS_DENIED` |
| INV-TCL-07 | unit + integration | create appends `MAX+1`; PATCH cannot move `orderIndex`; duplicate `orderIndex` in same class rejected |
| INV-TCL-08 | integration (real DB) | valid permutation reorders atomically; missing id / duplicate id / non-1..N indexes → 400; concurrent reorder → one 409, order still consistent |
| INV-TCL-09 | integration | seed an attempt (`submitted`) on a linked assignment → DELETE lesson → 409; unlink first → DELETE succeeds |
| INV-TCL-10 | integration | link twice → 409; link assignment from another class → 404 `ASSIGNMENT_NOT_FOUND`; unlink non-linked → 404; unlink leaves the assignment row intact |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. May a class be un-archived? (inherited from module 03 §16) | state machine completeness | PO | before student lane |
| Q2. May lessons/sessions/assignments be created in an `archived` class? No document says. | create-gate in this module and modules 05-TSES / 03-TASG | PO | before coding §4 |
| Q3. Roster shows active only (ENTITY rule) but `EnrollmentRef` carries a `status` field — should dropped students appear for history? | §3.3 DTO | PO | before locking DTO |
| Q4. **C1**: roster uses `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH) | roster display name | BE lead | before locking DTO |
| Q5. **C4/DOC-004**: `hskLevel` 1–9 (entity, settled 2026-08-11) vs GLOSSARY still saying 1–6 | create/update validation | PO | docs sweep |
| Q6. Cross-class link maps to `404 ASSIGNMENT_NOT_FOUND` (scoped-read reading). Confirm or add a dedicated code. | §9 mapping | BE owner | before coding |
| Q7. `LESSON_*` family is *proposed, not agreed* — sign-off needed before the codes are usable in code | all lesson error branches | BE owner | before coding |
| Q8. "Active attempts" = `in_progress \| submitted` here; do **graded** attempts also block lesson delete? (entity wording says "active") | INV-TCL-09 exact predicate | BE lead | before coding |
