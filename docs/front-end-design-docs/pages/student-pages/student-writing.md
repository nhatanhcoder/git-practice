---
feature: S-SELF-4
role: student
route: /student/writing
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Character Writing Practice (S-SELF-4)

## Purpose
Practise writing Chinese characters with stroke guidance and track personal mastery. Private self-study progress — never an official grade.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no writing-progress endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Luyện viết chữ"; deep link `/student/writing`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Character set + stroke data | none defined | — |
| ⛔ Personal mastery / progress reads & writes | none defined | — |

Routes covered: `/student/writing` (the "Bộ chữ" browser) and `/student/writing/[charId]` (one character's practice canvas).

Blocked on: the source corpus is outside the repo (`DOC-011` — `writing.json` is a character dataset with known defects, and `strokes.json` covers only 59/586 characters per the A10 audit); self-study progress writes have no approved contract (`API_STUDENT.md` § no-endpoint list; the Foundation/Grammar proposal's D1–D5 decisions cover the same progress-store questions). Recorded under "Needs from the other lane".

## Regions
1. Page Header: eyebrow "Luyện tập", title "Luyện viết chữ Hán"
2. Character browser ("Bộ chữ") with search/level filters; empty-filter state "Không có chữ nào khớp"
3. (⛔ practice, per character) animated stroke order, canvas tracing, mastery indicator — mock only

## States
- [x] Loading — skeleton
- [x] Ready — mock character set (⛔ no live data)
- [x] Empty — filtered set can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open a character | character card | navigate to `/student/writing/[charId]` (mock practice) | — |

## Out of scope
Official grading; teacher-assigned writing tasks (those are Assignment/Attempt flows); corpus authoring (`DEBT-003`).
