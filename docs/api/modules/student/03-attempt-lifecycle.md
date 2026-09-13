---
module: student-attempt-lifecycle
status: proposed — owner-approved to code 2026-09-12 (Sprint 4 wave, AI re-open recorded in §16-Q0)
blocked_by: none — AI-suggest unparked by the same approval (writes only the two AI fields, INV-ATLP-11)
owner: project owner
last_updated: 2026-09-12
---

## 0. Summary

The student side of attempts (S-ASGN-2..S-ASGN-7): start one official attempt per published
assignment, auto-save answers every 2s, submit (server grades MCQ on the spot), and read the
result. The teacher side (queue/detail/grade + AI suggest) lives in teacher module
`04-attempts-grading.md`; this module owns the lifecycle up to `submitted` and the result
read. No endpoint, field or error code is invented: all five paths already exist in
`API_STUDENT.md`, fields come from `ENTITY_ATTEMPT.md` / `ENTITY_ATTEMPT_ANSWER.md`, codes
from the agreed registry.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Attempt` | Read/Write | start creates; submit writes status/scores; result reads |
| `AttemptAnswer` | Read/Write | autosave upserts; submit writes `autoScore`/`isCorrect` |
| `Assignment` | Read | published + enrollment gate, `questionIds` order, `timeLimitMinutes`/`dueDate` |
| `ClassEnrollment` | Read | active-enrollment gate (same join as S-ASGN-1) |
| `questions` (MongoDB) | Read | MCQ grading join on `correctAnswer`; take/detail payload join (stripped) |

## 2. Endpoints

All under `/api/v1`, all `role=student`. All five already exist in `API_STUDENT.md`.

| Method | Path | Description | Status |
|---|---|---|---|
| POST | `/student/assignments/:id/attempts` | Start (or re-enter) the official attempt | defined |
| GET | `/student/attempts/:id` | Attempt state + questions (take payload) | defined |
| PATCH | `/student/attempts/:id/answers` | Auto-save one answer (upsert) | defined |
| POST | `/student/attempts/:id/submit` | Submit + server-side MCQ grading | defined |
| GET | `/student/attempts/:id/result` | Graded/result view (own only) | defined |

## 3. DTO

**Start** — no body. Response `201` always (first start and re-entry share one body with a
`resumed` flag — a dynamic status would need `@Res`, which bypasses the envelope
interceptor; same rule as word-bank saves):
`{ data: { attempt, questions[], serverNow } }`. `questions[]` follows
`Assignment.questionIds` order and strips `correctAnswer`/`explanation` (INV-ATLP-07);
each carries the student's existing answer (if any) for reload survival. `serverNow` (UTC
ISO) anchors the client countdown.

**Autosave** — `{ questionId, selectedOptions?, writtenAnswer? }`. Response `200` the
upserted answer row (stripped shape, no scores yet).

**Submit** — no body. Response `200` the submitted attempt (`submittedAt` set, MCQ answers
scored, `totalScore` per INV-ATLP-06).

**State / result** — `200` attempt + answers. `correctAnswer` appears only when
`status = graded` (INV-ATLP-07).

List query: none. Pagination: none (one attempt per assignment).

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-ATLP-01 | Start requires a `published` assignment in an actively-enrolled class; otherwise `404 ASSIGNMENT_NOT_FOUND` (no existence probing across classes) |
| INV-ATLP-02 | One official attempt: an existing `in_progress` row is returned (`201` + `resumed: true`, reload-safe); `submitted`/`graded` → `409 ATTEMPT_ALREADY_SUBMITTED`. The partial unique index `(assignmentId, studentId) WHERE isOfficialGrade` is the race guard |
| INV-ATLP-03 | Start past `dueDate` → `400 ASSIGNMENT_PAST_DUE` (`dueDate` gates start only) |
| INV-ATLP-04 | Autosave writes only `in_progress` + own attempt; `questionId` must belong to the assignment's `questionIds`, else `400`; upsert on `(attemptId, questionId)` |
| INV-ATLP-05 | The time limit is enforced server-side (no scheduler — ADR-006 is an empty stub): autosave past `startedAt + timeLimitMinutes` writes nothing and answers `400 ATTEMPT_TIME_EXCEEDED` (registry status; the client refetches state); submit past the deadline runs the normal submit path (the submit IS the finalization) and the row records a server-side submission |
| INV-ATLP-06 | Submit grades MCQ server-side: `autoScore` = full share on exact set-match of `selectedOptions` vs `correctAnswer`, else 0; `isCorrect` set; writing stays null. Unit scale (§16-Q7): each answer is worth 1 point, `maxScore` = question count, `totalScore` = Σ finals — set only when every answer is final (MCQ-only assignments complete at submit; mixed stay null until grading) |
| INV-ATLP-07 | Take/state payloads never carry `correctAnswer`/`explanation`; result reveals `correctAnswer` only at `graded` (S-ASGN-8 review) |
| INV-ATLP-08 | Another student's attempt → `403 ATTEMPT_NOT_OWNER` (student-lane code per 04 §5); nonexistent id → `404 ATTEMPT_NOT_FOUND` |
| INV-ATLP-09 | `submitted` locks everything: autosave → `409 ATTEMPT_ALREADY_SUBMITTED`; re-submit (submitted or graded) → `409 ATTEMPT_ALREADY_SUBMITTED` |
| INV-ATLP-10 | Autosave accepts the payload shape only — `{questionId, selectedOptions?, writtenAnswer?}`; unknown fields rejected by the global whitelist pipe |
| INV-ATLP-11 | AI writes nothing in this module. `aiSuggestedScore`/`aiFeedback` are written exclusively by teacher `04-attempts-grading.md` INV-TGRD-06 (suggestion-only, writing answers, attempt stays `submitted`) |

## 5. Ownership / RBAC

`@Roles('student')` on the controller + `studentId === currentUser.id` in every service
query (guard proves *a* student; service proves *which*). Attempt reads additionally join
the enrollment gate at start; state/result/answers re-check ownership per call (the
enrollment may have lapsed — a dropped student keeps past attempts per PERMISSIONS_STUDENT,
so reads stay open to the owner). Teacher/admin have no route here (04 owns grading).

## 6. State machine

```
(none) ──(POST attempts)──► in_progress ──(POST submit / deadline)──► submitted ──(teacher grade, module 04)──► graded
```

`in_progress` accepts autosave; `submitted` is locked; `graded` is terminal (no re-grade
offered — 04 §16-Q4). Drill attempts (`isOfficialGrade = false`) are out of scope.

## 7. Transaction boundary

Postgres only. Start: 1 attempt INSERT (+ unique-index race → 409). Submit: N answer
UPDATEs (autoScore/isCorrect) + 1 attempt UPDATE in one transaction — partial scoring must
never commit. Autosave: single upsert. No cross-store writes (Mongo is read-only here), so
DEBT-001 does not apply.

## 8. Idempotency & concurrency

Start is idempotent-by-existence (INV-ATLP-02; the unique index settles races). Autosave is
idempotent per answer row. Submit twice → second is 409 (INV-ATLP-09), never a double grade.
No Idempotency-Key header (API_CONVENTIONS defines none). Client rules (request-seq drop,
ref-lock single POST, no auto-replay) live in `lib/student/attempt-session.ts`, mirroring
`srs-session.ts` — the endpoint has no idempotency key, so a replayed submit after an
ambiguous failure is the caller's risk to avoid, not the server's to dedupe.

## 9. Error → code mapping

| Error branch | HTTP | Code | Registry status |
|---|---|---|---|
| Assignment not published / not enrolled | 404 | `ASSIGNMENT_NOT_FOUND` | exists |
| Start past `dueDate` | 400 | `ASSIGNMENT_PAST_DUE` | exists |
| Autosave past the time limit | 400 | `ATTEMPT_TIME_EXCEEDED` | exists |
| Nonexistent attempt | 404 | `ATTEMPT_NOT_FOUND` | exists |
| Another student's attempt | 403 | `ATTEMPT_NOT_OWNER` | exists |
| Re-start submitted/graded; edit/submit locked attempt | 409 | `ATTEMPT_ALREADY_SUBMITTED` | exists |
| Autosave past the time limit | 409 | `ATTEMPT_TIME_EXCEEDED` | exists |
| Malformed body / foreign questionId | 400 | `VALIDATION_ERROR` | exists |
| Non-student caller | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |

No new code. `AI_*` codes stay owned by module 04 (unparked 2026-09-12, still registry-proposed).

## 10. Side effects & notifications

Submit writes no notification (the teacher's queue is the surface). `graded` notification is
module 04 INV-TGRD-07. No XP/badge writes (gamification has no contract).

## 11. Index & query

```
AttemptAnswer: { attemptId: 1 }                       — answers fetch
AttemptAnswer: { attemptId: 1, questionId: 1 } unique — INV-ATLP-04, the upsert's guard
Attempt: existing (assignmentId), (studentId), (status) — start lookup, guards
questions: existing `_id` index — grading join via single $in (N+1 forbidden)
```

Submit reads: attempt + assignment (limits, questionIds) + answers + questions — 3 indexed
reads, then 1 transaction.

## 12. Migration & seed

One migration: `AttemptAnswer` per `ENTITY_ATTEMPT_ANSWER.md` (all 13 data columns incl. the
AI/teacher columns module 04 writes — entity-complete now to avoid a second migration),
`@@unique([attemptId, questionId])`, `@@index([attemptId])`, FK `attemptId → Attempt.id`
`onDelete: Cascade` (attempt cascade already removes students/classes/assignments).
No seed rows — attempts are user-created by definition. e2e creates and cascades its own.

## 13. Security & rate limit

`correctAnswer`/`explanation` never leave the server for students before `graded` (take and
pre-grade result strip them — a leaked key invalidates every future attempt on a shared
question). `writtenAnswer` is student-authored text — rendered as text, never logged.
No per-endpoint rate limit approved (same open item as modules 01/02-WB).

## 14. Observability

Count starts/submits/autosaves per assignment (load shape for the 2s-autosave path),
timeout-finalized submits, MCQ auto-score distribution. Do not log answer contents.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-ATLP-01 | e2e | start on draft / unenrolled class → 404; student B cannot start on class-A assignment |
| INV-ATLP-02 | e2e | start twice → same row (`200` second time); submitted → 409; concurrent double-start → one row |
| INV-ATLP-03 | e2e | start past `dueDate` → 400 `ASSIGNMENT_PAST_DUE` |
| INV-ATLP-04 | e2e | autosave upserts same row; foreign questionId → 400; another student's attempt → 403 |
| INV-ATLP-05 | e2e | mock_test `timeLimitMinutes: 1` + real 65s wait → autosave 400 `ATTEMPT_TIME_EXCEEDED`, state `submitted` after the finalizing submit; late submit finalizes |
| INV-ATLP-06 | e2e | submit scores exact-match MCQ (share/0), writing null; MCQ-only sets `totalScore`; mixed stays null |
| INV-ATLP-07 | e2e | take payload has no `correctAnswer`; pre-grade result hides it; graded result shows it |
| INV-ATLP-08 | e2e | B reads A's attempt → 403 `ATTEMPT_NOT_OWNER`; random uuid → 404 |
| INV-ATLP-09 | e2e | autosave/re-submit after submit → 409; answers immutable in DB |
| INV-ATLP-10 | unit | whitelist rejects unknown fields |
| INV-ATLP-11 | e2e | full lifecycle writes zero AI columns (all null until module 04 acts) |
| DoD | e2e+browser | timeout auto-submit → teacher grades writing (manual score) → student result shows total |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q0. **AI-suggest unparked 2026-09-12** by owner order on this wave ("AI suggest (gợi ý only)"). 04 §16-Q1's "explicit re-open" is that order — recorded here so nobody re-litigates. `AI_*` codes remain registry-proposed; using them rides this approval. | 04 §3.3 build | PO | done (this approval) |
| Q7. **Unit scale decided here**: 1 point per answer, `maxScore` = question count. The entities give no per-question max (04 §16-Q2 open); equal unit weight is the only scale-free reading of "totalScore = sum of final scores". If weighted scoring is wanted, it needs a model field first. | INV-ATLP-06, FE score display | PO | locked unless reopened with a field |
| ADR-005 is a 0-byte stub yet is cited for server-authoritative scoring. This module proceeds on the entities + 04 instead; the stub needs content or its citations need rerouting. | citation hygiene | doc owner | anytime (non-blocking) |
| Re-entry response shape (`201` + `resumed`, fixed status for envelope safety) and `serverNow` are wire details inside an already-listed endpoint — no new paths. | — | — | locked |
