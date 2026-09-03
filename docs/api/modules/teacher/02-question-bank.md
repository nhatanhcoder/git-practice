# MODULE SPEC — Teacher 02: Question Bank (MongoDB)

---
module: teacher-question-bank
status: proposed
blocked_by: audio upload mechanism (CR-3 storage undecided) · delete/edit-gate error code missing
owner: BE owner (unset)
last_updated: 2026-09-03
---

> ⚠️ This is the **first MongoDB module** in the repo. Template §7 (transaction boundary) and
> §12 (migration) are rethought for Mongo, not copied from the SQL modules — per
> `docs/api/modules/_INDEX.md` §11. `DEBT-001` (no cross-DB transactions) applies directly:
> Question lives in Mongo, Assignment in Postgres, linked by `questionIds`.

## 0. Summary

CRUD over the teacher-authored question bank: create, list (filter by skill / hskLevel /
subType), read, update, delete. Single-document MongoDB writes; cross-DB integrity with
`Assignment.questionIds` is enforced at the Postgres write side (module 03-TASG) plus a
delete-gate here.

Sources, verbatim: `API_TEACHER.md` § Question Bank, `ENTITY_QUESTION.md` (MongoDB),
`RBAC_MATRIX.md`, `API_ERROR_CODES.md` § Question Errors.

## 1. Collections touched

| Collection | Read/Write | Notes |
|---|---|---|
| `questions` (MongoDB) | R+W | the whole module |
| `Assignment` (Postgres) | R only | delete/edit gate: is the question referenced by a published assignment? |

Cross-DB reference: `Assignment.questionIds[]` (Postgres `text[]`) holds `Question._id`
strings; `AttemptAnswer.questionId` (Postgres) does too. Neither is a real FK — see §7.

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/teacher/questions` | teacher | Create question (with audio URL) | defined |
| GET | `/teacher/questions` | teacher | List questions — filters `?skill=&hskLevel=&subType=` + pagination + `?search=` | defined |
| GET | `/teacher/questions/:id` | teacher | Get question detail | defined |
| PATCH | `/teacher/questions/:id` | teacher | Update question (own only) | defined |
| DELETE | `/teacher/questions/:id` | teacher | Delete question (own only, gated) | defined |

`RBAC_MATRIX.md`: Question read = `✅ Teacher` (full), create/update/delete = `✅ Teacher`
(scoped to own questions by `QUESTION_NOT_OWNER`). So **list/detail return every teacher's
questions**; writes touch only `createdBy === currentUser.id`.

## 3. DTO

### 3.1 POST `/teacher/questions` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `skill` | enum | yes | `listening` / `reading` / `writing` |
| `subType` | enum | yes | one of the 9 values below, **must belong to `skill`** (§4 INV-TQ-02) |
| `hskLevel` | int | yes | 1–9 |
| `difficulty` | enum | yes | `easy` / `medium` / `hard` |
| `content` | object | see INV-TQ-04 | `audioUrl?`, `transcript?`, `passage?`, `prompt?`, `rubric?` |
| `options` | array | MCQ types only | `[{ id, text }]` — required when the subType is an MCQ kind |
| `correctAnswer` | string \| string[] \| null | see INV-TQ-03 | `null` for Writing |
| `explanation` | string | no | nullable |

`subType` values by skill (ENTITY_QUESTION, verbatim):

```
listening: multiple_choice_single | true_false_not_given | short_answer
reading:   multiple_choice_multi | fill_in_blank | sentence_ordering | matching
writing:   sentence_construction | essay
```

Response `201`: the stored document, `_id` rendered as a string:

```json
{ "data": { "id": "68a1…", "skill": "reading", "subType": "multiple_choice_multi",
            "hskLevel": 3, "difficulty": "medium",
            "content": { "passage": "…" },
            "options": [ { "id": "A", "text": "…" } ],
            "correctAnswer": ["A", "C"],
            "explanation": null,
            "createdBy": "uuid", "createdAt": "…", "updatedAt": "…" } }
