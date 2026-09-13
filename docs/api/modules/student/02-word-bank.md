---
module: student-word-bank
status: implemented (2026-09-12, branch `feat/student-word-bank`) — spec written and coded in the same owner-approved student completion wave that pinned the open transport decisions below.
blocked_by: none for this slice — review-from-word-bank reuses the SRS endpoints unchanged
owner: project owner (transport pinned in the 2026-09-12 wave approval)
last_updated: 2026-09-12
---

## 0. Summary

Each student's personal word bank (`kho từ`): click-to-save a word seen anywhere in the
learner area (S-SRS-6), then list, delete, and review those words (S-SRS-7). This module
closes the third open item of `01-srs-flashcards.md` §16 — that spec deliberately excluded
S-SRS-6/7 from its four-endpoint contract, and `ENTITY_USER_SAVED_WORD.md` is a ✅ Full
spec, so this module implements exactly that entity: no field is invented.

Boundary: the bank is a **bookmark list**, not an SRS state. Saving a word does NOT create
a `UserFlashcardState` (entity rule); reviewing banked words happens through the EXISTING
`POST /student/flashcards/:id/review` after this module's session endpoint returns the
banked cards as reviewable flashcard payloads — SM-2 stays owned by module 01, untouched.

## 1. Tables touched

| Collection | Read/Write | Notes |
|---|---|---|
| `user_saved_words` | Read/Write | One private bank row per `(userId, hanzi)` |
| `flashcards` | Read | Join-by-id only, to hydrate a banked word into the review payload |

MongoDB only — no Postgres table, no Prisma migration (the `userId` is the PG User uuid
carried as a string, same convention as `user_flashcard_states`).

## 2. Endpoints

All under `/api/v1/student/word-bank`, all `role=student`, ownership = authenticated
`userId` only (INV-WB-03).

| Method | Path | Description | Status |
|---|---|---|---|
| POST | `/api/v1/student/word-bank` | Save one word (upsert on duplicate) | defined |
| GET | `/api/v1/student/word-bank` | List my saved words, newest first, paginated | defined |
| DELETE | `/api/v1/student/word-bank/:id` | Remove one saved word from my bank | defined |
| GET | `/api/v1/student/word-bank/review` | My banked words as reviewable card payloads (S-SRS-7 session start) | defined |

Not defined, on purpose: bulk import/export, share, notes editing via API (`note` rides on
save only), teacher/admin visibility of a student's bank. None has a feature behind it.

## 3. DTO

Save request:

| Field | Type | Required | Validation |
|---|---|---|---|
| `hanzi` | string | yes | 1–20 chars after trim; must contain at least one CJK char (a bookmark of `hello` is a client bug, not a word) |
| `pinyin` | string | yes | 1–50 chars after trim |
| `meaning` | string | yes | 1–200 chars after trim |
| `sourceType` | `'lesson' \| 'passage' \| 'flashcard_browser' \| 'other'` | yes | the four entity values, no invention |
| `sourceId` | string | no | ≤ 100 chars |
| `note` | string | no | ≤ 500 chars |

Save response `201` (both first save and re-save): the upsert is one atomic operation
with an identical body either way (the row with a bumped `savedAt`), so the status does
not distinguish them — a dynamic status would need an injected `@Res`, which bypasses the
envelope interceptor. The FE re-optimizes its button state from the response row, not
from the status.

List query: `page` ≥ 1 default 1; `limit` 1–100 default 50 (a bank is a page-at-a-time
list, not a dashboard). Response: `{ data: [...], meta: { total, page, limit, totalPages } }`,
sorted `savedAt DESC, _id DESC` for stable pagination.

Delete: `204` on success; the id is MY row id — a foreign id is a bare
`WORD_BANK_NOT_FOUND` 404 (existence probing must not be possible — same reasoning as
module 07 §5).

