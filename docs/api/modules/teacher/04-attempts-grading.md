# MODULE SPEC — Teacher 04: Attempts + Grading

---
module: teacher-attempts-grading
status: proposed
blocked_by: AI-suggest implementation pending owner decision (2026-09-03) · per-question max score not modeled
owner: BE owner (unset)
last_updated: 2026-09-03
---

> The AI-suggest endpoint is **specced but deliberately parked** (owner decision 2026-09-03:
> "pending"). Its contract is written so it can be built later without touching the rest of
> the module. Everything else is implementable now.

## 0. Summary

The teacher's grading surface: the queue of submitted attempts for the teacher's own
assignments, the attempt detail with per-question answers (joined with MongoDB question
data), submitting final grades + feedback, and the (parked) Gemini AI suggestion for Writing
answers.

Sources, verbatim: `API_TEACHER.md` § Grading, `ENTITY_ATTEMPT.md`,
`ENTITY_ATTEMPT_ANSWER.md`, `ENTITY_QUESTION.md`, `ENTITY_NOTIFICATION.md` (`graded`),
`RBAC_MATRIX.md`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Attempt` | R+W | queue/detail read; status + scores written at grade |
| `AttemptAnswer` | R+W | teacherScore / teacherFeedback written at grade |
| `Assignment` | R only | ownership chain |
| `questions` (MongoDB) | R only | question payload in detail |
| `Notification` | W only | `graded` to the student |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/teacher/attempts?status=submitted` | teacher (own) | Grading queue — attempts on own assignments, by status | defined |
| GET | `/teacher/attempts/:id` | teacher (own) | Attempt + answers (+ question data) | defined |
| POST | `/teacher/attempts/:id/ai-suggest` | teacher (own) | Gemini score suggestion for Writing answers | defined — **parked, §16-Q1** |
| PATCH | `/teacher/attempts/:id/grade` | teacher (own) | Submit grades + feedback → attempt `graded` | defined |

## 3. DTO

### 3.1 GET `/teacher/attempts` — queue

Query: `?status=submitted|graded` (default `submitted`) · `?assignmentId=` · `?classId=` ·
`?page=&limit=`. Ownership filter is implicit: `attempt.assignment.teacherId === currentUser`.

Row + `meta`:

```json
{ "id": "uuid", "assignmentId": "uuid", "assignmentTitle": "…", "classId": "uuid",
  "className": "…", "studentId": "uuid", "studentName": "…",
  "status": "submitted", "startedAt": "…", "submittedAt": "…",
  "totalScore": null, "maxScore": 100 }
```

`studentName` reads `User.nickname` (C1 — §16-Q6).

### 3.2 GET `/teacher/attempts/:id` — detail

Attempt fields + `answers[]`, one per question, in `Assignment.questionIds` order:

```json
{ "data": { "id": "uuid", "assignmentId": "uuid", "studentId": "uuid", "status": "submitted",
    "startedAt": "…", "submittedAt": "…", "gradedAt": null,
    "totalScore": null, "maxScore": 100, "isOfficialGrade": true,
    "answers": [
      { "questionId": "68a1…", "skill": "writing", "subType": "essay",
        "prompt": "…", "rubric": "…", "options": null,
        "selectedOptions": null, "writtenAnswer": "…",
        "autoScore": null, "teacherScore": null, "teacherFeedback": null,
        "aiSuggestedScore": null, "aiFeedback": null, "isCorrect": null }
    ] } }
```

Question fields (`skill`, `subType`, `prompt`, `rubric`, `options`) are joined from MongoDB at
read time. `correctAnswer` and `explanation` are **not** returned to the student lane; for
the teacher they are part of grading context — this module returns them (teachers authored
them).

### 3.3 POST `/teacher/attempts/:id/ai-suggest` — parked

Request: `{ "questionIds": ["68a1…"] }` — the Writing questions to suggest for (default: all
Writing answers of the attempt). Response: the answer rows with `aiSuggestedScore` +
`aiFeedback` filled. Behavior, status and error surface are specced in §4 INV-TGRD-06 and
§9, but **the implementation is parked** pending the owner's Gemini decision (§16-Q1).

### 3.4 PATCH `/teacher/attempts/:id/grade` — request

```json
{ "grades": [
    { "questionId": "68a1…", "teacherScore": 8.5, "teacherFeedback": "…" },
    { "questionId": "68a2…", "teacherScore": 7 }
  ] }
```

