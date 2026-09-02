---
feature: T-SES-1, T-SES-2, T-SES-3, T-SES-4, T-SES-5, T-SES-6, T-SES-7
role: teacher
route: /teacher/sessions
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Sessions & Attendance

## Purpose
Log each teaching session — times, attendance — and submit it for admin approval (feeds payroll).

## Access
- Allowed roles: teacher
- Ownership rule: sessions of own classes only (service-layer check)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Buổi học & Điểm danh"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| session list | `GET /api/v1/teacher/sessions` | `data[]` |
| create | `POST /api/v1/teacher/sessions` | `data.session` |
| start | `PATCH /api/v1/teacher/sessions/:id/start` | `data.session` |
| end | `PATCH /api/v1/teacher/sessions/:id/end` | `data.session` |
| attendance | `POST /api/v1/teacher/sessions/:id/attendance` | `data.session` |
| submit | `PATCH /api/v1/teacher/sessions/:id/submit` | `data.session` |

Blocked on: error codes — none registered for ClassSession actions; rows `TODO(error-code)`.
State machine per FLOW_SESSION_ATTENDANCE.md §2: `scheduled → completed_pending → approved | rejected`
(start/end record actual times, submitted in the `submit` payload together with attendance).

## Regions
1. Page title + primary action "Tạo buổi học"
2. Filter toolbar — class, status
3. Data table — date, time (scheduled + actual when logged), class, topic, status pill,
   attendance summary, row actions (per status)

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — "Chưa có buổi học nào" + CTA "Tạo buổi học đầu tiên"
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create | "Tạo buổi học" | modal (class, date, start/end time, topic) → row, status `scheduled` | `TODO(error-code)` |
| Start | row "Bắt đầu" (scheduled) | records actualStartTime | `TODO(error-code)` |
| Attendance | row "Điểm danh" | drawer: roster, per-student present / absent_excused / absent_unexcused + note | `TODO(error-code)` |
| Submit | row "Gửi duyệt" (started) | confirm modal → payload = topic, notes, actual times, attendance → `completed_pending` | `TODO(error-code)` |
| View rejection | rejected pill / row "Xem lý do" | modal with `rejectionReason` (T-SES-6) | — |

## Out of scope
- Admin approve/reject — Admin side (A-PAY-2,3)
- Editing a rejected session and resubmitting — flow exists but no dedicated endpoint row; deferred
- Payroll calculation — read-only on `/teacher/income`

## Implementation note — 2026-09-02 (`WEB-006` A1)

Submit requires a **teacher-entered** `actualEnd`. The build previously defaulted it to the
scheduled `endTime`, which `INV-PAYROLL-06` forbids as a basis for `per_hour` pay and which
also stopped `INV-PAYROLL-17` from ever firing. The modal now has a required time input,
prefilled only from a real recorded value, and blocks submit unless
`actualEnd > actualStart` (`INV-SESSION-13`).

⚠️ Requiring `actualEnd` at all picks option **(a)** of the open question **Q-SES-3**
(`docs/api/modules/04-sessions-attendance.md` §16), which the backend has not settled.
`INV-SESSION-13` by itself only constrains the pair when both values are non-NULL. If the
BE later chooses option (b), relax this gate.
