# 🔌 API Teacher

> Endpoints reserved for the Teacher role.  
> Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)  
> Permissions: [PERMISSIONS_TEACHER.md](../actors/teacher/PERMISSIONS_TEACHER.md)

All routes require: `Authorization: Bearer <token>` + `role=teacher`

---

## Classes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teacher/classes` | Create class |
| GET | `/api/v1/teacher/classes` | List own classes |
| GET | `/api/v1/teacher/classes/:id` | Get class detail + student list |
| PATCH | `/api/v1/teacher/classes/:id` | Update class info |
| PATCH | `/api/v1/teacher/classes/:id/archive` | Archive class |
| POST | `/api/v1/teacher/classes/:id/enrollment-code/regenerate` | Regenerate code |

---

## Lessons

> Added 2026-09-01, closing `API-007` (this section did not exist; the Teacher FE contracts had
> nothing to build against). Paths, fields and rules are derived from
> [ENTITY_LESSON.md](../entities/postgres/ENTITY_LESSON.md),
> [ENTITY_LESSON_ASSIGNMENT.md](../entities/postgres/ENTITY_LESSON_ASSIGNMENT.md) and
> `FEATURES_TEACHER.md` T-LESSON-1…5 — nothing invented. **Not yet cross-checked by a BE owner**;
> the `LESSON_*` error codes are *proposed, not agreed* in `API_ERROR_CODES.md`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teacher/classes/:classId/lessons` | Create lesson (T-LESSON-1) |
| GET | `/api/v1/teacher/classes/:classId/lessons` | List lessons in class, ordered by `orderIndex` (T-LESSON-5) |
| GET | `/api/v1/teacher/lessons/:id` | Get lesson detail + linked assignments |
| PATCH | `/api/v1/teacher/lessons/:id` | Update lesson (T-LESSON-4) |
| DELETE | `/api/v1/teacher/lessons/:id` | Delete lesson (T-LESSON-4) |
| PATCH | `/api/v1/teacher/classes/:classId/lessons/reorder` | Bulk reorder, body `[{ id, orderIndex }]` (T-LESSON-2) |
| POST | `/api/v1/teacher/lessons/:id/assignments/:assignmentId` | Link an assignment to the lesson (T-LESSON-3) |
| DELETE | `/api/v1/teacher/lessons/:id/assignments/:assignmentId` | Unlink — does **not** delete the assignment |

**Writable fields** (`ENTITY_LESSON.md`): `title` (varchar 300, required), `description` (text,
nullable), `contentType` (`text` / `video` / `document` / `mixed`, required), `contentUrl`
(nullable — Supabase Storage URL, subject to the unresolved `CR-3` storage decision).
`classId`, `teacherId`, `orderIndex`, `createdAt`, `updatedAt` are server-assigned.

**Rules taken from the entity spec, not invented:**
- Ownership is inherited from the parent class — only the teacher who owns `classId` may touch
  its lessons. Enforce in the **service layer**, not the role guard alone.
- `(classId, orderIndex)` is unique and 1-based. Reorder is a **transactional** swap of the whole
  set, never a single-row update — a partial write violates the constraint.
- **A lesson cannot be deleted while a linked assignment has active Attempts.**
- Lesson ↔ Assignment is **M:N** (`LessonAssignment` join table, unique on
  `(lessonId, assignmentId)`). One assignment may appear in several lessons of the same class.
  `FEATURES_TEACHER.md` T-LESSON-3 still calls this "to be settled" — the entity spec settles it,
  and entity specs outrank feature docs (`working-rules.md` § Conflict Rules).

⛔ **Still open**: `RBAC_MATRIX.md` and `PERMISSIONS_TEACHER.md` have **no Lesson row**. The
ownership rule above comes from the entity spec, so the endpoints are usable, but the permission
matrix has not been extended — that edit touches RBAC and needs owner approval on its own.

---

## Question Bank

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teacher/questions` | Create question (with audio upload) |
| GET | `/api/v1/teacher/questions` | List questions (filter: skill, hskLevel, subType) |
| GET | `/api/v1/teacher/questions/:id` | Get question detail |
| PATCH | `/api/v1/teacher/questions/:id` | Update question |
| DELETE | `/api/v1/teacher/questions/:id` | Delete question |

---

## Assignments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teacher/assignments` | Create assignment |
| GET | `/api/v1/teacher/assignments` | List assignments |
| GET | `/api/v1/teacher/assignments/:id` | Get assignment + submission stats |
| PATCH | `/api/v1/teacher/assignments/:id` | Update assignment |
| DELETE | `/api/v1/teacher/assignments/:id` | Delete (if no submissions) |

---

## Grading

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/teacher/attempts?status=submitted` | List attempts to grade |
| GET | `/api/v1/teacher/attempts/:id` | Get attempt + answers |
| POST | `/api/v1/teacher/attempts/:id/ai-suggest` | Get AI score suggestion |
| PATCH | `/api/v1/teacher/attempts/:id/grade` | Submit grades + feedback |

---

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/teacher/sessions` | Create session |
| PATCH | `/api/v1/teacher/sessions/:id/start` | Mark start time |
| PATCH | `/api/v1/teacher/sessions/:id/end` | Mark end time |
| POST | `/api/v1/teacher/sessions/:id/attendance` | Record attendance |
| PATCH | `/api/v1/teacher/sessions/:id/submit` | Submit for approval |
| GET | `/api/v1/teacher/sessions` | List own sessions |

---

## Income

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/teacher/payroll` | List own payroll periods |
| GET | `/api/v1/teacher/payroll/:id` | Payroll period detail |
