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
    │   /teacher/classes/[classId]/lessons  Lesson List   ⛔ no endpoint
    │   ├── "Thêm bài học" → Modal → Submit → List        ⛔ no endpoint
    │   ├── "Sửa" → Modal → Submit → same                 ⛔ no endpoint
    │   ├── "Xoá" → Confirm → List (row removed)          ⛔ no endpoint
    │   ├── Drag reorder → List (optimistic)               ⛔ no endpoint
    │   └── Back                                            → Class Detail
    └── Back                                                → Class List
```

**No `Remove student` node.** No endpoint exists for it in `API_TEACHER.md`, and it is not in
`FEATURES_TEACHER.md`.
**No `Delete class` node.** Only archive exists (T-CLASS-5); there is no delete feature.
**The entire Lesson List branch is `⛔`.** `API_TEACHER.md` has no Lessons section at all —
not one of these five actions has a real endpoint anywhere in `docs/api/`. This branch is drawn
because the route and its actions follow directly from `FEATURES_TEACHER.md` T-LESSON-1/2/4/5,
but nothing here should be built against yet. See `KNOWN_ISSUES.md` `API-006`.
**No `Attach assignment` node.** T-LESSON-3 (attach an Assignment to a Lesson) has no endpoint
either and no contracted screen — it belongs with the Assignment screens, not yet mapped.

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
| 9 | `…/[classId]` | tab "Bài học" | `…/[classId]/lessons` | ⛔ no endpoint | — |
| 10 | `…/lessons` | create lesson | same | ⛔ no endpoint | — |
| 11 | `…/lessons` | edit lesson | same | ⛔ no endpoint | — |
| 12 | `…/lessons` | delete lesson | same | ⛔ no endpoint | — |
| 13 | `…/lessons` | drag reorder | same | ⛔ no endpoint | — |

---

## 3b. v2 trees — S3–S6 branches (2026-09-01)

```
/teacher/questions  Question Bank              GET /questions
│
├── "Tạo câu hỏi" → Modal → Submit → List (new row)   POST /questions
├── row menu → Sửa → Modal → same                      PATCH /questions/:id
├── row menu → Xoá → Confirm → List (usage = 0 only)   DELETE /questions/:id
└── row menu → Xem trước → Drawer (no route change)

/teacher/assignments  Assignments & Tests     GET /assignments
│
├── "Tạo bài tập" → 2-step Modal → List (new row)      POST /assignments
├── row menu → Sửa (no submissions) → Modal            PATCH /assignments/:id
├── row menu → Xoá (no submissions) → Confirm          DELETE /assignments/:id
└── Row click → Stats Drawer (no route change)

/teacher/grading  Grading Queue                GET /attempts?status=submitted
│
└── Row click → Grading Drawer (no route change)
    ├── per Writing question → "AI gợi ý"               POST /attempts/:id/ai-suggest
    └── "Hoàn thành chấm" → Queue (row graded)          PATCH /attempts/:id/grade

/teacher/sessions  Sessions & Attendance       GET /sessions
│
├── "Tạo buổi học" → Modal → List (scheduled)          POST /sessions
├── "Bắt đầu" (scheduled) → same (actualStart)         PATCH /sessions/:id/start
├── "Điểm danh" → Drawer (roster statuses)             POST /sessions/:id/attendance
├── "Gửi duyệt" (started) → Confirm → List             PATCH /sessions/:id/submit
│     (payload: topic + notes + actual times + attendance; → completed_pending)
└── rejected → "Xem lý do" → Modal (reason)

/teacher/income  Income (view-only)            GET /payroll
│
└── Row click → Period Drawer                         GET /payroll/:id
```

### v2 transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 14 | `/teacher/questions` | create | same | `POST /questions` | `TODO(error-code)` |
| 15 | `/teacher/questions` | edit | same | `PATCH /questions/:id` | `TODO(error-code)` |
| 16 | `/teacher/questions` | delete (unused only) | same | `DELETE /questions/:id` | `TODO(error-code)` |
| 17 | `/teacher/assignments` | create | same | `POST /assignments` | `TODO(error-code)` |
| 18 | `/teacher/assignments` | edit (0 submissions) | same | `PATCH /assignments/:id` | `TODO(error-code)` |
| 19 | `/teacher/assignments` | delete (0 submissions) | same | `DELETE /assignments/:id` | `TODO(error-code)` |
| 20 | `/teacher/grading` | AI suggest | drawer | `POST /attempts/:id/ai-suggest` | `TODO(error-code)` |
| 21 | `/teacher/grading` | finish grading | same (row graded) | `PATCH /attempts/:id/grade` | `TODO(error-code)` |
| 22 | `/teacher/sessions` | create | same | `POST /sessions` | `TODO(error-code)` |
| 23 | `/teacher/sessions` | start | same | `PATCH /sessions/:id/start` | `TODO(error-code)` |
| 24 | `/teacher/sessions` | attendance | drawer | `POST /sessions/:id/attendance` | `TODO(error-code)` |
| 25 | `/teacher/sessions` | submit | same | `PATCH /sessions/:id/submit` | `TODO(error-code)` |
| 26 | `/teacher/income` | open period | drawer | `GET /payroll/:id` | — |

Drawers/modals are nodes **without** a route change (flow-map vocabulary).

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
```

Lesson has no status enum in this slice — only `orderIndex`. Reordering is a position change,
not a state transition.

---

## 5. Endpoints/docs this flow needs that do not exist

| Gap | Blocks |
|---|---|
| A dashboard-aggregation endpoint for Teacher (`API_TEACHER.md` has no Dashboard section) | any KPI row on `/teacher` beyond the class-card preview |
| **An entire Lessons API** — `API_TEACHER.md` has no Lessons section at all | transitions 9–13 in full; the whole `.../lessons` branch in §2 |
| `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` row for Lesson | confirming the ownership rule used in `teacher-lessons-list.md`, currently inferred from Class |
| Class create/archive error codes beyond `CLASS_NOT_FOUND`/`CLASS_ACCESS_DENIED`/`CLASS_ALREADY_ARCHIVED` (transitions 3–4 are `TODO(error-code)`) | precise error handling on class creation |
| Error codes for Question/Assignment/Attempt/Session actions (v2 transitions 14–25 are all `TODO(error-code)`) | precise error handling on all S3–S6 screens |
| Analytics screens (T-ANL-1..4) — not contracted | the last unmapped FEATURES_TEACHER area |
| Reconcile `API_TEACHER.md` (role-prefixed, archive = `PATCH`) vs. `docs/flows/FLOW_ENROLLMENT.md` (bare `/classes`, archive = `POST`) — `KNOWN_ISSUES.md` `API-006` | which convention the backend actually implements — this flow follows `API_TEACHER.md` per flow-mapper's read order, not resolved here |
