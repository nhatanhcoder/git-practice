---
feature: S-SRS-1..5
role: student
route: /student/mistakes
status: built
last_updated: 2026-09-05
---

# Page Contract — Student · SRS Review

## Purpose
Browse HSK vocabulary, review due cards with SM-2, and inspect private retention statistics.

## Access
- Allowed roles: student
- Ownership rule: every state read/write uses the signed-in student's id
- On denial: the Student `RequireAuth` shell redirects to login or the correct role dashboard

## Entry points
- From: Student Dashboard → "Ôn hôm nay"; Student sidebar → "Sổ lỗi"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| vocabulary | `GET /api/v1/student/flashcards?hskLevel=` | `data[]`, `meta` |
| due queue | `GET /api/v1/student/flashcards/due` | `data[]` |
| statistics | `GET /api/v1/student/flashcards/stats` | `data` |

Blocked on: production vocabulary seed; accepted timezone for non-null streak

## Regions
1. Title + HSK 1–9 selector
2. Statistics tiles: due, learned, retention, total reviews
3. Browse/review mode tabs
4. Vocabulary list or one-card review surface with answer flip and four ratings

## States
- [x] Loading — skeleton tiles and cards
- [x] Ready — stats plus vocabulary/review content
- [x] Empty — no catalog cards or no due cards; explain the missing content/action
- [x] Partial — stats failure does not hide successfully loaded cards
- [x] Error — failed main fetch with retry
- [x] Forbidden — handled by Student shell
- [x] Offline / stale — request failure shown; no stale cache or fallback fixtures

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Change level | HSK selector | reload vocabulary | `VALIDATION_ERROR` |
| Start card | vocabulary action | open card front | — |
| Flip | card button | reveal answer locally | — |
| Rate | Again/Hard/Good/Easy | persist SM-2 and advance | `FLASHCARD_NOT_FOUND`, `FLASHCARD_INVALID_RATING` |
| Review due | mode tab | load due queue | — |

## Out of scope
Assignment mistake collection, saved-word management S-SRS-6/7, XP/badges, and seeded vocabulary.
