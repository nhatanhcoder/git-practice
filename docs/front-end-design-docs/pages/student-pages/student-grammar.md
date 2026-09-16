---
feature: S-SELF-3, S-SELF-9
role: student
route: /student/grammar
status: contracted
approval: proposed
last_updated: 2026-09-10
---
# Page Contract — Student · Grammar
## Purpose
Find a grammar point, study its explanation and practise only reviewed exercise modes.
Backend live since 2026-09-16 (list/detail/progress/save, 02-foundation-grammar.md §2);
FE still mock-backed (unwired). Practice needs a reviewed exercise manifest (deferred).
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
| List/detail/filter choices | `GET /student/grammar…` (BE live, FE unwired) | `data[]` + `meta`; §3 |
| Own study/practice state | `GET /student/grammar/progress` (BE live, FE unwired) | `data.studied[]` |
| Mark studied | `PUT /student/grammar/progress` (BE live, FE unwired) | `data` saved record; `GRAMMAR_NOT_FOUND` |
| Reviewed exercise + submit | ⛔ G-practice, deferred (no manifest) | — (no endpoint) |
BE per [module decisions D1–D5](../../../api/modules/student/02-foundation-grammar.md) (approved 2026-09-16); FE wiring is the remaining work.

## Regions
1. Title, parent action, known private study summary; unknown state is not zero.
2. HSK 1–9, category, search and reset controls.
3. Content cards: source name/formula/example; no fixture mastery.
4. Selected point: explanation, Hanzi/Pinyin/Vietnamese example, notes; mark studied.
5. Practice only when reviewed exercise exists; confirmed result and next learning action.

## States
- [ ] Loading — content and progress independently.
- [ ] Ready — published records and confirmed private state.
- [ ] Empty — no records/matches; reset filter action.
- [ ] Partial — study works with missing progress/exercises; no fabricated mastery.
- [ ] Error — failed read retries; failed submit retains answer, no success.
- [ ] Forbidden — existing shell/denied state; no private-data exposure.
- [ ] Offline / stale — preserve draft, no automatic mutation replay or demo fallback.

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter/search/reset | controls | G-read (BE live); latest response only; URL restored | `VALIDATION_ERROR` |
| Open/close point | card/return to list | same hub and URL selection; G-read (BE live) | `GRAMMAR_NOT_FOUND` |
| Mark/unmark studied | explicit control | G-save (BE live) confirmed before display changes | `GRAMMAR_NOT_FOUND` |
| Practise/submit | reviewed mode/answer | ⛔ deferred — no reviewed mode exists | — (no endpoint) |
| Continue study | confirmed result | same point or list, no extra write | — |
| Retry/return | retry or Dashboard link | failed read only / `/student` | existing handling |

## Out of scope
Invented exercises, XP/streak/mastery formulas, official grades, SRS writes and catalog authoring.
