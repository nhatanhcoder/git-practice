---
feature: T-CLASS-3, T-CLASS-4, T-CLASS-6
role: teacher
route: /teacher/classes/[classId]
status: contracted
last_updated: 2026-09-01
---

# Page Contract — Teacher · Class Detail

## Purpose
Manage one class: its enrollment code, its details, and who's in it.

## Access
- Allowed roles: teacher
- Ownership rule: teacher must own `classId` (service-layer check, not just role guard)
- On denial: redirect to `/teacher/classes` + toast `CLASS_ACCESS_DENIED`

## Entry points
- From: `/teacher/classes` row click; Dashboard class card click
- Deep link: yes (shareable URL)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| class header + student roster | `GET /api/v1/teacher/classes/:id` | `data.class`, `data.students[]` |
| update class | `PATCH /api/v1/teacher/classes/:id` | `data.class` |
| regenerate code | `POST /api/v1/teacher/classes/:id/enrollment-code/regenerate` | `data.class` |

Blocked on: "average score" per student (T-CLASS-4) has no dedicated field in this envelope —
render as "—" until confirmed which endpoint aggregates it. "Attendance rate" per T-CLASS-4 is
explicitly deferred to Sprint 5 (Sessions/Attendance does not exist yet) — render as "—" with
a tooltip, not a blank column.

## Regions
1. Page header — class name, HSK level badge, status badge, edit button
2. Enrollment code panel — code display, copy button, "Tạo mã mới" button
3. Tab/link row — "Học sinh" (this page) / "Bài học" → `/teacher/classes/[classId]/lessons`
4. Student roster table — name, email, join date, enrollment status, average score (—),
   attendance rate (—)

## States
- [ ] Loading — header skeleton + table skeleton independently
- [ ] Ready
- [ ] Empty — no students yet → roster region shows "Chưa có học sinh" + code panel stays visible
  (the code is the CTA — nothing else to click)
- [ ] Partial — header resolved, roster still loading
- [ ] Error — inline retry per region; a failed roster fetch must not hide the code panel
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Edit class | header "Sửa" | modal (name, HSK level) → submit → header updates | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| Regenerate code | "Tạo mã mới" | confirm modal (old code stops working) → new code shown | `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED` |
| Copy code | code chip | clipboard copy, no request | — |
| Go to lessons | tab "Bài học" | `/teacher/classes/[classId]/lessons` | — |

## Out of scope
- Removing a student from the class — no endpoint in `API_TEACHER.md`; not in FEATURES_TEACHER
- Archiving from this page — archive lives on the list page's row menu only, to keep one place
  for that action
