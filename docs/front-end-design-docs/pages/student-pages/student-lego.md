---
feature: S-SELF-5
role: student
route: /student/lego
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Lego Sentence Builder (S-SELF-5)

## Purpose
Practise word order by dragging role-labelled blocks (S/T/P/A/V/O/C/Q) into a correct sentence, across seven stations. Private progress and stars.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no lego progress endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Ghép câu Lego"; deep link `/student/lego`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Station/exercise content | none defined | — |
| ⛔ Progress + stars | none defined | — |

Blocked on: the source corpus is outside the repo (`DOC-011` — `lego.json`); self-study progress reads/writes have no approved contract (`API_STUDENT.md` § no-endpoint list; the Foundation/Grammar proposal's D1–D5 decisions cover the same progress-store questions). FEATURES_STUDENT also notes the mock's **XP force-unlock is not approved** — it stays demo-only and must not survive into any real implementation. Recorded under "Needs from the other lane".

## Regions
1. Page Header: eyebrow "Luyện tập", title "Ghép câu Lego"
2. Station map with unlock states; locked state "Chưa mở trạm nào" until a station is chosen
3. (⛔ play) sentence builder: target meaning, drag-drop blocks ("Ghép thành câu đúng"), block-colour legend ("Ý nghĩa màu khối") — mock only

## States
- [x] Loading — skeleton
- [x] Ready — mock stations (⛔ no live data)
- [x] Empty — no unlocked station in the mock's fresh state
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Enter a station | station card | open the mock builder | — |
| Force-unlock | XP button | **demo-only, not approved** — must never call a real endpoint | — |

## Out of scope
Official grading; teacher-assigned lego exercises; XP economy (S-GAME-1, ⛔).
