---
feature: S-CLS-1, S-CLS-2
role: student
route: /student/classes
status: built
last_updated: 2026-09-06
---

# Page Contract — Student · Classes List & Join

## Purpose
View all active classes the student is currently enrolled in, view teacher names, schedules, and join a new class using an 8-character enrollment code provided by a teacher.

## Access
- Allowed roles: `student`
- Ownership rule: reads and joins are scoped to the authenticated student (`user.id` from token)
- On denial: Student shell `RequireAuth` redirects to login

## Entry points
- From: Student sidebar → "Lớp của tôi"; Student Dashboard → "Lớp học"
- Deep link: yes (`/student/classes`)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Enrolled classes | `GET /api/v1/student/classes` | `data[]` |
| Join class | `POST /api/v1/student/classes/join` | `data` |

Note: `enrollmentCode` is deliberately omitted from `GET /api/v1/student/classes` response items to prevent unauthorized sharing by students.

## Regions
1. Page Header: Eyebrow "Học cùng giáo viên", Title "Lớp của tôi", Active classes count, and action button "Tham gia lớp"
2. Classes Card Grid: Cards displaying HSK level badge, class name, teacher name, schedule, student count, lesson count, and link to `/student/classes/[classId]`
3. Join Class Modal: 8-character uppercase input with auto-formatting, cancel/submit buttons, and error notice

## States
- [x] Loading — skeleton cards while classes are fetched
- [x] Ready — cards grid showing all active enrollments
- [x] Empty — student has 0 active classes; displays empty illustration with "Nhập mã lớp" action button
- [x] Partial — not applicable (single primary dataset)
- [x] Error — failed API call with retry button
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — displays clean network error; no fake fallback classes or mock rosters

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open Join Dialog | Button "Tham gia lớp" | open modal | — |
| Enter Code | Input field | uppercase auto-formatting | — |
| Submit Join | Button "Tham gia" / Enter key | call join API, prepend/refetch list, close modal, toast success | `CLASS_ENROLL_CODE_INVALID`, `CLASS_ALREADY_ARCHIVED`, `CLASS_ALREADY_ENROLLED`, `VALIDATION_ERROR` |
| View Class | Click class card | navigate to `/student/classes/[classId]` | — |

## Out of scope
Class creation (Teacher only), student roster inspection of classmates (Teacher/Admin only), class archiving or editing.
