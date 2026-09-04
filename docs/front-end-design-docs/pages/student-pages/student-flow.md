---
role: student
status: contracted
last_updated: 2026-09-04
scope: LMS half only — class, lesson, assignment, attempt
---

# Flow Map — Student

> **Scope note.** This map covers the **LMS half** of the Student area: learning with a
> class and a teacher. The self-study library (`/student/learning-path`, `/student/grammar`,
> `/student/flashcards`, and the rest of the rail) is a separate branch and is not drawn
> here — the two are joined only at the dashboard.
>
> The boundary that matters: **self-study never produces an official result.** Only an
> Assignment and its Attempt do. An edge that crosses from the library into a score does
> not exist, and should not be added to this map without a decision.

## Entry

`/login` → role `student` → `/student` (dashboard).

## Class branch

```
/student/classes  My Classes                       GET /api/v1/student/classes
│
├── Tham gia lớp → code dialog → same screen       POST /api/v1/student/classes/join
│
└── Open class
    ▼
    /student/classes/[classId]  Class Detail       GET /api/v1/student/classes/:id
    ├── Rời lớp → confirm → /student/classes       DELETE /api/v1/student/classes/:id/leave
    └── Open lesson
        ▼
        /student/classes/[classId]/lessons/[lessonId]  Lesson    ⛔ no endpoint
        └── Open assignment → /student/assignments/[assignmentId]
```

⛔ The lesson node has **no endpoint in `API_STUDENT.md`** — there is no Lessons section
at all. Both the lesson list on class detail and the lesson screen itself are mocked.

## Assignment branch

```
/student/assignments  Assignments                  GET /api/v1/student/assignments
│
├── Bắt đầu (not started)
│   ▼
│   creates an attempt                             POST /api/v1/student/assignments/:id/attempts
│   ▼
│   /student/attempts/[attemptId]  Take            GET /api/v1/student/attempts/:id
│   ├── answer (debounce 2s)                       PATCH /api/v1/student/attempts/:id/answers
│   ├── Nộp bài → confirm ─────────┐               POST /api/v1/student/attempts/:id/submit
│   └── timer hits 0 → auto-submit ┤               POST /api/v1/student/attempts/:id/submit
│                                  ▼
│                                  /student/attempts/[attemptId]/result
│                                                  GET /api/v1/student/attempts/:id/result
│
├── Tiếp tục (in progress) → /student/attempts/[attemptId]
│
├── (submitted, ungraded) → no action, by design
│
└── Xem kết quả (graded) → /student/attempts/[attemptId]/result
```

## Ordering that must hold

1. An attempt cannot be started twice for one assignment — Resume points at the existing
   attempt, it does not POST again.
2. Submit is one-way. There is no path from `submitted` back to `in_progress`, which is
   why the result screen is the only destination after it.
3. `submitted` and `graded` are different states. The gap between them is normal, not an
   error: MCQ grades itself, Writing waits for the teacher.
4. Leaving a class does not delete attempts already made in it. Nothing in this map
   removes an official result.
