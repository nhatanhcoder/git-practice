---
status: active
last_updated: 2026-09-10
---

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


## Foundation and Grammar proposal — 2026-09-10

**Status: proposed / blocked; NOT IMPLEMENTED.** Operation labels below refer to
[the module proposal](../../../api/modules/student/02-foundation-grammar.md), not endpoints.
All F/G/M operations are ⛔ until exact path/method/DTO/error contracts are approved.
Existing SRS/Classes branches above are unchanged.

### Foundation traversal

```text
/student  Dashboard
└── Navigation: Foundation
    ▼
    /student/foundation?tab=pinyin           ⛔ F-read + F-progress
    ├── Tab/search/strokes/page → same hub  local selection; ⛔ F-read if needed
    ├── Item → same-screen detail           local / ⛔ F-read if needed
    ├── Mark/unmark studied → same item     ⛔ F-save → confirmed state
    ├── Play/download → same screen         ⛔ M-read / verified resource only
    ├── Record → permission → playback      local session only, after D4 approval
    ├── Retry failed read → same screen     ⛔ F-read / F-progress / M-read
    └── Back to Dashboard
        ▼
        /student                           navigation only
```

### Grammar traversal

```text
/student  Dashboard
└── Navigation: Grammar
    ▼
    /student/grammar                       ⛔ G-read + G-progress
    ├── HSK/category/search/reset → hub     local selection; ⛔ G-read if needed
    ├── Point → inline study, same route    ⛔ G-read if needed; URL selection proposed
    │   ├── Mark/unmark studied             ⛔ G-save → confirmed state
    │   ├── Practise → answer → submit      ⛔ G-practice → confirmed result
    │   │   └── Continue study → point/list local selection; no mutation
    │   └── Close point → filtered list     local navigation; preserve filters
    ├── Retry failed read → same screen     ⛔ G-read / G-progress
    └── Back to Dashboard
        ▼
        /student                           navigation only
```

A permission dialog is not a new route. Grammar learning is inline rather than gated behind
an obligatory preview modal. URL query names for Grammar point/filter selection are a UI
proposal, not accepted API query parameters. Back/forward must restore the chosen view.

### Full additional transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| FG1 | Dashboard | Open Foundation | Foundation hub | ⛔ F-read + F-progress | TODO(error-code) |
| FG2 | Foundation | Tab/search/strokes/page | same hub | local / ⛔ F-read | TODO(error-code) |
| FG3 | Foundation | Inspect item | same-screen detail | local / ⛔ F-read | TODO(error-code) |
| FG4 | Foundation item | Mark/unmark studied | same item, confirmed | ⛔ F-save | TODO(error-code) |
| FG5 | Foundation | Play/download | same screen/resource | ⛔ M-read | TODO(error-code) |
| FG6 | Foundation speaking | Record/playback | permission then local playback | none; D4 blocked | denial/unavailable UI |
| FG7 | Foundation | Retry failed read | same screen | ⛔ F-read / F-progress / M-read | TODO(error-code) |
| FG8 | Foundation | Return | Dashboard | none | — |
| FG9 | Dashboard | Open Grammar | Grammar hub | ⛔ G-read + G-progress | TODO(error-code) |
| FG10 | Grammar | Filter/search/reset | same hub | local / ⛔ G-read | TODO(error-code) |
| FG11 | Grammar | Open point | inline study | local / ⛔ G-read | TODO(error-code) |
| FG12 | Grammar point | Close point | filtered list | none | — |
| FG13 | Grammar point | Mark/unmark studied | same point, confirmed | ⛔ G-save | TODO(error-code) |
| FG14 | Grammar point | Practise/submit | answer then confirmed result | ⛔ G-practice | TODO(error-code) |
| FG15 | Grammar result | Continue study | point/list | none | — |
| FG16 | Grammar | Retry failed read | same screen | ⛔ G-read / G-progress | TODO(error-code) |
| FG17 | Grammar | Return | Dashboard | none | — |

### Additional state transitions and absent paths

Proposed study state: not studied ⇄ explicitly studied, with set semantics rather than a
blind toggle. Proposed practice state: ready → answering → submitting → confirmed result;
failed/uncertain submit preserves the draft and does not auto-replay. Neither means mastery/XP.

Missing contracts: F-read, F-progress, F-save, G-read, G-progress, G-save, G-practice and M-read.
There is no Student create/delete/publish catalog path because existing permissions forbid it.
No microphone-upload path, cloud scorer, Teacher progress surface, gamification event or
Assignment-grade transition is introduced. No persisted-write edge is executable yet.

## Learning Path proposal — 2026-09-11

**Status: proposed / blocked; NOT IMPLEMENTED.** Contracts
`student-learning-path.md` + `student-learning-path-node.md` (S-SELF-1). All reads/writes
below are ⛔ per `API_STUDENT.md` §83–94 (learning catalog and curriculum paths have no
path/DTO/error contract). Existing SRS/Classes/FG branches above are unchanged.

### Learning Path traversal

```text
/student  Dashboard
└── Navigation: Lộ trình HSK
    ▼
    /student/learning-path?curriculum=&level=&view=   ⛔ catalog + progress reads
    ├── Đổi curriculum/HSK/map-list → same screen     local URL params; ⛔ read on change
    ├── Mở node → drawer (no route change)            local
    │   ├── Mở khoá bằng XP → drawer confirms         local XP guard (mock rule)
    │   └── Bắt đầu / Học lại → node route
    │       ▼
    │       /student/learning-path/[nodeId]           ⛔ catalog read
    │       ├── Học → Luyện → Hoàn thành              local steps
    │       ├── Trả lời → đúng/sai tại chỗ            local
    │       └── Boss < 80% → stays locked             local gate (mock rule)
    ├── Retry failed read → same screen               ⛔ catalog / progress reads
    └── Back to Dashboard
        ▼
        /student                           navigation only
```

### Learning Path transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| LP1 | Dashboard | Open Learning Path | map hub | ⛔ catalog + progress | TODO(error-code) |
| LP2 | map hub | Change filters | same hub (new URL) | local / ⛔ read | TODO(error-code) |
| LP3 | map hub | Open node | drawer, no route | local | — |
| LP4 | drawer | Force-unlock / Start | drawer / node route | local | — |
| LP5 | node route | Study → practise → finish | result, same route | local / ⛔ progress write | TODO(error-code) |
| LP6 | node route | Back | map hub (filters kept) | none | — |

### Learning Path state transitions and absent paths

Node: `locked → available → current → completed` (force-unlock spends XP locally until
the server owns XP). Boss clears at ≥80% practice score. No Student catalog
create/delete/publish path (permissions forbid it); no XP/badge server event; no
Assignment-grade transition. Missing contracts: catalog path read, curriculum read,
self-study progress read/write — all under API_STUDENT §83.
