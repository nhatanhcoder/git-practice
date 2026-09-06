# Student Flow Map — SRS slice

## Entry

`/login → /student → /student/mistakes` after Student-role authentication.

## SRS branch

```text
/student  Dashboard
│
└── Ôn hôm nay
    ▼
    /student/mistakes  SRS Review       GET /api/v1/student/flashcards/stats
    ├── Chọn HSK → same screen          GET /api/v1/student/flashcards?hskLevel=N
    ├── Thẻ đến hạn → same screen       GET /api/v1/student/flashcards/due
    ├── Lật thẻ → same card             local only
    └── Again/Hard/Good/Easy → next     POST /api/v1/student/flashcards/:id/review
```

## Full transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 1 | `/student` | Ôn hôm nay | `/student/mistakes` | GET stats | auth errors |
| 2 | `/student/mistakes` | Chọn HSK | same | GET flashcards | `VALIDATION_ERROR` |
| 3 | `/student/mistakes` | Thẻ đến hạn | same | GET due | auth errors |
| 4 | review card | Lật thẻ | same | local | — |
| 5 | review card | Rate | next card | POST review | `FLASHCARD_NOT_FOUND`, `FLASHCARD_INVALID_RATING` |

## Entity state transitions

`unseen → reviewed → scheduled → due → reviewed`. Again resets repetitions/interval; successful
ratings advance them using canonical SM-2.

## Missing endpoints

- ⛔ Save a word from content (S-SRS-6).
- ⛔ Manage/review the saved-word bank (S-SRS-7).

