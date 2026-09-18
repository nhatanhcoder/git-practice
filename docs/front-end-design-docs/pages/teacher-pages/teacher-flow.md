---
role: teacher
status: contracted
last_updated: 2026-09-01
related:
  - ./_INDEX.md
  - docs/api/API_TEACHER.md
---

# Teacher — UI Flow + API Map

> Screen-to-screen traversal. **v1 (S2 slice): Classes + Lessons.** **v2 (2026-09-01):
> Question Bank, Assignments, Grading, Sessions, Income contracted.** Analytics is the
> only FEATURES_TEACHER area still unmapped.
> Every node is a route, every edge is a user action, every edge carries the endpoint it fires.
> `⛔` marks an endpoint that does not exist yet in `docs/api/API_TEACHER.md`.
> Endpoints are shown without the `/api/v1/teacher` prefix for brevity — see each Page Contract
> for the full path.

---

## 0. Entry

```
Login
  │  POST /api/v1/auth/login
  ▼
role=teacher ──► /teacher
```

---

## 1. Dashboard — the hub

```
/teacher  Dashboard                          GET /teacher/classes
│
├── Class card click        ────────────────► /teacher/classes/[classId]
├── "Xem tất cả"             ────────────────► /teacher/classes
└── "Tạo lớp mới" → Modal → Submit → Dashboard  POST /teacher/classes
```

Dashboard never mutates on its own — the create-class modal is the one exception, and it is
the same modal as the one on `/teacher/classes` (§2).

---

## 2. Classes

```
/teacher/classes  Class List               GET /teacher/classes
│
├── "Tạo lớp mới" → Modal → Submit → List (new row, code shown)  POST /teacher/classes
├── Copy code                                 (clipboard, no request)
├── Archive → Confirm → List (badge updates)  PATCH /teacher/classes/:id/archive
│
└── Row click
    ▼
    /teacher/classes/[classId]  Class Detail  GET /teacher/classes/:id
    │
    ├── "Sửa" → Modal → Submit → same         PATCH /teacher/classes/:id
    ├── "Tạo mã mới" → Confirm → same          POST /teacher/classes/:id/enrollment-code/regenerate
    ├── Copy code                              (clipboard, no request)
    ├── Tab "Bài học"
    │   ▼
    │   /teacher/classes/[classId]/lessons  Lesson List   GET /teacher/classes/:classId/lessons
    │   ├── "Thêm bài học" → Modal → Submit → List        POST /teacher/classes/:classId/lessons
    │   ├── "Sửa" → Modal → Submit → same                 PATCH /teacher/lessons/:id
    │   ├── "Xoá" → Confirm → List (row removed)          DELETE /teacher/lessons/:id
    │   ├── Drag reorder → List (optimistic)               PATCH /teacher/classes/:classId/lessons/reorder
    │   └── Back                                            → Class Detail
    └── Back                                                → Class List
```

**No `Remove student` node.** No endpoint exists for it in `API_TEACHER.md`, and it is not in
`FEATURES_TEACHER.md`.
**No `Delete class` node.** Only archive exists (T-CLASS-5); there is no delete feature.
**The Lesson List branch is no longer `⛔`** (2026-09-01). `API_TEACHER.md` gained a Lessons
section closing `API-007`; the five paths above are that section, quoted. They are **not yet
cross-checked by a BE owner** and their `LESSON_*` codes are *proposed, not agreed* — buildable,
not signable-off.
**No `Attach assignment` node.** T-LESSON-3's endpoints now exist
(`POST`/`DELETE /teacher/lessons/:id/assignments/:assignmentId`) but no screen is contracted for
them — they belong with the Assignment screens.

---

