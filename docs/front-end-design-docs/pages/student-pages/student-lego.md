---
feature: S-SELF-5
role: student
route: /student/lego
status: built (live)
last_updated: 2026-09-18
---

# Page Contract — Student · Lego Sentence Builder (S-SELF-5)

## Purpose
Practise word order by dragging role-labelled blocks (S/T/P/A/V/O/C/Q) into a correct sentence, across seven stations. Private progress and stars.

## Access
- Allowed roles: `student`
- Ownership rule: attempts/progress are scoped to the authenticated student

## Entry points
- From: Student sidebar → "Ghép câu Lego"; deep link `/student/lego`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Station list + own derived progress | `GET /student/lego` | `data.stations[]` |
| Shuffled station content | `GET /student/lego/stations/:stationId` | `data.sentences[]` |
| Server-graded complete attempt | `POST /student/lego/stations/:stationId/attempt` | `data.results[]`, `data.progress` |

Live since 2026-09-18 under student module 06. The seven-station corpus is
repository-owned; the server grades canonical block order. XP force-unlock and
browser-owned stars were removed.

## Regions
1. Page Header: eyebrow "Luyện tập", title "Ghép câu Lego"
2. Station map with unlock states; locked state "Chưa mở trạm nào" until a station is chosen
3. Sentence builder: target meaning, role-coloured blocks, complete-station submit and server reveal

## States
- [x] Loading — skeleton
- [x] Ready — live station corpus and own derived progress
- [x] Empty — no unlocked station in the mock's fresh state
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Enter a station | unlocked station card | load server-shuffled blocks | `LEGO_STATION_NOT_FOUND` |
| Submit station | arrange every sentence | server grades exact order and derives stars | `VALIDATION_ERROR` |

## Out of scope
Official grading, teacher-assigned Lego exercises and XP economy (S-GAME-1, ⛔).
