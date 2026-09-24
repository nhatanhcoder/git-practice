---
page: Teacher · Teaching schedule
route: /teacher/sessions
contract: ../../pages/teacher-pages/teacher-sessions.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-24
---

# Page Spec — Teacher · Teaching schedule v1

> Paste with `_DESIGN-SYSTEM.md`. If you were not given that file, stop and ask for it;
> do not invent tokens. This spec uses the existing Teacher shell and built sessions page
> composition as its mockup, replacing the in-memory rows with an honest live agenda.

## 1. Purpose

Teachers see when they teach their own classes in a selected date window, then add one
planned session. The schedule is a planning view, not a payroll ledger.

## 2. Access

Teacher role only. The server scopes sessions by authenticated teacher and permits create
only in a class the teacher owns. The class picker shows active own classes. A 401/403 does
not become an empty list or demo content.

## 3. API mapping

| Region/action | Method + path | Envelope | Registered errors |
|---|---|---|---|
| Agenda | `GET /api/v1/teacher/sessions?from=&to=&page=&limit=&classId=&status=` | `data[]`, `meta` | `VALIDATION_ERROR` for invalid query |
| Class picker | `GET /api/v1/teacher/classes` | `data[]` | auth/role guard |
| Create | `POST /api/v1/teacher/sessions` | `data` (raw session; refetch agenda) | `CLASS_ACCESS_DENIED`, `VALIDATION_ERROR` |
| Start/end/attendance/submit | ⛔ not part of this page's live v1 | — | contract conflict; no simulated mutation |

POST accepts only `classId`, `scheduledDate`, `scheduledStart`, `scheduledEnd`, `topic`,
optional `notes`. `scheduledDate` is a date string; start/end are `HH:mm`. The list request
uses the server's inclusive `from`/`to` window and paginates through `meta.totalPages` if
needed. A create response lacks `className`, so list refetch is mandatory before display.

## 4. Page structure

1. Header with `Buổi học của tôi` and `Tạo buổi học`.
2. Date-window controls (`Trước`, `Hôm nay`, `Sau`) with a visible range label; class and
   status selects below. Navigation updates the query, not local mock data.
3. Compact agenda grouped by day; each row shows planned time, class, topic and a status
   pill. When actual times exist, display them as secondary read-only information.
4. Create modal. No lifecycle/attendance editor or payroll action on this page in v1.

## 5. Component specs

- Date-window buttons are native buttons in logical tab order, with visible focus. The
  period label is text, not colour-only. On narrow screens the agenda stays a vertical
  card list, never a clipped table.
- A row's status maps from the shared design system (`scheduled`/`in_progress` info,
  `completed_pending` warning, `approved` success, `rejected` danger). Do not derive it
  from date or attendance.
- Create modal fields retain values after a failed request; field errors appear near the
  fields. Submit disabled while a POST is in flight. No optimistic insertion.

## 6. Data samples

```json
{
  "data": [
    { "id": "session-1", "classId": "class-1", "className": "HSK 3 buổi tối",
      "scheduledDate": "2026-09-24", "scheduledStart": "19:00", "scheduledEnd": "20:30",
      "actualStart": null, "actualEnd": null, "topic": "Bài 5: Mua sắm", "notes": null,
      "status": "scheduled", "rejectionReason": null, "payrollPeriodId": null,
      "attendanceSummary": { "present": 0, "absentExcused": 0,
        "absentUnexcused": 0, "total": 0 },
      "createdAt": "2026-09-20T09:00:00.000Z", "updatedAt": "2026-09-20T09:00:00.000Z" },
    { "id": "session-2", "classId": "class-1", "className": "HSK 3 buổi tối",
      "scheduledDate": "2026-09-25", "scheduledStart": "19:00", "scheduledEnd": "20:30",
      "actualStart": "2026-09-25T12:05:00.000Z", "actualEnd": null,
      "topic": "Bài 6: Hỏi đường", "notes": "Ôn phần phát âm",
      "status": "in_progress", "rejectionReason": null, "payrollPeriodId": null,
      "attendanceSummary": { "present": 8, "absentExcused": 1,
        "absentUnexcused": 0, "total": 9 },
      "createdAt": "2026-09-20T09:00:00.000Z", "updatedAt": "2026-09-25T12:05:00.000Z" }
  ],
  "meta": { "total": 2, "page": 1, "limit": 100, "totalPages": 1 }
}
```

The same badge mapping must handle `completed_pending`, `approved` and `rejected` rows;
`rejectionReason` may be null. Samples are visual fixtures, not seed or API contracts.

## 7. Seven states

| State | Rendering |
|---|---|
| Loading | Four agenda-row skeletons, controls visible |
| Ready | Grouped, sorted real sessions and accurate count |
| Empty | No sessions at all vs. none for selected period/filter; distinct text |
| Partial | Agenda remains visible if class picker fails; create disabled, retry classes |
| Error | Inline retry for list or create, no mock fallback |
| Forbidden | Teacher shell/auth boundary; no fake empty result |
| Offline/stale | No offline cache; network failure is an error, never fabricated data |

## 8. Copy

`Buổi học của tôi` · `Tạo buổi học` · `Hôm nay` · `Chưa có buổi học nào trong khoảng này`
· `Không tải được lịch dạy` · `Thử lại` · `Chủ đề bài dạy` · `Giờ kết thúc phải sau giờ bắt đầu`
· `Đã tạo buổi học`.

## 9. Interactions

- Period/filter changes invalidate the old request and reload server data. Do not flash a
  previous class's schedule as the new filter's result.
- Create uses a single POST. On success close modal, refetch visible sessions and then
  confirm; on error keep form data and explain the failure. Keyboard users can operate
  period navigation, filters and modal in visual order.
- Status and actual times are read-only; no drag-to-reschedule, recurrence or fake submit.

## 10. Do NOT

- Do not derive `actualStart` or `actualEnd` from planned times; those affect payroll.
- Do not show demo sessions, class roster or success notifications when API calls fail.
- Do not imply that an `in_progress` row is `scheduled`, or that a planned session has
  been approved for payment.
