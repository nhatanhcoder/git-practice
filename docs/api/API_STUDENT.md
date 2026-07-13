# 🔌 API Student

> Endpoints dành riêng cho role Student.  
> Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)  
> Permissions: [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)

All routes require: `Authorization: Bearer <token>` + `role=student`

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