## 3. Full transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 1 | Login | submit | `/teacher` | `POST /auth/login` | `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_SUSPENDED` |
| 2 | `/teacher` | class card click | `/teacher/classes/[classId]` | `GET /teacher/classes/:id` | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| 3 | `/teacher` | create class | same | `POST /teacher/classes` | `TODO(error-code)` |
| 4 | `/teacher/classes` | create class | same | `POST /teacher/classes` | `TODO(error-code)` |
| 5 | `/teacher/classes` | archive | same | `PATCH /teacher/classes/:id/archive` | `CLASS_NOT_FOUND`, `CLASS_ALREADY_ARCHIVED`, `CLASS_ACCESS_DENIED` |
| 6 | `/teacher/classes` | row click | `/teacher/classes/[classId]` | `GET /teacher/classes/:id` | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| 7 | `…/[classId]` | edit | same | `PATCH /teacher/classes/:id` | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| 8 | `…/[classId]` | regenerate code | same | `POST /teacher/classes/:id/enrollment-code/regenerate` | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| 9 | `…/[classId]` | tab "Bài học" | `…/[classId]/lessons` | `GET /teacher/classes/:classId/lessons` | `LESSON_ACCESS_DENIED` |
| 10 | `…/lessons` | create lesson | same | `POST /teacher/classes/:classId/lessons` | `LESSON_ORDER_INDEX_CONFLICT` |
| 11 | `…/lessons` | edit lesson | same | `PATCH /teacher/lessons/:id` | `LESSON_NOT_FOUND`, `LESSON_ACCESS_DENIED` |
| 12 | `…/lessons` | delete lesson | same | `DELETE /teacher/lessons/:id` | `LESSON_HAS_ACTIVE_ATTEMPTS` |
| 13 | `…/lessons` | drag reorder | same | `PATCH /teacher/classes/:classId/lessons/reorder` | `LESSON_ORDER_INDEX_CONFLICT` |

---

## 3b. v2 trees — S3–S6 branches (2026-09-01)

```
/teacher/questions  Question Bank              GET /teacher/questions
│
├── "Tạo câu hỏi" → Modal → Submit → List (new row)   POST /teacher/questions
├── row menu → Sửa → Modal → same                      PATCH /teacher/questions/:id
├── row menu → Xoá → Confirm → List (usage = 0 only)   DELETE /teacher/questions/:id
└── row menu → Xem trước → Drawer (no route change)

/teacher/assignments  Assignments & Tests     GET /teacher/assignments
│
├── "Tạo bài tập" → 2-step Modal → List (new row)      POST /teacher/assignments
├── row menu → Sửa (no submissions) → Modal            PATCH /teacher/assignments/:id
├── row menu → Xoá (no submissions) → Confirm          DELETE /teacher/assignments/:id
└── Row click → Stats Drawer (no route change)

/teacher/grading  Grading Queue                GET /teacher/attempts?status=submitted
│
└── Row click → Grading Drawer (no route change)
    ├── per Writing question → "AI gợi ý"               POST /teacher/attempts/:id/ai-suggest
    └── "Hoàn thành chấm" → Queue (row graded)          PATCH /teacher/attempts/:id/grade

/teacher/sessions  Sessions & Attendance       GET /teacher/sessions
│
├── "Tạo buổi học" → Modal → List (scheduled)          POST /teacher/sessions
├── "Bắt đầu" (scheduled) → same (actualStart)         PATCH /teacher/sessions/:id/start
├── "Điểm danh" → Drawer (roster statuses)             POST /teacher/sessions/:id/attendance
├── "Gửi duyệt" (started) → Confirm → List             PATCH /teacher/sessions/:id/submit
│     (payload: topic + notes + actual times + attendance; → completed_pending)
└── rejected → "Xem lý do" → Modal (reason)

/teacher/income  Income (view-only)            GET /teacher/payroll
│
└── Row click → Period Drawer                         GET /teacher/payroll/:id
```

