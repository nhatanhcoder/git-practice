---
status: active
last_updated: 2026-09-16
---

# 🔌 API Student

> Endpoints reserved for the Student role.  
> Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)  
> Permissions: [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)

All routes require: `Authorization: Bearer <token>` + `role=student`

> **Scope decision — ADR-016:** Student supports both class learning and personal self-study.
> Teachers may select platform catalog units as supplemental practice. Completion is personal
> progress unless the unit is wrapped in an Assignment/Attempt.

---

## Classes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/student/classes/join` | Join class via enrollmentCode |
| GET | `/api/v1/student/classes` | List enrolled classes |
| GET | `/api/v1/student/classes/:id` | Class detail |
| GET | `/api/v1/student/classes/:classId/lessons/:lessonId` | Lesson detail — caller must be actively enrolled in `:classId`; lesson must belong to `:classId` (S-LESSON-2) |
| DELETE | `/api/v1/student/classes/:id/leave` | Leave class (status=dropped) |

---

## Assignments & Attempts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/assignments` | List assignments in enrolled classes |
| GET | `/api/v1/student/assignments/:id` | Assignment detail |
| POST | `/api/v1/student/assignments/:id/attempts` | Start attempt |
| GET | `/api/v1/student/attempts/:id` | Get attempt state |
| PATCH | `/api/v1/student/attempts/:id/answers` | Auto-save answers |
| POST | `/api/v1/student/attempts/:id/submit` | Submit attempt |
| GET | `/api/v1/student/attempts/:id/result` | View graded result + feedback |
| GET | `/api/v1/student/assignments/:id/attempt` | Resolve my attempt for an assignment (id + status) |

---

## SRS Flashcards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/flashcards?hskLevel=3` | Browse flashcards by HSK level |
| GET | `/api/v1/student/flashcards/due` | Get cards due for review today |
| POST | `/api/v1/student/flashcards/:id/review` | Submit review rating (again/hard/good/easy) |
| GET | `/api/v1/student/flashcards/stats` | SRS stats: streak, due count, retention |

---

## Foundation

Implemented 2026-09-16 (module `02-foundation-grammar.md`, branch
`feat/student-foundation-be`). Read-only versioned catalog + own studied-state.
`kind` ∈ `pinyin|tones|sandhi|radicals|listening|speaking` (`pdfs` are descriptors
only — nothing to mark, no studied-state).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/foundation` | Whole catalog: `{ revision, groups }` (8 groups, source fields verbatim) |
| GET | `/api/v1/student/foundation/progress` | Own studied-state list (absent = never studied) |
| PUT | `/api/v1/student/foundation/progress` | Explicit idempotent set `{ kind, key, studied }` |

## Grammar

Implemented 2026-09-16 (same module/branch). Browse + own studied-state +
reorder practice. Media (audio/PDF) intentionally absent (D4).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/grammar?hskLevel=&category=&search=&page=&limit=` | Paginated list, stable order (level asc, id asc); `tokens` never served |
| GET | `/api/v1/student/grammar/:id` | Grammar detail, no `tokens` (`GRAMMAR_NOT_FOUND` 404 when absent) |
| GET | `/api/v1/student/grammar/progress` | Own studied-state + per-point practice counts |
| PUT | `/api/v1/student/grammar/progress` | Explicit idempotent set `{ grammarId, studied }` |
| GET | `/api/v1/student/grammar/:id/practice` | Reorder exercise: prompt + deterministically shuffled tokens |
| POST | `/api/v1/student/grammar/:id/practice` | Submit `{ submissionId, answer }`; server grades, idempotent retry (`GRAMMAR_PRACTICE_CONFLICT` 409 on conflict) |

---

## Progress & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/progress` | Heatmap + skill breakdown |
| GET | `/api/v1/student/progress/chart` | Score over time chart data |
| GET | `/api/v1/student/leaderboard` | Anonymized official-grade ranking (top 20 + caller) |
| GET | `/api/v1/student/badges` | Caller-owned server-computed attempt badge catalog |

---

## Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/student/invoices` | List own invoices |
| GET | `/api/v1/student/invoices/:id` | Invoice detail + payment history |

---

## Notifications

Implemented 2026-09-12 (module 07, branch `feat/student-notifications`). Any authenticated
role reads **its own** mailbox, so the paths are role-agnostic (`/api/v1/notifications`, per
`07-notifications.md` §2 — not student-prefixed; the student mailbox is the same handler every
role calls). Full contract: `docs/api/modules/07-notifications.md`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications` | List one's own notifications — paginated, newest first; optional `?isRead=`/`?type=` filters |
| GET | `/api/v1/notifications/unread-count` | Unread count for the bell badge |
| PATCH | `/api/v1/notifications/:id/read` | Mark one as read — idempotent no-op when already read |
| PATCH | `/api/v1/notifications/read-all` | Mark every unread row of mine as read |

---

## Accepted capabilities with no endpoint contract yet

The following capabilities are part of the product domain, but no path, DTO, error code or
module invariant has been approved. They are listed here to prevent FE mock routes from being
mistaken for API contracts:

- learning catalog and curriculum paths;
- teacher-selected supplemental practice and completion visibility;
- character writing, Lego and workplace progress;
- platform mock exams (F13 papers — `/student/exams` is served from `mock_test` assignments +
  the attempt lifecycle meanwhile); placement moved to its own module on 2026-09-13
  (`modules/student/04-placement.md`: `GET/POST /student/placement`);
- XP, named ranks and streaks; leaderboard and four attempt badges moved to module `05-gamification-analytics.md`;
- display preferences and cross-device progress sync.

⛔ Define these in Student/Teacher module specs before adding endpoints. Do not copy the
prototype's `/api/progress` routes into production by default.

### Foundation / Grammar review package

[Module proposal](modules/student/02-foundation-grammar.md) and
[source audit](modules/student/foundation-grammar-source-audit.md), 2026-09-10;
transport/DTO/errors approved 2026-09-16 (D1–D5), implemented on
`feat/student-foundation-be`; reorder practice added by the option-A port
(`feat/student-grammar-practice-port`). M-read (media) remains intentionally
undefined — no endpoint, no code.

## Mistake notebook — approved Task B

GET /api/v1/student/mistakes; GET /api/v1/student/mistakes/review; POST /api/v1/student/mistakes/:id/review. Full DTO, ownership and lifecycle: [04-mistakes](modules/student/04-mistakes.md).

## Vocabulary learning path — approved 2026-09-15

See [module contract](modules/student/05-learning-path.md). GET `/student/learning-path`, GET `/:slug`, POST `/:slug/start`, `/:slug/study`, `/:slug/answers`, `/:slug/complete`. Student-owned progress; no XP or official grades.

GET /student/learning-path/:slug
POST /student/learning-path/:slug/start
POST /student/learning-path/:slug/study
POST /student/learning-path/:slug/answers
POST /student/learning-path/:slug/complete
