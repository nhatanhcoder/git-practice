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
        ├── Xem bài học → chi tiết bài học    GET /api/v1/student/classes/:classId/lessons/:lessonId
        │   ▼
        │   /student/classes/[classId]/lessons/[lessonId]  Lesson detail (S-LESSON-2)
        └── Rời lớp → Modal xác nhận          DELETE /api/v1/student/classes/:id/leave
```

## 2b. Assignments branch

```text
/student  Dashboard
│
└── Sidebar: Bài tập
    ▼
    /student/assignments  Bài tập đã phát hành  GET /api/v1/student/assignments
    ├── Lọc theo lớp → same screen              local filter (options from GET /student/classes)
    └── Mở chi tiết → ⛔                         GET /student/assignments/:id unimplemented —
                                                rows deliberately have no navigation
```

## 3. Billing branch (S-BILL-1/2 — read-only)

```text
/student  Dashboard
│
└── Sidebar: Học phí
    ▼
    /student/invoices  Hóa đơn học phí           GET /api/v1/student/invoices
    ├── Chọn hóa đơn → chi tiết
    │   ▼
    │   /student/invoices/[invoiceId]            GET /api/v1/student/invoices/:id
    │   └── Back → danh sách
    └── (no mutating action — creation/payment/void are Admin-side, A-INV-2/5)
```

Ownership is in the query WHERE (`studentId` from the token, `status <> 'void'`), never a
`?studentId=` parameter — INV-BILLING-33. Money renders from the envelope; the FE subtracts
nothing (`outstandingAmount` is server-derived, INV-BILLING-16).

## 2c. Attempt take & result branch

```text
/student/assignments  Bài tập đã phát hành
│
└── Bắt đầu / Tiếp tục → attempt (POST creates or resumes)
    ▼
    /student/attempts/[attemptId]  Làm bài      GET /api/v1/student/attempts/:id
    ├── Trả lời → autosave (2s debounce)        PATCH /api/v1/student/attempts/:id/answers
    ├── Hết giờ → auto-submit (once)            POST /api/v1/student/attempts/:id/submit
    └── Nộp bài → confirm → result              POST /api/v1/student/attempts/:id/submit
        ▼
        /student/attempts/[attemptId]/result    GET /api/v1/student/attempts/:id/result
```

## 4. Note on Sổ tay lỗi sai (`S-MSTK`)

`/student/mistakes` (Sổ tay lỗi sai) and `/student/mistakes/review` are dedicated to diagnostic error review for questions answered incorrectly during homework assignments and CBT mock exams. They are separate from vocabulary flashcards (`/student/flashcards`). Backend error-collection endpoints will be defined in Sprint 4 (Assignments & Attempts); in the interim, `/student/mistakes` remains in prototype/demo mode without being conflated with flashcard SRS.

**2026-09-09 note (applies to every backend-less route)**: all production `UnavailableState`
branches now run **after** the page's hooks (the A05 placement; `WEB-023` fixed + regression
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
| 10 | `/student` | Bài tập | `/student/assignments` | GET published list | auth errors |
| 11 | `/student/assignments` | Lọc theo lớp | same | local (options: GET classes) | — |
| 12 | `/student` | Học phí | `/student/invoices` | GET own invoices | auth errors |
| 13 | `/student/invoices` | Chọn hóa đơn | `/student/invoices/[invoiceId]` | GET invoice detail | `INVOICE_NOT_FOUND`, `VALIDATION_ERROR` |
| 14 | `/student/classes/[classId]` | Xem bài học | `/student/classes/[classId]/lessons/[lessonId]` | GET lesson detail | `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`, `LESSON_NOT_FOUND`, `VALIDATION_ERROR` |
| 18 | `/student/assignments` | Bắt đầu / Tiếp tục | `/student/attempts/[attemptId]` | POST attempts (create or resume) | `ASSIGNMENT_NOT_FOUND`, `ASSIGNMENT_PAST_DUE`, `ATTEMPT_ALREADY_SUBMITTED` |
| 18 | `/student/attempts/[attemptId]` | Trả lời | same | PATCH answers (2s debounce) | `VALIDATION_ERROR`, `ATTEMPT_TIME_EXCEEDED`, `ATTEMPT_ALREADY_SUBMITTED` |
| 18 | `/student/attempts/[attemptId]` | Nộp bài / Hết giờ | `/student/attempts/[attemptId]/result` | POST submit | `ATTEMPT_ALREADY_SUBMITTED`, `ATTEMPT_NOT_OWNER` |
| 18 | `/student/attempts/[attemptId]/result` | Xem kết quả | same | GET result | `ATTEMPT_NOT_FOUND`, `ATTEMPT_NOT_OWNER` |

## Entity state transitions

- **Attempt**: `(none) → in_progress → submitted → graded`. Submit locks answers; grading is teacher-only; `graded` is terminal.
- **SRS**: `unseen → reviewed → scheduled → due → reviewed`. Again resets repetitions/interval; successful ratings advance them using canonical SM-2.
- **Enrollment**: `not_enrolled → active ⇄ dropped`. Leaving flips status to `dropped` (INV-CLASS-06); re-joining with valid code reactivates existing row to `active` and sets `rejoinedAt`.

## Missing endpoints

- ⛔ Save a word from content (S-SRS-6).
- ⛔ Manage/review the saved-word bank (S-SRS-7).
- ⛔ Assignment/Attempt mistake collection (S-MSTK) — the source data exists (Sprint 4 attempts), no collection contract.
- ⛔ Exam room / result + placement transport (S-SELF-7) — ADR-005 is a 0-byte stub (DOC-017).
- ⛔ Analytics response shapes — `GET /student/progress`(+`/chart`) paths are reserved in `API_STUDENT.md` but no module spec defines the payloads (F6.1/F6.2).
- ⛔ Gamification — XP, rank/level, streak calendar, badge unlocks, leaderboard aggregation/privacy (S-GAME-1..5, S-ANL-4).

## Blocked prototype branches — mapped 2026-09-12

Every route below exists in `apps/web` as a prototype and now has a Page Contract; none has an
approved backend, so no branch carries a live edge. Trees are omitted deliberately — with all
edges ⛔ there is no traversal to document beyond list → detail inside each feature.

| Branch | Contracts | Backend blocker |
|---|---|---|
| Sổ tay lỗi sai | [student-mistakes](./student-mistakes.md) | mistake collection (source data live via Sprint 4) |
| Phòng thi + kết quả | [student-exams](./student-exams.md) | ADR-005 stub (DOC-017) |
| Kiểm tra xếp cấp | [student-placement](./student-placement.md) | ADR-005 stub (DOC-017) |
| Tiến độ học tập | [student-progress](./student-progress.md) | analytics response shapes unapproved |
| Bảng xếp hạng | [student-leaderboard](./student-leaderboard.md) | aggregation + privacy rules |
| Kho huy hiệu | [student-badges](./student-badges.md) | server-authoritative unlocks |
| Luyện viết chữ | [student-writing](./student-writing.md) | DOC-011 corpus + progress contract |
| Ghép câu Lego | [student-lego](./student-lego.md) | DOC-011 corpus + progress contract |
| Mô phỏng công sở | [student-workplace](./student-workplace.md) | DOC-011 corpus + scorer unspecified |

Live branches with contracts: SRS (`student-srs`), Classes (`student-classes-list`,
`student-class-detail`), Assignments (`student-assignments-list`), Attempts
(`student-attempt-take`, `student-attempt-result`, PR #73), Invoices
(`student-invoices`, `student-invoice-detail`, PR #72), Notifications
(`student-notifications` — module 07 merged via PR #67).


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
