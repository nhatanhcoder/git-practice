# 🔌 API Teacher

> Endpoints dành riêng cho role Teacher.  
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
