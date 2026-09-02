---
feature: T-QB-1, T-QB-2, T-QB-4, T-QB-5, T-QB-6
role: teacher
route: /teacher/questions
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Question Bank

## Purpose
Browse, filter, create and maintain the teacher's own questions across 3 skills and the 8+ sub-types.

## Access
- Allowed roles: teacher
- Ownership rule: server scopes to the creator; no client filter
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Ngân hàng câu hỏi"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| question list | `GET /api/v1/teacher/questions?skill=&hskLevel=&subType=` | `data[]` |
| create | `POST /api/v1/teacher/questions` | `data.question` |
| update | `PATCH /api/v1/teacher/questions/:id` | `data.question` |
| delete | `DELETE /api/v1/teacher/questions/:id` | `data.question` |

Blocked on: error codes for all four actions — none registered for Question in
`API_ERROR_CODES.md`; every row below is `TODO(error-code)`. Audio upload (Supabase) is a
placeholder input in the mock.

## Regions
1. Page title + primary action "Tạo câu hỏi"
2. Filter toolbar — skill (Nghe/Đọc/Viết), HSK 1–9, sub-type (options depend on skill)
3. Data table — content preview, skill, sub-type, HSK level, difficulty, times used, row menu

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — "Chưa có câu hỏi nào" + CTA "Tạo câu hỏi đầu tiên"
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry, toolbar stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create | "Tạo câu hỏi" | modal — fields adapt to skill (options editor for MCQ) | `TODO(error-code)` |
| Edit | row menu → "Sửa" | modal, prefilled | `TODO(error-code)` |
| Delete | row menu → "Xoá" | confirm; disabled when `usageCount > 0` (soft-delete rule, F3.6) with tooltip | `TODO(error-code)` |
| Preview | row menu → "Xem trước" | drawer: full content, answer, explanation | — |

## Out of scope
- Real audio upload/playback — placeholder only
- Reading-passage multi-sub-question authoring — single content field in the mock
- Bulk import / export

## Implementation note — 2026-09-02 (`WEB-006` B2)

The model follows `ENTITY_QUESTION`: `correctAnswer: string | string[] | null` plus a
separate `rubric`. **Writing stores `correctAnswer = null`** and requires a rubric; the form
hides the answer field for Writing and shows "Rubric chấm điểm *" instead. List and preview
render through a helper so a rubric is never labelled as an answer. The earlier build had a
single required `answer` field and put rubric prose in it.
