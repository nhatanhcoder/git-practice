---
feature: S-SELF-3, S-SELF-9
role: student
route: /student/grammar
status: built
approval: proposed
last_updated: 2026-09-26
---
# Page Contract — Student · Grammar

Design spec: [student-grammar.spec.md](../../specs/student-pages/student-grammar.spec.md)
## Purpose
Find a grammar point, study its explanation and practise the reviewed reorder exercise.
Backend live since 2026-09-16 (list/detail/progress/save/practice, 02-foundation-grammar.md §2);
FE wiring lands in the option-A slice. Only the reorder exercise ships — no other modes.
## Access
- Allowed roles: student; existing Student shell, no new Auth/RBAC behavior.
- Ownership: published catalog plus current learner's state; never another learner's progress.
- On denial: existing shell handling, no fallback demo or client-selected learner identity.
## Entry points
- Student navigation → Grammar; deep link `/student/grammar`.
- Proposed URL selection: level/category/search/point; FE query names pending D5, not API fields.
- Selected point opens inline study content, not a mandatory modal before learning.

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| List/detail/filter choices | `GET /student/grammar…` (live; `tokens` never served) | `data[]` + `meta`; §3 |
| Assigned filter | `GET /student/grammar?…&assignedOnly=true` (API-020, accepted) — server filters the full catalog to points attached to the caller's active-enrollment lessons, before pagination | `data[]` + `meta`; empty set (not error) when nothing qualifies |
| Own study/practice state | `GET /student/grammar/progress` (live) | `data.studied[]` + `data.practice[]` |
| Mark studied | `PUT /student/grammar/progress` (live) | `data` saved record; `GRAMMAR_NOT_FOUND` |
| Reorder exercise + submit | `GET/POST /student/grammar/:id/practice` (live) | shuffled `tokens`; graded result; `GRAMMAR_PRACTICE_CONFLICT` |
BE per [module decisions D1–D5 + option A](../../../api/modules/student/02-foundation-grammar.md) (approved 2026-09-16).

## Regions
1. Title, parent action, known private study summary; unknown state is not zero.
2. HSK 1–9, category, search, assigned ("Giáo viên giao") and reset controls. The
   assigned toggle is server-side (`assignedOnly`) — never a client slice of one page.
3. Content cards: source name/formula/example; no fixture mastery.
4. Selected point: explanation, Hanzi/Pinyin/Vietnamese example, notes; mark studied.
   Deep-linkable via `?point=:id` (unknown id → honest error in the drawer).
5. Practice only when reviewed exercise exists; confirmed result and next learning action.

## States
- [ ] Loading — content and progress independently.
- [ ] Ready — published records and confirmed private state.
- [ ] Empty — no records/matches; reset filter action. Assigned mode with nothing
  assigned renders its own honest empty ("no teacher-assigned points"), not the
  generic filter empty.
- [ ] Partial — study works with missing progress/exercises; no fabricated mastery.
- [ ] Error — failed read retries; failed submit retains answer, no success.
- [ ] Forbidden — existing shell/denied state; no private-data exposure.
- [ ] Offline / stale — preserve draft, no automatic mutation replay or demo fallback.

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter/search/reset | controls | G-read (live); latest response only; URL restored | `VALIDATION_ERROR` |
| Assigned filter | "Giáo viên giao" toggle | G-read with `assignedOnly` (live); full-catalog server filter; URL restored | `VALIDATION_ERROR` |
| Open/close point | card/return to list | same hub and URL selection; G-read (live) | `GRAMMAR_NOT_FOUND` |
| Deep-link point | `?point=:id` URL | opens the point drawer on load; unknown id → drawer error | `GRAMMAR_NOT_FOUND` |
| Mark/unmark studied | explicit control | G-save (live) confirmed before display changes | `GRAMMAR_NOT_FOUND` |
| Practise/submit | reorder mode/answer + fresh submissionId | G-practice server result; replay returns stored row | `GRAMMAR_PRACTICE_CONFLICT` |
| Continue study | confirmed result | same point or list, no extra write | — |
| Retry/return | retry or Dashboard link | failed read only / `/student` | existing handling |

## Out of scope
Invented exercises, XP/streak/mastery formulas, official grades, SRS writes and catalog authoring.
