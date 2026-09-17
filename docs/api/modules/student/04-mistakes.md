---
module: student-mistakes
status: implemented — Task B owner approval 2026-09-13
last_updated: 2026-09-14
---
# S-MSTK — Mistake notebook
## 0. Scope
Private practice history from real failed flashcard reviews and graded wrong attempt answers.
Task B extends the previous question-only notebook to include vocabulary failures.
Word-bank bookmarks alone never create mistakes.
## 1. Storage
Mongo user_mistakes; see ENTITY_USER_MISTAKE.md. No flashcard is inserted or copied.
## 2. Transport
GET /api/v1/student/mistakes?page=1&limit=20 returns flat data[] and meta pagination.
GET /api/v1/student/mistakes/review returns up to 50 needs_review items, oldest first.
POST /api/v1/student/mistakes/:id/review returns 200 { correct, status, version, explanation }.
No client creation endpoint. All routes student-only and token-owned.
## 3. DTO
Item: id, sourceType (flashcard|question), sourceId, status (needs_review|reviewed),
version (integer), eventAt (UTC ISO), lastReviewedAt (ISO|null), available (boolean),
prompt, pinyin (string|null), meaning (string|null), audioUrl (string|null),
options (array of {id,text}). Missing source: available=false and neutral prompt.
Review: {version: positive integer, recalled?: boolean, selectedOptions?: string[]}.
Flashcard requires recalled and forbids selectedOptions; question requires selectedOptions
and forbids recalled. Question keys never appear in list/session DTOs.
## 4. Invariants
INV-MSTK-01: token ownership in every read/write; foreign/missing/malformed id is same 404.
INV-MSTK-02: unique student/sourceType/sourceId; no flashcard or word-bank insertion.
INV-MSTK-03: flashcard rating 0 creates/reopens; bookmarks and successful first reviews do not.
INV-MSTK-04: only graded attempt answers with isCorrect=false enter question practice.
INV-MSTK-05: correct practice resolves; incorrect stays pending; state survives reload.
INV-MSTK-06: repeat reconciliation never reopens resolved mistakes; a later failure does.
INV-MSTK-07: stale version cannot resolve a newer failure or double-submit a review.
INV-MSTK-08: question correctness is evaluated server-side, same set comparison as Attempts.
## 5. Access
Student own only. Teacher/admin forbidden. No userId accepted in requests.
## 6. State
absent -> needs_review -> reviewed; wrong -> needs_review; later source failure -> needs_review.
## 7. Boundaries
Flashcard failure capture is awaited before completing its SRS write: a capture error returns
an error, never a successful review with a silently missing mistake. Capture references a
validated real card and authenticated rating event. Notebook practice changes only notebook
state, not official scores or SM-2 scheduling.
## 8. Recovery
Graded wrong answers are reconciled on notebook/session reads from PostgreSQL into Mongo.
This is an intentional derived-state write on GET; failure returns an error, no mock fallback.
Monotonic gradedAt per source prevents replay reopening. No cross-database transaction.
All eligible history is reconciled in bounded batches. Deleted sources remain unavailable.
## 9. Errors
MISTAKE_NOT_FOUND 404; MISTAKE_REVIEW_STALE 409; VALIDATION_ERROR 400;
AUTH_INSUFFICIENT_ROLE 403. Existing authentication errors unchanged.
## 10. Side effects
No XP, badges, notifications, official score changes, new flashcards or bookmarks.
## 11. Indexes
Unique (userId,sourceType,sourceId); (userId,status,eventAt).
## 12. Rollout
Additive Mongoose collection/indexes; no seed or historical SRS guesswork.
Historical graded wrong answers reconcile on read; historical flashcard ratings are not stored
and cannot be reconstructed reliably.
## 13. Security
No answers from in-progress/submitted attempts exposed. Missing sources cannot be practiced.
## 14. Observability
Errors propagate through existing exception filter. No answer/token logging.
## 15. Verification
Real lifecycle e2e: rate 0, dedupe, right/wrong, later failure, reload, student isolation,
teacher 403, anonymous 401, graded-only source, stale version; production page + responsive QC.
## 16. Limits
Writing has no binary correctness and is excluded. Notebook practice is independent of SRS.

Teacher score overrides do not redefine binary correctness: eligibility follows the stored
`isCorrect=false` flag after final grading. Official points remain in the grading domain.
Reconciliation is batched for memory, but reads all eligible history on each visit; no claim
of constant-time synchronization or historical flashcard backfill is made.
