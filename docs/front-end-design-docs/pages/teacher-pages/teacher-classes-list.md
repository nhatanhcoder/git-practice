---
feature: T-CLASS-1, T-CLASS-2, T-CLASS-5
role: teacher
route: /teacher/classes
status: contracted
last_updated: 2026-09-01
---

# Page Contract — Teacher · Classes

## Purpose
See every class taught and create a new one.

## Access
- Allowed roles: teacher
- Ownership rule: server scopes the list to `teacherId = req.user.id`; no client filter needed
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Lớp học"; Dashboard "Xem tất cả"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| class list | `GET /api/v1/teacher/classes` | `data[]` |
| create class | `POST /api/v1/teacher/classes` | `data.class` (includes `enrollmentCode`) |
| archive class | `PATCH /api/v1/teacher/classes/:id/archive` | `data.class` |

Blocked on: none for this screen. NOTE — `docs/flows/FLOW_ENROLLMENT.md` §2.3/§7 documents
these same actions on bare `/classes` paths (no `/teacher` prefix) and archive as `POST`, not
`PATCH`. Contract follows `API_TEACHER.md` per flow-mapper's read order; the mismatch is
tracked as a known issue (route unification), not resolved here.

## Regions
1. Page title + primary action "Tạo lớp mới"
2. Data table — name, HSK level, enrollment code (copy button), student count, status badge

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — no classes yet → "Chưa có lớp nào" + CTA "Tạo lớp đầu tiên"
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry, toolbar stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create class | "Tạo lớp mới" | modal (name, HSK level) → submit → new row + toast showing the code | `TODO(error-code)` |
| Copy code | row's code chip | clipboard copy, no request | — |
| Archive | row menu → "Lưu trữ" | confirm modal → row badge updates | `CLASS_NOT_FOUND`, `CLASS_ALREADY_ARCHIVED`, `CLASS_ACCESS_DENIED` |
| Open detail | row click | `/teacher/classes/[classId]` | — |

## Out of scope
- Editing name/HSK level from this screen — that lives on the detail page (T-CLASS-6)
- Regenerating an existing class's enrollment code — that is a detail-page action (see
  `teacher-class-detail.md`), since it only makes sense in the context of one already-open class
- Deleting a class — not in FEATURES_TEACHER.md; only archive exists