```

`createdBy`, `createdAt`, `updatedAt` server-assigned.

### 3.2 GET `/teacher/questions` — list

Query: `?skill=&hskLevel=&subType=&difficulty=&search=&page=&limit=`.
`search` matches `content.prompt` / `content.passage` / `options.text` (regex, case-insensitive).
Row = the detail shape (§3.1). Lists wrap in `{ data, meta }`.

### 3.3 GET / PATCH / DELETE — detail / update / delete

PATCH accepts any subset of the writable create fields; `createdBy`, `createdAt` are
never writable. Same validation as create (a PATCH must leave a **valid** question).
DELETE → `204`.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-TQ-01 | Write endpoints resolve the document with `createdBy === currentUser.id` → else `403 QUESTION_NOT_OWNER`. Read endpoints have no ownership filter (RBAC: read = ✅ full). |
| INV-TQ-02 | `subType` must be a member of its `skill`'s group (§3.1). A mismatched pair never persists. |
| INV-TQ-03 | `correctAnswer` shape follows the subType: `null` for Writing types; `string` for single-answer MCQ; `string[]` for multi / ordering / matching, each element referencing an `options[].id` that exists in the document. |
| INV-TQ-04 | Listening questions require `content.audioUrl` (non-empty) → `400 QUESTION_AUDIO_REQUIRED`. MCQ subTypes require a non-empty `options` array with unique ids. Writing questions require `content.rubric` and `content.prompt`, and must have `correctAnswer = null`. |
| INV-TQ-05 | A question referenced by at least one `published` Assignment cannot be edited or deleted (ENTITY_QUESTION: "unless used in a published Assignment"). Draft assignments do not gate. ⛔ **No valid error code exists for this branch** — see §9 / §16. |
| INV-TQ-06 | `options[].id` is stable across updates: a PATCH that renames an option id while `correctAnswer` still references the old id is rejected (VALIDATION_ERROR). |
| INV-TQ-07 | Delete is a hard delete — the schema has no soft-delete field. The INV-TQ-05 gate is the only guard against orphaned `questionIds` references. |

## 5. Ownership / RBAC

```
Teacher   read:  any question (bank is shared read)
          write: createdBy === req.user.id        (service layer, not the role guard)
