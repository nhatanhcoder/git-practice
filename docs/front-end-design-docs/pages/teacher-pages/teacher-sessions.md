---
feature: T-SES-1, T-SES-7
role: teacher
route: /teacher/sessions
status: built
last_updated: 2026-09-24
---

# Page Contract — Teacher · Teaching schedule v1

## Purpose

See the schedule for the teacher's own classes and create one planned teaching session. This
v1 does not run a session, mark attendance, submit for review or alter payroll.

## Access

- Allowed role: teacher. The server scopes the list to `teacherId = currentUser.id` and
  accepts a create only for an owned class.
- On unauthenticated/forbidden: the existing Teacher shell handles the route guard; never
  replace an access failure with mock sessions.

## Entry points

- Teacher sidebar, “Buổi học & Điểm danh”; deep link `/teacher/sessions`.
- Class selection uses live `GET /api/v1/teacher/classes`, not local demo data.

## Data

| Need | Endpoint | Envelope field |
|---|---|---|
| Own sessions in visible date window | `GET /api/v1/teacher/sessions?from=&to=&page=&limit=&classId=&status=` | `data[]`, `meta` |
| Own classes for picker | `GET /api/v1/teacher/classes` | `data[]` |
| Create one session | `POST /api/v1/teacher/sessions` | `data` (raw session row; refetch list for `className`) |

The GET list has `scheduledDate` (`YYYY-MM-DD`), `scheduledStart`/`scheduledEnd` (`HH:mm`),
`className`, `topic`, `status`, optional actual timestamps, and derived `attendanceSummary`.
The POST body is exactly `{ classId, scheduledDate, scheduledStart, scheduledEnd, topic,
notes? }` per `docs/api/modules/teacher/05-sessions.md` §3.1. `topic` is required. Display
the `meta.total`/`totalPages` truthfully; never treat the first page as the whole window.

## Regions

1. Title and primary “Tạo buổi học” action.
2. Date-window navigation and class/status filters.
3. Teaching agenda grouped by scheduled day, with class, time, topic and status for each row.
4. Create modal with owned active class, date, start/end, topic and optional notes.

## Seven states

- Loading: skeleton agenda rows; controls remain readable.
- Ready: sessions sorted by date and time within the selected window.
- Empty: “Chưa có buổi học nào”; filtered empty says no sessions match the selected period/filter.
- Partial: N/A for the schedule query; if class options fail while sessions succeed, the
  schedule stays visible but create is disabled with a retry message.
- Error: inline failure and retry; never show mock rows or a success toast.
- Forbidden: route guard/access message, not an empty schedule.
- Offline/stale: no offline cache; show the request failure and retain no fabricated data.

## Actions

| Action | Trigger | Result | Registered error |
|---|---|---|---|
| Navigate date window | previous/next/today | Reload own sessions for the visible inclusive dates | `VALIDATION_ERROR` on invalid range |
| Filter | class/status controls | Reload from page 1 with composed server filters | `VALIDATION_ERROR` |
| Create | “Tạo buổi học” | Validate class, calendar date, nonempty topic and `end > start`; POST once, refetch GET after success | `CLASS_ACCESS_DENIED`, `VALIDATION_ERROR` |

No mutation may show success before the POST confirms. The API's `scheduledDate` anchors
payroll period under ADR-012, but this screen does not compute or edit pay. If POST
has no definitive response (network failure, timeout or 5xx), the result is unknown:
close the form, reload the target week's agenda, show an explicit warning and disable
further create requests in this page instance. A confirmed 4xx rejection keeps the
draft editable; a confirmed POST followed by a failed GET reports creation, not failure.
This client guard does not replace server idempotency (`API-023`).

## Out of scope / conflicts

- `start`, `end`, attendance and submit APIs exist but are **not wired in this v1**. The
  previous in-memory buttons must not stay interactive as if they persisted. A later contract
  must reconcile `docs/api/modules/teacher/05-sessions.md` §3 with the running service before
  these actions can be enabled.
- The older version of this Page Contract used `data.session`, client-supplied actual times,
  notes on attendance rows and a direct `scheduled → completed_pending` transition. These
  conflict with the entity/session module spec and current API. The v1 UI makes no choice for
  the disputed lifecycle actions; the discrepancy is recorded in KNOWN_ISSUES.
- The session module spec §16-Q2 has not settled whether archived classes may receive new
  sessions. The picker offers active classes only; the server-side rule remains `⛔` until
  the owner decides. Do not infer a payroll rule from this UI filter.
- No recurring, drag-to-reschedule, cancel or Student-facing calendar is contracted here.
