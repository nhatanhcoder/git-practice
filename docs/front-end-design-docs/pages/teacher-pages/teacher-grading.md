---
feature: T-GRADE-1, T-GRADE-2, T-GRADE-3, T-GRADE-4, T-GRADE-5
role: teacher
route: /teacher/grading
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Grading

## Purpose
Work the submitted-attempt queue: review answers, take the AI suggestion for Writing, enter scores and feedback, finish.

## Access
- Allowed roles: teacher
- Ownership rule: attempts from own classes only (service-layer check)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Chấm bài"; `/teacher/assignments` drawer link (future)
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| grading queue | `GET /api/v1/teacher/attempts?status=submitted` | `data[]` |
| attempt detail | `GET /api/v1/teacher/attempts/:id` | `data.attempt`, `data.answers[]` |
| AI suggest (Writing) | `POST /api/v1/teacher/attempts/:id/ai-suggest` | `data.aiSuggestedScore`, `data.aiFeedback` |
| submit grades | `PATCH /api/v1/teacher/attempts/:id/grade` | `data.attempt` |

Blocked on: error codes — none registered for Attempt/grading; rows below `TODO(error-code)`.

## Regions
1. Page title (+ queue count)
2. Filter toolbar — class, assignment
3. Queue table — student, assignment, class, submitted at, status pill, score
4. Grading drawer (one attempt) — header (student/assignment), per-question list:
   question content, student answer, reference answer, score input + feedback input;
   Writing questions show an "AI gợi ý" button that fills the inputs (suggestion, overridable);
   footer: total score + "Hoàn thành chấm"

## States
- [ ] Loading — table skeleton; drawer has its own skeleton
- [ ] Ready
- [ ] Empty — queue clear → "Không có bài chờ chấm" (positive state, no CTA needed)
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open attempt | row click | grading drawer loads | — |
| AI suggest | Writing question → "AI gợi ý" | fills score + feedback for that question (teacher may override) | `TODO(error-code)` |
| Finish grading | drawer "Hoàn thành chấm" (enabled when every question has a score) | status → `graded`, toast, row updates | `TODO(error-code)` |

## Out of scope
- Re-grading an already graded attempt (T-GRADE-6 Could) — read-only view
- Auto-graded MCQ recompute — server-side, display only

## Implementation note — 2026-09-02 (`WEB-006` A2)

Scores are clamped to `[0, maxScore]` on input and re-checked at the write, so a disabled
button is never the only guard. The grading draft keeps the teacher's final score/feedback
and the **AI's original suggestion** separately: finishing grading stores the AI suggestion
as the AI produced it. The earlier build overwrote `aiSuggestion` with the teacher's edited
values, which destroyed the only comparison the field exists for.