### v2 transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 14 | `/teacher/questions` | create | same | `POST /teacher/questions` | `TODO(error-code)` |
| 15 | `/teacher/questions` | edit | same | `PATCH /teacher/questions/:id` | `TODO(error-code)` |
| 16 | `/teacher/questions` | delete (unused only) | same | `DELETE /teacher/questions/:id` | `TODO(error-code)` |
| 17 | `/teacher/assignments` | create | same | `POST /teacher/assignments` | `TODO(error-code)` |
| 18 | `/teacher/assignments` | edit (0 submissions) | same | `PATCH /teacher/assignments/:id` | `TODO(error-code)` |
| 19 | `/teacher/assignments` | delete (0 submissions) | same | `DELETE /teacher/assignments/:id` | `TODO(error-code)` |
| 20 | `/teacher/grading` | AI suggest | drawer | `POST /teacher/attempts/:id/ai-suggest` | `TODO(error-code)` |
| 21 | `/teacher/grading` | finish grading | same (row graded) | `PATCH /teacher/attempts/:id/grade` | `TODO(error-code)` |
| 22 | `/teacher/sessions` | create | same | `POST /teacher/sessions` | `TODO(error-code)` |
| 23 | `/teacher/sessions` | start | same | `PATCH /teacher/sessions/:id/start` | `TODO(error-code)` |
| 24 | `/teacher/sessions` | attendance | drawer | `POST /teacher/sessions/:id/attendance` | `TODO(error-code)` |
| 25 | `/teacher/sessions` | submit | same | `PATCH /teacher/sessions/:id/submit` | `TODO(error-code)` |
| 26 | `/teacher/income` | open period | drawer | `GET /teacher/payroll/:id` | — |

Drawers/modals are nodes **without** a route change (flow-map vocabulary).

---

## 3c. v3 tree — Learning Catalog (2026-09-19)

Written from the three v3 contracts, which were produced by the same flow-mapper pass. Endpoints
are defined in `API_TEACHER.md` § Learning Catalog — **none is implemented yet** (Slice 1); none is
marked `⛔` because `⛔` means "absent from `docs/api/`", which is not the case.

```
/teacher/learning-paths  Learning Paths (own)       GET /teacher/learning-paths
│
├── "Tạo lộ trình" → Modal → Detail (new path)        POST /teacher/learning-paths
├── row menu → Xoá (no published unit, no learners) → Confirm → List
│                                                     DELETE /teacher/learning-paths/:pathId
└── Row click
    ▼
    /teacher/learning-paths/[pathId]  Path Detail     GET /teacher/learning-paths/:pathId
    │   (rejected → admin reason shown above the fold, no route change)
    │   (pending_review / suspended → frozen banner, all writes disabled)
    │
    ├── "Sửa" → Modal → same                          PATCH /teacher/learning-paths/:pathId
    ├── "Tự soạn" → creates a lesson
    │     ▼
    │     /teacher/learning-paths/[pathId]/units/[unitId]  Lesson Editor
    │     │                                            GET /teacher/learning-paths/:pathId
    │     ├── "Lưu" → same                            PATCH /teacher/learning-units/:unitId
    │     ├── "Publish" → Confirm → same              POST /teacher/learning-units/:unitId/publish
    │     ├── "Bỏ publish" → Confirm → same           POST /teacher/learning-units/:unitId/unpublish
    │     ├── "Xoá bài học" → Confirm → Detail        DELETE /teacher/learning-units/:unitId
    │     └── Back → Detail
    ├── "Chọn từ catalog" → Picker Modal (no route change)
    │     └── confirm → creates a reference lesson    GET /teacher/learning-units
    │                                                 POST /teacher/learning-paths/:pathId/units
    ├── drag / move row → reorder (no route change)   PATCH /teacher/learning-paths/:pathId/units/reorder
    ├── row toggle → publish / unpublish (same endpoints as the editor)
    └── "Gửi duyệt" → Confirm → same (status flips)   POST /teacher/learning-paths/:pathId/submit
```