Student   ❌ all endpoints (students meet questions inside an attempt — student lane)
Admin     ❌ all endpoints
```

## 6. State machine

None. `Question` has no status column. Lifecycle: created → updated (while ungated) → deleted
(while ungated). "Used in a published assignment" is a derived condition, not a state.

## 7. Transaction boundary — rethought for MongoDB

- Every write is a **single-document** MongoDB operation — atomic by itself. No multi-document
  transactions are needed or used.
- **Cross-DB (DEBT-001 — accepted risk, by design):** creating a Question in Mongo and
  linking it into an `Assignment.questionIds` in Postgres cannot share a transaction.
  Mitigations, in order:
  1. Assignment create/update (module 03-TASG) validates every `questionId` **exists in Mongo
     before** the Postgres write.
  2. This module's INV-TQ-05 blocks deleting a question that a published assignment references.
  3. Residual window (question deleted while a *draft* assignment still references it):
     tolerated, surfaced by the same existence check when that draft is published/edited.
     A periodic orphan-cleanup job is the long-term fix (DEBT-001 workaround).
- The delete-gate read (Postgres) and the delete (Mongo) are two stores: gate first, delete
  second. A published assignment created in between can end up referencing a deleted question —
  recorded as accepted risk in §16.

## 8. Idempotency & concurrency

- Create: no natural idempotency key; duplicate submits create duplicate questions (harmless —
  no unique constraint exists in the schema).
- Update: last-write-wins on the document (Mongo default). No optimistic concurrency field
  exists in the entity — recorded in §16.
- Delete: second delete → `404 QUESTION_NOT_FOUND`.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Question id not found | 404 | `QUESTION_NOT_FOUND` | agreed |
| Write on another teacher's question | 403 | `QUESTION_NOT_OWNER` | agreed |
| Listening without `content.audioUrl` | 400 | `QUESTION_AUDIO_REQUIRED` | agreed |
| Audio upload failure | 500 | `QUESTION_AUDIO_UPLOAD_FAILED` | agreed |
| Field validation (skill/subType mismatch, bad `correctAnswer` shape, missing options/rubric) | 400 | `VALIDATION_ERROR` | agreed (fallback family) |
| **Edit/delete gated by published assignment** | 409 | ⛔ **no valid code exists** | gap — see §16 |

## 10. Side effects & notifications

None. No `Notification` type relates to questions.

## 11. Index & query

Mongo indexes (created as part of §12):

```
{ skill: 1, hskLevel: 1 }        // list filter
{ subType: 1 }
{ createdBy: 1 }
{ "content.prompt": "text", "content.passage": "text", "options.text": "text" }   // search
```

N+1 risk: assignment detail (module 03-TASG) fetches N questions — must use one
`find({ _id: { $in: questionIds } })` and re-order in memory (`questionIds` order is
meaningful, ENTITY_ASSIGNMENT).

## 12. Migration & seed — rethought for MongoDB

No Prisma migration. Mongoose schema lives at `apps/api/src/mongodb/schemas/question.schema.ts`
(working-rules § File Naming). Index creation is an idempotent `createIndex` step in the app
bootstrap or a `db:index` script (no `mongodump`-style migration tooling — recorded in §16).
Seed: per skill, 2 questions × mixed subTypes × HSK 1/3/5, one Listening with `audioUrl`, one
Writing with `rubric` + `correctAnswer: null`, one multi-answer Reading with `correctAnswer:
["A","C"]`.

## 13. Security & rate limit

- `correctAnswer` and `explanation` are returned to **teachers only**. The student attempt
  flow must never leak them before grading (student-lane concern, recorded here so the FE
  contract for students cannot accidentally reuse this DTO).
- Audio URLs: signed URLs from storage (CR-3 undecided — §16). No size/type validation rule
  exists in the entity; the upload endpoint itself is **not** in `API_TEACHER.md` and is out
  of scope here.

## 14. Observability

- Log: create/update/delete with actor + `_id`; every gated refusal (which assignment blocked).
- Metric: `question_delete_gated_total`, `question_search_p95_ms`.

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TQ-01 | integration | teacher B PATCH/DELETE teacher A's question → 403 `QUESTION_NOT_OWNER`; B can GET it → 200 |
| INV-TQ-02 | unit + integration | every skill×subType mismatch (27 invalid pairs sampled) → 400; all 9 valid pairs persist |
| INV-TQ-03 | unit | single → string; multi/ordering/matching → string[]; writing → null enforced |
| INV-TQ-04 | integration | listening without audioUrl → 400 `QUESTION_AUDIO_REQUIRED`; MCQ without options → 400; writing without rubric/prompt → 400 |
| INV-TQ-05 | integration (real DB) | seed published assignment referencing q → PATCH/DELETE q → gated; draft assignment does not gate; ⛔ code assertion pending §16 |
| INV-TQ-06 | unit | PATCH renaming an option id still referenced by `correctAnswer` → 400 |
| INV-TQ-07 | integration | delete → document gone; re-delete → 404 |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. **No error code for "question used by a published assignment"** — edit/delete gate has nothing to throw. | INV-TQ-05's HTTP branch; FE error mapping | BE owner (registry) | before coding |
| Q2. **CR-3 storage** (Supabase vs Cloudinary) undecided → the audio upload mechanism (and `contentUrl` in module 01) cannot be built. `audioUrl` is specced as an opaque string. | upload flow only — CRUD works without it | PO | before upload work |
| Q3. No optimistic-concurrency field on Question — last-write-wins on update. Accept, or add `version`? | concurrent edits by the same teacher | BE lead | before coding |
| Q4. Mongo index bootstrapping: `createIndex` at app start vs a script — pick one and write it down for all future Mongo modules. | §12 mechanism | BE lead | before coding |
| Q5. Race: question deleted in the window after the gate read but before a concurrent publish links it (DEBT-001 accepted). Confirm the cleanup-job mitigation. | §7 residual risk | BE lead | accepted-risk sign-off |
