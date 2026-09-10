# Student Flow Map — SRS & Classes

## Entry

`/login → /student` after Student-role authentication.

## 1. SRS Flashcard branch

```text
/student  Dashboard
│
├── Ôn hôm nay / Sidebar: Flashcard từ vựng
│   ▼
│   /student/flashcards  Flashcard SRS         GET /api/v1/student/flashcards/stats
│   ├── Chọn HSK 1–9 → same screen             GET /api/v1/student/flashcards?hskLevel=N
│   ├── Ôn thẻ này → single card focus         local
│   ├── Thẻ đến hạn → due queue                GET /api/v1/student/flashcards/due
│   ├── Lật thẻ → reveal back                  local only / spacebar
│   ├── Again/Hard/Good/Easy → advance card    POST /api/v1/student/flashcards/:id/review
│   └── Hoàn thành phiên → summary card        local / stats update
```

## 2. Classes & Enrollment branch

```text
/student  Dashboard
│
└── Sidebar: Lớp của tôi
    ▼
    /student/classes  Danh sách lớp            GET /api/v1/student/classes
    ├── Tham gia lớp → Modal nhập mã 8 ký tự   POST /api/v1/student/classes/join
    └── Chọn lớp → Chi tiết lớp
        ▼
        /student/classes/[classId]             GET /api/v1/student/classes/:id
        ├── Xem bài học → chi tiết bài học    /student/classes/[classId]/lessons/[lessonId]
        └── Rời lớp → Modal xác nhận          DELETE /api/v1/student/classes/:id/leave
```

## 3. Note on Sổ tay lỗi sai (`S-MSTK`)

`/student/mistakes` (Sổ tay lỗi sai) and `/student/mistakes/review` are dedicated to diagnostic error review for questions answered incorrectly during homework assignments and CBT mock exams. They are separate from vocabulary flashcards (`/student/flashcards`). Backend error-collection endpoints will be defined in Sprint 4 (Assignments & Attempts); in the interim, `/student/mistakes` remains in prototype/demo mode without being conflated with flashcard SRS.

**2026-09-09 note (applies to every backend-less route)**: all production `UnavailableState`
branches now run **after** the page's hooks (the A05 placement; `WEB-019` fixed + regression
test `student-prod-return.test.mjs`), and `/student/exams/*` production copy cites the correct
backend dependency — the **Sprint 4** exam engine (`AttemptsModule`), previously mis-cited as
"Sprint 5". A new screen added to this area must keep the same hook ordering.

## Transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 1 | `/student` | Ôn hôm nay / Flashcard | `/student/flashcards` | GET stats | auth errors |
| 2 | `/student/flashcards` | Chọn HSK | same | GET flashcards | `VALIDATION_ERROR` |
| 3 | `/student/flashcards` | Thẻ đến hạn | same | GET due | auth errors |
| 4 | review card | Lật thẻ | same | local | — |
| 5 | review card | Rate | next card / summary | POST review | `FLASHCARD_NOT_FOUND`, `FLASHCARD_INVALID_RATING` |
| 6 | `/student` | Lớp của tôi | `/student/classes` | GET classes | auth errors |
| 7 | `/student/classes` | Tham gia lớp | same / modal | POST join | `CLASS_ENROLL_CODE_INVALID`, `CLASS_ALREADY_ARCHIVED`, `CLASS_ALREADY_ENROLLED`, `VALIDATION_ERROR` |
| 8 | `/student/classes` | Chọn lớp | `/student/classes/[classId]` | GET class detail | `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`, `VALIDATION_ERROR` |
| 9 | `/student/classes/[classId]` | Rời lớp | `/student/classes` | DELETE leave | `CLASS_NOT_ENROLLED`, `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`, `VALIDATION_ERROR` |

## Entity state transitions

- **SRS**: `unseen → reviewed → scheduled → due → reviewed`. Again resets repetitions/interval; successful ratings advance them using canonical SM-2.
- **Enrollment**: `not_enrolled → active ⇄ dropped`. Leaving flips status to `dropped` (INV-CLASS-06); re-joining with valid code reactivates existing row to `active` and sets `rejoinedAt`.

## Missing endpoints

- ⛔ Save a word from content (S-SRS-6).
- ⛔ Manage/review the saved-word bank (S-SRS-7).
- ⛔ Assignment/Attempt mistake collection (S-MSTK, Sprint 4).