### v3 transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 27 | `/teacher/learning-paths` | create | detail (new) | `POST /teacher/learning-paths` | `VALIDATION_ERROR` |
| 28 | `/teacher/learning-paths` | delete (draft, unpublished only) | same | `DELETE /teacher/learning-paths/:pathId` | `LEARNING_PATH_HAS_PUBLISHED_UNITS` |
| 29 | `/teacher/learning-paths` | open | detail | `GET /teacher/learning-paths/:pathId` | `LEARNING_PATH_NOT_FOUND` |
| 30 | path detail | edit title/description | same | `PATCH /teacher/learning-paths/:pathId` | `LEARNING_PATH_FROZEN` |
| 31 | path detail | add authored lesson | unit editor | `POST /teacher/learning-paths/:pathId/units` | `LEARNING_PATH_FROZEN`, `VALIDATION_ERROR` |
| 32 | path detail | add reference lesson | same | `GET /teacher/learning-units`, `POST /teacher/learning-paths/:pathId/units` | `LEARNING_UNIT_REFERENCE_INVALID` |
| 33 | path detail | reorder lessons | same | `PATCH /teacher/learning-paths/:pathId/units/reorder` | `LEARNING_UNIT_ORDER_INVALID` |
| 34 | path detail | publish / unpublish lesson | same | `POST /teacher/learning-units/:unitId/publish`, `POST /teacher/learning-units/:unitId/unpublish` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN` |
| 35 | path detail | submit for review | same (Chờ duyệt) | `POST /teacher/learning-paths/:pathId/submit` | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |
| 36 | unit editor | save words | same | `PATCH /teacher/learning-units/:unitId` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN` |
| 37 | unit editor | delete lesson | path detail | `DELETE /teacher/learning-units/:unitId` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE` |

**What this role does not get, on purpose:** no approve/reject control anywhere in the Teacher
area (admin only), no editing a published lesson's words (that is what unpublish-then-new-lesson
exists for), no free-order mode for a path, and no student preview.

---

## 4. Entity state transitions driven by this flow

```
Class    active ──archive──► archived
                              (one-way — no unarchive endpoint in API_TEACHER.md)

Session  scheduled ──submit (topic+times+attendance)──► completed_pending
              │                                            │
              │                            ┌───────────────┤ (admin side, not this flow)
              │                            ▼               ▼
              │                        approved         rejected ──(edit+resubmit: deferred)──►
              └─ start/end record actual times;           (feeds PayrollPeriod when finalized)
                 they do not change the status enum

Attempt  in_progress ──submit (student)──► submitted ──grade──► graded

LearningPath  draft ──submit──► pending_review ──approve (admin)──► approved ──suspend──► suspended
                 ▲                    │                                  ▲                 │
                 └─── rejected ◄──────┘ (admin reject)                   └───── restore ────┘

learning_unit  draft ──publish──► published ──unpublish──► unpublished ──publish──► published
                    (publish requires the parent path to be `approved`)

A published unit's words never change. Learner progress is keyed by the unit's slug and stores the
answers given, so an edit behind it is unverifiable — correction is a new unit plus an unpublish of
the old one. `slug` and `curriculumKey` are immutable for the same reason.
```

Lesson has no status enum in this slice — only `orderIndex`. Reordering is a position change,
not a state transition.

---

## 5. Endpoints/docs this flow needs that do not exist

| Gap | Blocks |
|---|---|
| A dashboard-aggregation endpoint for Teacher (`API_TEACHER.md` has no Dashboard section) | any KPI row on `/teacher` beyond the class-card preview |
| ~~An entire Lessons API~~ — ✅ **closed 2026-09-01**, `API_TEACHER.md` § Lessons (`API-007`). Its `LESSON_*` codes are still *proposed, not agreed* | was: transitions 9–13 and the whole `.../lessons` branch |
| `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` row for Lesson | the permission matrix has no Lesson row. Ownership itself is now sourced (`ENTITY_LESSON.md` § Business Rules), but the matrix edit touches RBAC and needs its own approval |
| Class create/archive error codes beyond `CLASS_NOT_FOUND`/`CLASS_ACCESS_DENIED`/`CLASS_ALREADY_ARCHIVED` (transitions 3–4 are `TODO(error-code)`) | precise error handling on class creation |
| Error codes for Question/Assignment/Attempt/Session actions (v2 transitions 14–25 are all `TODO(error-code)`) | precise error handling on all S3–S6 screens |
| Analytics screens (T-ANL-1..4) — not contracted | the last unmapped FEATURES_TEACHER area |
| ~~Reconcile `API_TEACHER.md` vs `FLOW_ENROLLMENT.md` route convention~~ — ✅ **settled 2026-09-01 by the owner: role-prefixed** (`API-006`). This flow was already correct. `docs/api/modules/03-classes-enrollment.md` was updated to match; `FLOW_ENROLLMENT.md` carries a supersede note, its 35 path references not yet rewritten | was: which convention the backend implements |
