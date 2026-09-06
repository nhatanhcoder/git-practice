---
feature: S-SRS-1..5
role: student
route: /student/flashcards
status: built
last_updated: 2026-09-06
---

# Page Contract — Student · Vocabulary Flashcard SRS

## Purpose
Browse HSK 1–9 vocabulary cards, review due cards using SM-2, and inspect private retention statistics.

## Access
- Allowed roles: student
- Ownership rule: every state read/write uses the signed-in student's id
- On denial: the Student `RequireAuth` shell redirects to login or the correct role dashboard

## Entry points
- From: Student Dashboard → "Ôn hôm nay"; Student sidebar → "Flashcard từ vựng"
- Deep link: yes (`/student/flashcards`)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| vocabulary | `GET /api/v1/student/flashcards?hskLevel=` | `data[]`, `meta` |
| due queue | `GET /api/v1/student/flashcards/due` | `data[]` |
| statistics | `GET /api/v1/student/flashcards/stats` | `data` |
| review rate | `POST /api/v1/student/flashcards/:id/review` | `data.state` |

Blocked on: production vocabulary catalog seed (`DOC-011`); accepted timezone for non-null streak.

## Regions
1. Header + HSK 1–9 level selector
2. Statistics tiles: Due today, Total learned, Retention rate, Total reviews
3. Mode tabs: "Duyệt từ vựng" (Browse) vs "Thẻ đến hạn" (Due queue)
4. Vocabulary list (in browse mode) with "Ôn thẻ này" action
5. Two-state flashcard review panel (front with hanzi/pinyin, explicit flip reveal, four SM-2 rating buttons)
6. Session completion summary upon finishing due queue

## States
- [x] Loading — skeleton tiles and cards
- [x] Ready — stats plus vocabulary/review content
- [x] Empty — no catalog cards for selected level, or zero due cards in queue; explain the missing content/action
- [x] Partial — stats failure does not hide successfully loaded cards
- [x] Error — failed main fetch with retry
- [x] Forbidden — handled by Student shell
- [x] Offline / stale — request failure shown; no stale cache or fallback fixtures

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Change level | HSK selector (1–9) | reload vocabulary | `VALIDATION_ERROR` |
| Single review | "Ôn thẻ này" on card | open card front in single review view | — |
| Flip | card button / spacebar | reveal answer locally | — |
| Rate | Again(0)/Hard(3)/Good(4)/Easy(5) | persist SM-2, advance card, refresh stats | `FLASHCARD_NOT_FOUND`, `FLASHCARD_INVALID_RATING` |
| Review due | mode tab "Thẻ đến hạn" | load frozen due queue | — |
| Finish session | Last due card rated | display session summary card | — |

## Out of scope
Assignment mistake collection (`S-MSTK`, deferred to Sprint 4), saved-word management S-SRS-6/7, XP/badges, and mock Leitner 5-box logic.
