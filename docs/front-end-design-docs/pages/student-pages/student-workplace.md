---
feature: S-SELF-6
role: student
route: /student/workplace
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Workplace Simulator (S-SELF-6)

## Purpose
Practise Chinese workplace conversations in role-played scenarios with multi-turn prompts and a model answer / rubric.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no workplace content or progress endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Mô phỏng công sở"; deep link `/student/workplace`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Scenario content | none defined | — |
| ⛔ Turn evaluation / progress | none defined | — |

Routes covered: `/student/workplace` (scenario list) and `/student/workplace/[scenarioId]` (one scenario's conversation).

Blocked on: the source corpus is outside the repo (`DOC-011` — `workplace.json`, 6 scenarios); FEATURES_STUDENT states the **production scorer is "not yet specified"** — keyword scoring in the mock is not a contract; self-study progress reads/writes have no approved transport (`API_STUDENT.md` § no-endpoint list, D1–D5 questions). Recorded under "Needs from the other lane".

## Regions
1. Page Header: eyebrow "Luyện tập", title "Mô phỏng công sở"
2. Scenario list ("Tình huống") with level/role filters; empty-filter state "Không có kịch bản nào khớp"
3. (⛔ conversation, per scenario) multi-turn dialogue, model answer/rubric — mock only

## States
- [x] Loading — skeleton
- [x] Ready — mock scenarios (⛔ no live data)
- [x] Empty — filtered list can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open a scenario | scenario card | navigate to `/student/workplace/[scenarioId]` (mock conversation) | — |

## Out of scope
Official grading; AI conversation scoring (no approved scorer contract); teacher-assigned scenarios.
