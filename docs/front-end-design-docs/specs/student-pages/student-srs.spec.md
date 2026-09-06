---
status: built
design_baseline: v1
route: /student/mistakes
last_updated: 2026-09-05
---

# Student SRS Review — Page Spec

> Paste with `_DESIGN-SYSTEM.md`. If you were not given it, stop and ask — do not invent tokens.

## 1. Purpose

A private HSK 1–9 vocabulary browser and focused one-card-at-a-time SM-2 review surface.

## 2. Access

Student only. State belongs to the signed-in Student; `userId` never appears in a request.

## 3. API mapping

| Region/action | Method + path | Envelope | Errors |
|---|---|---|---|
| HSK browser | GET `/student/flashcards?hskLevel=N` | `data[]`, `meta` | `VALIDATION_ERROR` |
| Due mode | GET `/student/flashcards/due` | `data[]` | auth errors |
| Stats | GET `/student/flashcards/stats` | `data` | auth errors |
| Rate | POST `/student/flashcards/:id/review` | `data.state` | `FLASHCARD_NOT_FOUND`, `FLASHCARD_INVALID_RATING` |

## 4. Page structure

Title and level selector; four compact statistics; Browse/Due tabs; card list in Browse; focused
flashcard in review. No assignment mistakes, saved-word bank, XP or leaderboard.

## 5. Component specs

Flashcard review is a two-state accessible panel, not a 3D-only interaction. Front shows hanzi and
pinyin; an explicit button reveals meaning and example. Four labelled rating buttons appear only
after reveal. Reduced-motion mode removes transform animation.

## 6. Data

Use cards with nullable example/audio/state. HSK levels are 1–9. Stats may return `streak: null`.

## 7. States

Loading skeletons; Ready; empty catalog; empty due queue; Partial stats failure; main Error with
retry; Forbidden via shell; Offline as an error with no fake fallback.

## 8. Copy

`Ôn tập SRS`, `Duyệt từ vựng`, `Thẻ đến hạn`, `Lật thẻ`, `Quên`, `Khó`, `Tốt`, `Dễ`.

## 9. Interactions

Keyboard-focusable tabs, level buttons, flip and ratings. Rating advances to the next card only
after a successful response. At 375px the stats and list collapse to one column.

## 10. Do NOT

Do not expose another student's state, simulate vocabulary, show rating buttons before reveal, or
claim streak is available while the timezone contract is unresolved.
