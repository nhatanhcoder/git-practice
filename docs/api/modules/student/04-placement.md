---
module: student-placement
status: proposed — owner-directed to code 2026-09-13 (Task C: "placement trước, câu hỏi nhẹ, lưu level thật")
blocked_by: none for this slice — paper depth stays capped by the question bank's content (DOC-011 adjacency recorded in §16)
owner: project owner
last_updated: 2026-09-13
---

## 0. Summary

The placement check (`/student/placement`): a light multiple-choice paper sampled **from the
existing teacher-authored question bank** (MongoDB `questions`) — no F13 exam papers and no
prototype fixtures are invented. The learner answers; the **server** grades (ADR-005: no
client-side scoring), computes the recommended HSK level, and persists it to the existing
`User.hskLevelGoal` column. No new table, no migration.

Before this module the capability sat in `API_STUDENT.md` § "Accepted capabilities with no
endpoint contract yet" ("placement attempts"); this spec is that contract. The prototype page
scored in the browser against `content.placementQuestions` — both behaviours end here.

## 1. Tables touched

| Store | Read/Write | Notes |
|---|---|---|
| `questions` (MongoDB) | Read | sampling pool: MCQ with a single-string `correctAnswer` |
| `User` (Postgres) | Write | `hskLevelGoal` — the column ENTITY_USER.md already defines (1–9, student only) |

## 2. Endpoints

All under `/api/v1`, all `role=student`. Both are new paths (registered in `API_STUDENT.md`
this slice).

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/student/placement` | The paper (questions stripped) + the student's saved level | new — defined here |
| POST | `/student/placement` | Submit answers; server grades, computes and saves the level | new — defined here |

## 3. DTO

**GET** — `200 { data: { questions[], savedLevel } }`.
`questions[]`: `{ questionId, hskLevel, skill, content, options: [{id, text}] }` — `content` is
the question's own content object (prompt / audioUrl / transcript / passage as present — the
same shape the attempt take payload carries; single-answer MCQs are listening sub-types, so
`audioUrl` is the norm). `correctAnswer`/`explanation` are **never** included (ADR-005, same
rule as INV-ATLP-07).
`savedLevel`: the student's current `hskLevelGoal`, or `null` when never placed.
An empty paper (`questions: []`) is a `200` — the bank having no eligible question is a content
state, not an error; the screen shows an honest empty state.

**POST** — body `{ answers: [{ questionId, selectedOptions: string[] }] }` (whitelist pipe; no
other fields accepted). Response `200 { data: { level, correctByLevel, total, savedLevel } }`
where `correctByLevel` maps band → correct count for the bands on the paper (post-hoc reveal is
allowed; during the quiz nothing is revealed).

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-PLC-01 | The paper is sampled only from the existing `questions` collection: MCQ with a single-string `correctAnswer` and ≥2 options. Writing/multi-answer/listening-without-audio questions never enter a paper. No question text is ever fabricated. |
| INV-PLC-02 | Bands are **contiguous from level 1**: sample levels 1,2,3… up to 2 questions per band, stopping at the first band that has no eligible question. Band 1 empty ⇒ empty paper. Cap: level 6 (prototype parity; higher bands are a content gap, not a range decision — DOC-004 keeps the 1–9 range everywhere else). |
| INV-PLC-03 | Sampling is deterministic (`createdAt` asc, then `_id`): two GETs between bank edits return the same paper, so a reload never changes the questions under the learner. |
| INV-PLC-04 | Only the server grades. Each answer is exact-set-match of `selectedOptions` against the normalized `correctAnswer`; per-band correct counts feed the level rule. |
| INV-PLC-05 | The level rule is the prototype's, ported server-side: the recommended level is the highest band B such that **every** band 1..B has ≥1 correct answer (one lucky high-band guess cannot skip bands); floor 1, cap = highest band on the paper. |
| INV-PLC-06 | A valid POST persists the computed level to the author's `User.hskLevelGoal` and returns it. An empty-paper POST is rejected `409 PLACEMENT_NO_QUESTIONS` (new code, registered this slice). |
| INV-PLC-07 | Answers referencing a question not on this student's paper are ignored for grading (the paper is sampled, not stored — there is nothing to hijack); a POST body failing validation is `400 VALIDATION_ERROR`. |
| INV-PLC-08 | The GET/POST pair is self-scoped: no `studentId` is ever accepted from the wire; the actor from the token is the only subject read or written. |

## 5. Ownership / RBAC

`@Roles('student')` on the controller. Everything is actor-scoped (INV-PLC-08); no id from the
wire ever selects another user's data. Teacher/admin have no route here.

## 6. State machine

None — placement is stateless between GET and POST (answers are not autosaved; a refresh
restarts the paper, which INV-PLC-03 keeps identical). `hskLevelGoal` is overwritten on every
successful POST (latest placement wins; see §16-Q2 for history).

## 7. Transaction boundary

One Postgres UPDATE (`User.hskLevelGoal`). Mongo is read-only. No cross-store write, so
DEBT-001 does not apply.

## 8. Idempotency & concurrency

POST is idempotent-in-effect (recompute + overwrite), not by key — the second POST of the same
answers returns the same result. No partial-failure window: single-row UPDATE.

## 9. Error → code mapping

| Error branch | HTTP | Code | Registry status |
|---|---|---|---|
| POST with an empty paper (bank has no eligible band-1 question) | 409 | `PLACEMENT_NO_QUESTIONS` | **new — registered this slice** |
| Malformed body / unknown fields | 400 | `VALIDATION_ERROR` | exists |

## 10. Data persisted

`User.hskLevelGoal = level` — the exact column the entity spec already defines. Nothing else is
written: no answers stored, no attempt rows, no Mongo writes.

## 11–14. (n/a for this slice)

No pagination, no list surface, no background work, no AI.

## 15. Test matrix

| Invariant | e2e assertion |
|---|---|
| INV-PLC-01/02 | seeded bank with bands 1–3 (2 questions each) yields a 6-question paper, bands contiguous, MCQ-only |
| INV-PLC-02 | bank with band 1 empty yields `questions: []` (200) and POST → 409 `PLACEMENT_NO_QUESTIONS` |
| INV-PLC-03 | two GETs return identical question ids in identical order |
| INV-PLC-04/07 | forged `correctAnswer` never appears in the GET payload; submitted answers grade server-side (right/wrong counts verified against the fixtures) |
| INV-PLC-05 | all-correct-in-band-1-2 + wrong-in-3 ⇒ level 2; all-wrong ⇒ level 1 |
| INV-PLC-06 | POST persists `hskLevelGoal` (read back via admin user detail) |
| INV-PLC-08 | anonymous ⇒ 401; teacher token ⇒ 403 |

## 16. Open questions / recorded decisions

- **Q1 — why `hskLevelGoal`, not a new table?** A `PlacementResult` history table is the
  longer-term shape, but it is a schema change needing owner approval this slice did not ask
  for. The entity's own meaning ("the student's level goal, 1–9") is served by writing the
  recommended level there; admin user-detail already displays it. Owner may promote to a
  history table later without any wire change.
- **Q2 — no history / no retake lock.** A learner can re-place at any time; latest wins.
  Rate-limiting or a cooldown is out of scope.
- **Q3 — paper depth.** 2 questions per band, cap band 6, is "câu hỏi nhẹ" per the task. The
  F13 corpus (11 exams / 161 questions) stays blocked by DOC-011 and would supersede sampling
  if it ever lands — recorded in `Needs from the other lane`.
