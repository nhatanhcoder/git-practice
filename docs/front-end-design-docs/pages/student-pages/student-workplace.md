---
feature: S-SELF-6
role: student
route: /student/workplace
status: built (live)
last_updated: 2026-09-18
---

# Page Contract — Student · Workplace Simulator (S-SELF-6)

## Purpose
Practise Chinese workplace conversations in role-played scenarios with multi-turn prompts and a model answer / rubric.

## Access
- Allowed roles: `student`
- Ownership rule: revealed turns/progress are scoped to the authenticated student

## Entry points
- From: Student sidebar → "Mô phỏng công sở"; deep link `/student/workplace`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Scenario list + own completion | `GET /student/workplace` | `data.scenarios[]` |
| Scenario briefing/turn prompts | `GET /student/workplace/:scenarioId` | `data` (models withheld) |
| Submit reply + reveal comparison | `POST /student/workplace/:scenarioId/turns/:turnId/reveal` | `data.model`, `data.corrections` |

Routes covered: `/student/workplace` (scenario list) and `/student/workplace/[scenarioId]` (one scenario's conversation).

Live since 2026-09-18 under student module 06. Six scenarios are repository-owned.
The learner must write before model/corrections are revealed; numeric, keyword and
AI scoring are intentionally absent.

## Regions
1. Page Header: eyebrow "Luyện tập", title "Mô phỏng công sở"
2. Scenario list ("Tình huống") with level/role filters; empty-filter state "Không có kịch bản nào khớp"
3. Multi-turn dialogue with post-submit model/rubric comparison

## States
- [x] Loading — skeleton
- [x] Ready — live scenarios and own turn completion
- [x] Empty — filtered list can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open a scenario | scenario card | navigate to live `/student/workplace/[scenarioId]` | `WORKPLACE_SCENARIO_NOT_FOUND` |
| Reveal comparison | submit nonblank reply in order | persist turn completion and show model/corrections | `WORKPLACE_TURN_NOT_FOUND`, `VALIDATION_ERROR` |

## Out of scope
Official/numeric grading, AI conversation scoring, reply retention and teacher-assigned scenarios.