Every element must reference an answer of this attempt. `teacherScore ≥ 0` (upper bound —
§16-Q2). Missing answers keep their current values. Response: the updated attempt
(`status: "graded"`, `totalScore` set).

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-TGRD-01 | Ownership is two hops: `attempt → assignment → teacherId === currentUser.id`, checked in the service layer. Not the caller's attempt → `404 ATTEMPT_NOT_FOUND` (do not leak existence across teachers; see §16-Q5 for 403-vs-404). |
| INV-TGRD-02 | The queue returns only attempts on the caller's assignments; `?status=` filters `Attempt.status`; without it, default `submitted`. |
| INV-TGRD-03 | Grading requires `Attempt.status = submitted`. An `in_progress` attempt → `400 ATTEMPT_NOT_IN_PROGRESS` semantics do **not** fit — correct mapping: `400` with `ATTEMPT_NOT_IN_PROGRESS` is the student-lane code for editing; here the branch is: grade a non-submitted attempt → `409 ASSIGNMENT_ALREADY_SUBMITTED`? ⛔ **no clean code** — see §9/§16-Q3. |
| INV-TGRD-04 | `teacherScore ≥ 0` per graded answer; no upper bound is enforced because **per-question max score is not modeled** (§16-Q2). The AI suggestion never writes `teacherScore`/`teacherFeedback` — those are the teacher's alone (ENTITY_ATTEMPT_ANSWER: "teacherScore is the final authoritative score; AI score is suggestion only"). |
| INV-TGRD-05 | Finishing a grade writes, in ONE transaction: the `AttemptAnswer.teacherScore`/`teacherFeedback` values, `Attempt.status = 'graded'`, `Attempt.gradedAt = now()`, `Attempt.totalScore = Σ COALESCE(teacherScore, autoScore)` over all answers of the attempt (ENTITY_ATTEMPT: "totalScore = sum of final scores"). |
| INV-TGRD-06 | `ai-suggest` (parked): writes **only** `aiSuggestedScore` + `aiFeedback` on Writing answers (`skill = 'writing'`); never touches `teacherScore`, `teacherFeedback`, `autoScore`, or attempt status; requires `Attempt.status = 'submitted'`. Codes `AI_QUOTA_EXCEEDED` / `AI_KEY_INVALID` / `AI_GRADING_FAILED` — *proposed, not agreed*. |
| INV-TGRD-07 | On grade commit, exactly one `graded` Notification is inserted for the student (referenceType `attempt`) in the same transaction (ENTITY_ATTEMPT: "On graded → triggers graded Notification"). |
| INV-TGRD-08 | The teacher never writes `autoScore`, `selectedOptions`, `writtenAnswer`, `startedAt`, `submittedAt`, `studentId`, `isOfficialGrade` — grade is the only write surface, limited to §3.4 fields. |

## 5. Ownership / RBAC

```
Teacher   attempt.assignment.teacherId === req.user.id   (service layer)
Student   ❌ (the student's own attempt read lives in the student lane — ATTEMPT_NOT_OWNER there)
Admin     ❌
```

`RBAC_MATRIX.md`: `Attempt grade = 🔒 Teacher`, `Attempt read (own) = 👁️ Teacher` (read
allowed on attempts of own classes).

## 6. State machine

`Attempt` (owned by the student lane up to `submitted`; this module owns the last step):

```
in_progress ──(student submits / auto-submit)──► submitted ──(PATCH grade)──► graded
```

`graded` is terminal for this module. Re-grading (graded → submitted → graded) is **not
offered** — §16-Q4. The teacher cannot create, start or submit attempts.

## 7. Transaction boundary

- **Grade**: N answer UPDATEs + 1 attempt UPDATE + 1 notification INSERT — one Postgres
  transaction. Partial grading (some answers updated, status still `submitted`) must never
  commit.
- **ai-suggest** (parked): the Gemini call is external; only the resulting
  `aiSuggestedScore`/`aiFeedback` writes are transactional (N answer UPDATEs). An external
  call inside a DB transaction is forbidden (holds locks over network I/O).
- Detail/queue reads: Postgres read + one Mongo `$in` query for question payloads.

## 8. Idempotency & concurrency

- Grade is effectively idempotent while `status = submitted` (same payload twice → same
  result, notification inserted twice — see §16-Q4 for the re-grade/409 question).
- Two teachers cannot collide: ownership scoping means one teacher per attempt.
- A student edit racing a grade is impossible: student writes stop at `submitted`
  (ENTITY_ATTEMPT: "`submitted` → locked").

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Attempt id not found / not the caller's | 404 | `ATTEMPT_NOT_FOUND` | agreed |
| Grade a non-`submitted` attempt | 409 | ⛔ **no clean code** (`ATTEMPT_ALREADY_SUBMITTED` reads backwards; `ATTEMPT_NOT_IN_PROGRESS` is the student edit code) — §16-Q3 | gap |
| `grades[].questionId` not an answer of this attempt | 400 | `VALIDATION_ERROR` | agreed (fallback family) |
| `teacherScore < 0` / non-numeric | 400 | `VALIDATION_ERROR` | agreed |
| AI quota exhausted | 429 | `AI_QUOTA_EXCEEDED` | **proposed, not agreed** |
| AI key rejected | 401 | `AI_KEY_INVALID` | **proposed, not agreed** |
| Gemini unusable response | 502 | `AI_GRADING_FAILED` | **proposed, not agreed** |

