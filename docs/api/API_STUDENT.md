# 🔌 API Student

> Endpoints reserved for the Student role.  
> Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)  
> Permissions: [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)

All routes require: `Authorization: Bearer <token>` + `role=student`

> **Scope decision — ADR-016:** Student supports both class learning and personal self-study.
> Teachers may select platform catalog units as supplemental practice. Completion is personal
> progress unless the unit is wrapped in an Assignment/Attempt.

---

## Classes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/student/classes/join` | Join class via enrollmentCode |
| GET | `/api/v1/student/classes` | List enrolled classes |
| GET | `/api/v1/student/classes/:id` | Class detail |
| DELETE | `/api/v1/student/classes/:id/leave` | Leave class (status=dropped) |

---

## Assignments & Attempts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/assignments` | List assignments in enrolled classes |
| GET | `/api/v1/student/assignments/:id` | Assignment detail |
| POST | `/api/v1/student/assignments/:id/attempts` | Start attempt |
| GET | `/api/v1/student/attempts/:id` | Get attempt state |
| PATCH | `/api/v1/student/attempts/:id/answers` | Auto-save answers |
| POST | `/api/v1/student/attempts/:id/submit` | Submit attempt |
| GET | `/api/v1/student/attempts/:id/result` | View graded result + feedback |

---

## SRS Flashcards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/flashcards?hskLevel=3` | Browse flashcards by HSK level |
| GET | `/api/v1/student/flashcards/due` | Get cards due for review today |
| POST | `/api/v1/student/flashcards/:id/review` | Submit review rating (again/hard/good/easy) |
| GET | `/api/v1/student/flashcards/stats` | SRS stats: streak, due count, retention |

---

## Progress & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/progress` | Heatmap + skill breakdown |
| GET | `/api/v1/student/progress/chart` | Score over time chart data |

---

## Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/invoices` | List own invoices |
| GET | `/api/v1/student/invoices/:id` | Invoice detail + payment history |

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/notifications` | List notifications |
| PATCH | `/api/v1/student/notifications/:id/read` | Mark as read |

---

## Accepted capabilities with no endpoint contract yet

The following capabilities are part of the product domain, but no path, DTO, error code or
module invariant has been approved. They are listed here to prevent FE mock routes from being
mistaken for API contracts:

- learning catalog and curriculum paths;
- teacher-selected supplemental practice and completion visibility;
- foundation, grammar, character writing, Lego and workplace progress;
- placement attempts and platform mock exams;
- XP, rank, streak, badges and leaderboard;
- display preferences and cross-device progress sync.

⛔ Define these in Student/Teacher module specs before adding endpoints. Do not copy the
prototype's `/api/progress` routes into production by default.