Review response: array of card payloads shaped **exactly** like module 01's card DTO
(`id` = the joined flashcard's id when a catalog match exists), so the existing review
screen and `POST /student/flashcards/:id/review` accept them unchanged. A banked word with
NO catalog match is returned with `id: null` and is listed as unreviewable — the client
must not send it to the review endpoint (INV-WB-07). Ordering: newest save first, cap 100.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-WB-01 | Every row is scoped to the authenticated student; no endpoint accepts `userId` |
| INV-WB-02 | `(userId, hanzi)` is unique — a second save of the same hanzi updates `savedAt`/`note`/`meaning` and creates no second row |
| INV-WB-03 | A student sees and deletes only their own rows; a foreign row id is a 404, never a 403 |
| INV-WB-04 | `hanzi`/`pinyin`/`meaning` are copied at save time (entity rule) — a later catalog edit never rewrites a banked word |
| INV-WB-05 | `sourceType` ∈ the four entity values; nothing else is ever written |
| INV-WB-06 | Saving never creates or mutates a `UserFlashcardState` |
| INV-WB-07 | The review endpoint hydrates only through existing catalog `flashcards`; a banked word with no catalog match is `id: null` and must not reach SM-2 |
| INV-WB-08 | Deleting a banked word never deletes or resets its `UserFlashcardState` — bank membership and SRS progress are independent facts |

## 5. Ownership / RBAC

`@Roles('student')` on the controller + `userId === currentUser.id` in every service
query (the guard proves the caller is *a* student; the service proves *which* student's
bank). No admin/teacher route exists — the bank is private (entity: "personal word bank").

## 6. State machine

None beyond membership: `not-saved → saved` on save (upsert), `saved → not-saved` on delete.
No soft delete — the entity defines none; a re-save after delete is a fresh row (new `id`).
`savedAt` bumps on every upsert (entity rule) — it is "last bookmarked", not "first".

## 7. Transaction boundary

MongoDB only, single-document operations throughout: save = one `findOneAndUpdate` with
`upsert: true` (atomic under the unique index, INV-WB-02's enforcement point); delete = one
`findOneAndDelete` scoped by `(userId, id)`; list/review = reads. No cross-store writes, so
DEBT-001's cross-DB caveat does not apply.

## 8. Idempotency & concurrency

Save is idempotent **by content**: the same `(userId, hanzi)` twice yields one row (the
unique index is the guarantee — two concurrent first-saves race, one upserts, the other
either matches the new row or its own upsert updates it; no 409 exists for saves, per the
entity's upsert rule). Delete is idempotent by absence: deleting an already-deleted id is a
404 (nothing to name). No Idempotency-Key header (API_CONVENTIONS defines none).

## 9. Error → code mapping

| Error branch | HTTP | Code | Registry status |
|---|---:|---|---|
| Malformed body / non-CJK hanzi / bad `sourceType` | 400 | `VALIDATION_ERROR` | exists |
| Delete: id not found OR not mine | 404 | `WORD_BANK_NOT_FOUND` | **new — registered 2026-09-12** with this module |
| Non-Student caller | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |
| Review: none saved | 200 | `data: []` — an empty bank is a fact, not an error | — |

## 10. Side effects & notifications

None. No XP, no badge, no notification, no SRS write (INV-WB-06/08). The module is a pure
bookmark store; gamification hooks arrive with their own contracts (wave slice 4).

## 11. Index & query

```
user_saved_words: { userId: 1 }                     — list + review hydration
user_saved_words: { userId: 1, hanzi: 1 } unique    — INV-WB-02, the upsert's guard
```

Both from the entity spec verbatim. List pages via `skip/take` + `countDocuments` in one
`Promise.all` (same snapshot discipline as module 01's browse).

## 12. Migration & seed

Mongoose creates the collection and indexes on first use (`autoIndex` builds the unique
compound); no Prisma migration, no seed rows — a personal bank starts empty by definition.
Tests create and remove their own words.

## 13. Security & rate limit

JWT + role guard; never return another student's rows; `note` is user-authored free text —
rendered as text only (React default escaping), never as HTML, and never logged at info
level. A save-rate limit should arrive before public deployment; no value is approved yet
(same open item as module 01 §13).

## 14. Observability

Count saves by `sourceType` (which surfaces do students actually bookmark from), duplicate
upserts vs fresh saves, and bank sizes at p50/p95 (input for the review cap). Do not log
`note` contents.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-WB-01 | e2e | second student's list shows zero of the first's words; save/list/delete accept no `userId` field |
| INV-WB-02 | e2e | save the same hanzi twice → one row, `savedAt` bumped, `meaning` updated |
| INV-WB-03 | e2e | student A deletes B's row id → 404 `WORD_BANK_NOT_FOUND`, B's row still present in the DB |
| INV-WB-04 | e2e | save with catalog-edit-independent copy: mutate the catalog row afterwards → banked `meaning` unchanged |
| INV-WB-05 | e2e | `sourceType: "dashboard"` → 400 `VALIDATION_ERROR` |
| INV-WB-06 | e2e | save a word → `user_flashcard_states` count for that student unchanged |
| INV-WB-07 | e2e | review endpoint: banked word WITH catalog match returns a real card id; a fabricated hanzi with none → `id: null` |
| INV-WB-08 | e2e | delete a banked word that has SRS state → the state row survives |
| INV-WB-03 (shape) | e2e | non-student token → 403 `AUTH_INSUFFICIENT_ROLE` |
| envelope | e2e | list response carries flat `{ data, meta }`; dates ISO 8601 |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| In-place `note` editing (PATCH) | a note-editing affordance beyond re-save | product owner | when S-SRS-7 FE needs it — re-save already covers it |
| Save-rate limit value | public-deployment readiness | API owner | before production traffic |
| Banked-word review cap > 100 | longer sessions for large banks | product owner | only when p95 bank size (§14) says so |
| "Click any word in lesson/passage content" (S-SRS-6's full surface) | needs the lesson-content screens (wave slice 5/6) — this slice ships the `flashcard_browser` surface, the first live one | product owner | as content screens land |