## 10. Side effects & notifications

| Action | Notification | Recipient | referenceId / referenceType | payload |
|---|---|---|---|---|
| grade commit | `graded` | `Attempt.studentId` | `attempt.id` / `attempt` | `null` |

`graded` exists in `ENTITY_NOTIFICATION.md` ("Teacher completes grading"). No email, no
webhook.

## 11. Index & query

- `Attempt(assignmentId, status)` — queue filter.
- `Attempt(studentId)` — not used here (student lane).
- Queue join `Attempt → Assignment (teacherId)` — index `Assignment(teacherId)` exists
  (module 03-TASG §11).
- Detail: one Mongo `find({ _id: { $in: assignment.questionIds } })`, re-ordered in memory
  (N+1 forbidden — same rule as module 02-TQ §11).

## 12. Migration & seed

Adds `Attempt` + `AttemptAnswer` per their entity specs (partial unique index
`(assignmentId, studentId) WHERE isOfficialGrade = true`). Seed: on the module-03 published
homework — 3 attempts (`submitted` with 2 MCQ answers auto-scored + 1 writing answer unscored;
`graded` complete; `in_progress` partial), matching Mongo questions.

## 13. Security & rate limit

- Teacher sees student `writtenAnswer`s — own-class scope only (ownership predicate).
- `ai-suggest` (parked) calls an external API with the shared platform key (business decision
  #4, 2026-08-16: one shared Gemini key, no BYOK; ADR-014 still pending). Cost guard: quota
  accounting is the Admin monitoring lane's concern (`AI_QUOTA_EXCEEDED`).
- No PII beyond `nickname` in the queue.

## 14. Observability

- Log: grade commits (attempt id, question count, Δ from autoScore where both exist), every
  AI call (parked): duration, token usage, failure branch.
- Metric: `grading_queue_depth`, `grade_commit_p95_ms`, `ai_suggest_failure_total`.

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TGRD-01 | integration | teacher B reads/grades teacher A's attempt → 404 `ATTEMPT_NOT_FOUND`; queue shows only own-assignment attempts |
| INV-TGRD-02 | integration | `?status=submitted` filters; default omits `in_progress` and `graded`; `?assignmentId=` narrows |
| INV-TGRD-03 | integration | grade an `in_progress` attempt → blocked per §9 (⛔ branch assertion); grade a `graded` attempt → blocked |
| INV-TGRD-04 | unit | negative score → 400; AI path (mocked) never writes teacherScore/teacherFeedback |
| INV-TGRD-05 | integration (real DB) | grade writes answers + status + gradedAt + totalScore = Σ COALESCE(teacherScore, autoScore) atomically; forced failure mid-tx → nothing written |
| INV-TGRD-06 | integration (mocked AI, parked) | suggestion lands only on writing answers; attempt status unchanged |
| INV-TGRD-07 | integration (real DB) | exactly one `graded` notification per commit, in-tx (rollback removes it) |
| INV-TGRD-08 | integration | grade payload cannot write `autoScore`/`writtenAnswer`/`studentId` (whitelist) |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. **AI-suggest implementation parked** (owner, 2026-09-03). Gemini key handling + ADR-014 still open. The endpoint ships as a contract only. | §3.3 | PO | explicit re-open |
| Q2. **Per-question max score is not modeled** — `Attempt.maxScore` is assignment-level; `AttemptAnswer` has no max. So `teacherScore` has no upper bound. Add a field or accept. | INV-TGRD-04, FE validation parity (FE clamps to a question max it derives itself) | BE lead + PO | before coding |
| Q3. **No clean code for "grade a non-submitted attempt"** — both candidate codes have wrong semantics. | §9 | BE owner (registry) | before coding |
| Q4. Re-grading a `graded` attempt: allowed (idempotent re-commit) or 409? And the double-notification of a repeated grade. | §8, §6 | PO | before coding |
| Q5. 404 (hide existence) chosen for cross-teacher access — `ATTEMPT_NOT_OWNER` (403) stays student-lane. Confirm. | §9 mapping | BE owner | before coding |
| Q6. **C1**: `studentName` reads `nickname` vs `fullName`. | §3.1 | BE lead | before locking DTO |
