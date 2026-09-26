# MODULE SPEC — Teacher 08: Lesson Supplements (SupplementalPractice) — API-020 PROPOSAL

---
module: teacher-lesson-supplements
status: accepted
blocked_by: —
owner: project owner
last_updated: 2026-09-26
---

> **Accepted 2026-09-26** (owner: accept nguyên văn + chốt schema/codes/reject-404).
> P4 migration gate is open. The proposal history is preserved in git (`docs/api-020-supplements`).
>
> Sources, verbatim: `RBAC_MATRIX.md` (SupplementalPractice rows), `SPRINT_PLAN.md`
> S2 supplemental boxes, `FEATURES_STUDENT.md` (S-LESSON-4, S-ASGN-9, S-SELF-8, S-SELF-9),
> `PERMISSIONS_STUDENT.md` (self-study catalog & supplemental practice),
> `ENTITY_LESSON.md`, `ENTITY_LESSON_ASSIGNMENT.md`, `ENTITY_CLASS_ENROLLMENT.md`,
> `API_TEACHER.md` § Lessons, `01-classes-lessons.md` (INV-TCL-06/08/10),
> `student/02-foundation-grammar.md` (§1 catalog identity, G-read, rule 12),
> `student/05-learning-path.md` (progress keyed by `unitSlug`),
> `API_STUDENT.md` (lesson detail, supplemental context),
> `student-lesson-detail.md` Page Contract (S-LESSON-2/4 states),
> `ADR-016` (combined domain; supplemental governed, relation undefined).

## 0. Summary

A teacher attaches published platform sources — a Learning Unit or a Grammar Point — to a
lesson of their own class as supplemental practice; students of that class open the
supplements from the lesson while actively enrolled. The attachment is a **link row**, never
a content copy (USECASES_STUDENT.md UC-S-009): opening a supplement resolves the live
catalog entry, and completing one never produces an official grade, XP, or SRS change.

Boundary: this module owns the link table and its teacher/student transport. It does **not**
own catalog content (student modules 05-learning-path + 02-foundation-grammar), progress
storage (existing `unitSlug`/`grammarId`-keyed reads), assignments/attempts, or notifications.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `SupplementalPractice` **(new, §12)** | R+W | link rows lesson ↔ catalog source; teacher attach/remove/reorder |
| `Lesson` | R only | existence + `classId` for the ownership join; cascade target on delete |
| `Class` | R only | `teacherId` for the ownership predicate (INV-TCL-06 pattern) |
| `ClassEnrollment` | R only | `status = active` gate for student reads |
| `User` | R only | caller identity from JWT |
| catalog sources (units, `grammar_items`) | R only | existence + published/readable check at attach; resolution at read |

Progress stores (`unitSlug`-keyed progress, `UserStudyProgress`, `GrammarPracticeAttempt`)
are **never written** here (§4 INV-SUP-10); remove-attachment deletes no progress row.

## 2. Endpoints

All paths prefixed `/api/v1`. New rows are `defined` (accepted 2026-09-26); extended rows keep their existing
contract and gain one additive field/param.

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/teacher/lessons/:id/supplements` | teacher (own) | Attach a source; body `{ sourceType, sourceKey }`; order server-assigned `MAX+1` | defined |
| DELETE | `/teacher/lessons/:id/supplements/:supplementId` | teacher (own) | Remove the link only — never the source, never progress | defined |
| PATCH | `/teacher/lessons/:id/supplements/reorder` | teacher (own) | Bulk reorder, body `[{ id, orderIndex }]` complete dense `1..N` | defined |
| GET | `/teacher/learning-units?level=&curriculum=&search=&page=` | teacher | Picker: published units only, summary items (existing accepted endpoint, extended with `search` in P5) | defined |
| GET | `/teacher/catalog/grammar?hskLevel=&category=&search=&page=&limit=` | teacher | Picker: grammar items only, summary items | defined |
| GET | `/teacher/lessons/:id` | teacher (own) | **Extended**: detail embeds `supplements[]` (§3.6) alongside linked assignments | defined + additive |
| GET | `/student/classes/:classId/lessons/:lessonId` | student | **Extended**: detail embeds `supplements[]` in server order with availability flags (§3.7) | defined + additive |
| GET | `/student/grammar?...&assignedOnly=` | student | **Extended**: `assignedOnly=true` filters the full catalog to grammar attached to the caller's active-enrollment lessons (§3.8) | defined + additive |

Teacher picker reads exist because role guards are role-prefixed in this codebase: the
student catalog reads do not admit a teacher JWT, and `RBAC_MATRIX.md` already grants the
teacher published-unit reads (👁️) with no route to exercise them.

## 3. DTO

### 3.1 POST `/teacher/lessons/:id/supplements` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `sourceType` | enum | yes | `learning_unit` \| `grammar_point` |
| `sourceKey` | string | yes | non-empty; `unitSlug` for units, source grammar `id` for grammar points |

`orderIndex` is **not** accepted from the client (`forbidNonWhitelisted`): the server
appends `MAX(orderIndex)+1` (or `1` when empty). Response `201`:

```json
{ "data": { "id": "uuid", "lessonId": "uuid", "sourceType": "learning_unit",
  "sourceKey": "hanlo-v1-hsk-3-unit-2", "orderIndex": 3, "title": "Từ vựng HSK 3 · Gia đình",
  "createdAt": "2026-09-26T00:00:00Z" } }
```

`title` is public catalog metadata resolved at attach time (the source was verified
published). No content, no progress.

### 3.2 DELETE `/teacher/lessons/:id/supplements/:supplementId`

No body. Response `204` (no content — module conventions §4). Removing a link that is not
there → `404 SUPPLEMENT_NOT_ATTACHED` (agreed).

### 3.3 PATCH `/teacher/lessons/:id/supplements/reorder` — request

```json
[{ "id": "uuid", "orderIndex": 1 }, { "id": "uuid", "orderIndex": 2 }]
```

Each item: `id` uuid required, `orderIndex` int ≥ 1 required. The payload must be the
**complete dense `1..N` permutation** of the lesson's current supplements (INV-TCL-08
mirror). Response `200` with the full ordered list in `data[]` (same item shape as §3.6).

### 3.4 GET `/teacher/learning-units` — picker (existing accepted endpoint)

Query: `level`, `curriculum`, `page` as already defined, plus `search` (optional
substring on title/slug, added in P5 — additive, existing callers unaffected).
Response: published units only, stable order, item `{ slug, title, level }` — observed
fields from the unit read (05-learning-path), summaries only, never full `words`.
P5 deviation note: the proposal named a new `/teacher/catalog/units` path; implementation
reuses the existing accepted picker endpoint instead — no duplicate route.

### 3.5 GET `/teacher/catalog/grammar` — picker

Query: `hskLevel`, `category`, `search`, `page`, `limit` — same defaults as G-read.
Response: grammar items only, G-read stable order (`level` asc, `id` asc), item
`{ id, name, level, category }` — observed source fields (02-foundation-grammar §1
mapping), summaries only, never `tokens` (answer material).

### 3.6 Supplements item shape (teacher detail embed + reorder response)

```json
{ "id": "uuid", "sourceType": "grammar_point", "sourceKey": "g-hsk3-ba",
  "orderIndex": 2, "title": "Cấu trúc 把", "available": true }
```

`available: false` rows carry `id`, `sourceType`, `orderIndex` only — no title, no content
(no leak for unpublished/removed sources, INV-SUP-08).

### 3.7 Supplements item shape (student lesson-detail embed)

Same shape as §3.6, ordered by `orderIndex` (server order — P7). Completion state is
**not** embedded: the student resolves personal progress through the existing
`unitSlug`/`grammarId`-keyed progress reads (INV-SUP-10).

### 3.8 GET `/student/grammar` with `assignedOnly=true`

Server resolves, in order: caller's **active** enrollments → their lessons → supplement
links with `sourceType = grammar_point` → key set. The full grammar catalog is filtered to
that set **before** pagination; `hskLevel`/`category`/`search` intersect normally; item
shape unchanged. No active enrollments (or none with grammar supplements) → `data: []`,
meta total 0 — an honest empty, not an error. Param absent → behavior unchanged
(self-study context untouched, S-SELF-8 vs voluntary split preserved).

## 4. Business rules (invariants)

| ID | Rule |
|---|---|
| INV-SUP-01 | Teacher attach/remove/reorder resolves the lesson **joined with its class** and requires `lesson.class.teacherId === currentUser.id`, else `403 LESSON_ACCESS_DENIED` (INV-TCL-06 mirror). The role guard alone never authorizes. |
| INV-SUP-02 | Knowing IDs changes nothing: another teacher's lesson answers `403 LESSON_ACCESS_DENIED`; malformed/missing lesson answers `404 LESSON_NOT_FOUND`. No existence probing beyond what lessons already expose. |
| INV-SUP-03 | Attach validates the source at write time: the key must resolve to a **published, readable** catalog entry of the declared type, else `404 SUPPLEMENT_SOURCE_NOT_FOUND` (⛔) — fail closed, no content in the error. |
| INV-SUP-04 | Duplicate rule: `UNIQUE(lessonId, sourceType, sourceKey)`. Re-attaching the same source answers `409 SUPPLEMENT_ALREADY_ATTACHED` (⛔); the unique constraint is the real defence, so concurrent duplicates collapse to one winner (INV-CLASS-05 precedent). |
| INV-SUP-05 | Stable order: `orderIndex` 1-based, `UNIQUE(lessonId, orderIndex)`; attach appends `MAX+1`; remove leaves gaps; reorder requires the complete dense `1..N` permutation swapped in **one transaction** — partial or conflicting payloads answer `409 SUPPLEMENT_ORDER_CONFLICT` (⛔) and commit nothing (INV-TCL-08 mirror). |
| INV-SUP-06 | Remove is link-only: `DELETE` deletes the link row; never the catalog source, never any progress row (`UserStudyProgress`, `GrammarPracticeAttempt`, `unitSlug`-keyed progress untouched). |
| INV-SUP-07 | Student reads require an **active** enrollment (`status = active`) in the lesson's class, else `403 CLASS_ACCESS_DENIED` (student-lesson-detail precedent); lesson outside `classId` → `404 LESSON_NOT_FOUND`; `dropped` callers are denied like strangers (P7). |
| INV-SUP-08 | Read-time honesty: each supplement resolves against the **current** catalog; unresolvable sources (unpublished, removed, unknown revision) render `{ available: false }` with id/type/order only — no title, no content, no progress. One dead source never 404s the lesson. |
| INV-SUP-09 | `assignedOnly=true` filters by attachments on **active-enrollment** lessons across the **full** catalog before pagination; other-class and dropped-enrollment attachments are excluded; empty set (not error) when nothing qualifies; param absent changes nothing. |
| INV-SUP-10 | No official outcomes: attaching, opening, or completing a supplement never writes attempt scores, XP, or SRS schedules (02-foundation-grammar rule 12; `API_STUDENT.md` supplemental context). Completion visibility follows existing progress reads only — a teacher sees completion for supplements assigned to their active class, voluntary history stays private (S-SELF-9). No new progress endpoints in this module. |
| INV-SUP-11 | No client-side sensitive filtering: ownership, enrollment, availability, and the assigned set are all enforced in the service layer; responses never carry other users' data, enrollment codes, peer rosters, or unpublished content. |
| INV-SUP-12 | Picker endpoints return published sources only, summary fields only — no answers (`tokens`), no keys beyond public identity, no progress. |

## 5. Ownership / RBAC

Service-layer predicates (role guards only route to the right handler):

```typescript
// teacher attach / remove / reorder — INV-TCL-06 pattern
lesson = Lesson JOIN Class ON lesson.classId
if (!lesson) → 404 LESSON_NOT_FOUND
if (lesson.class.teacherId !== caller.id) → 403 LESSON_ACCESS_DENIED

// student lesson-supplement read — student-lesson-detail pattern
enrollment = ClassEnrollment WHERE classId AND studentId === caller.id
if (!enrollment || enrollment.status !== 'active') → 403 CLASS_ACCESS_DENIED
if (lesson.classId !== classId) → 404 LESSON_NOT_FOUND
```

Picker reads require the teacher role; they return published summaries any signed-in
teacher may see (`RBAC_MATRIX.md` LearningCatalog read row). `assignedOnly` requires a
signed-in student; the filter key set derives exclusively from their active enrollments.

## 6. State machine

Link rows have **no lifecycle states** (like `LessonAssignment`): create → reorder → delete.
Order lifecycle instead: attach appends `MAX(orderIndex)+1` (or `1`); remove leaves its
`orderIndex` untouched (gaps allowed in storage); reorder must send the dense `1..N`
permutation and swaps the whole set at once. One-way gate: `orderIndex` values are never
reused silently — a removed index returns only via an explicit reorder.

## 7. Transaction boundary

- Attach: single-row INSERT; the two UNIQUE constraints are the atomicity (concurrent
  duplicates collapse, §8).
- Reorder: whole-set swap in **one transaction**; the `UNIQUE(lessonId, orderIndex)`
  aborts partial writes (INV-TCL-08 mirror).
- Remove: single-row DELETE (no progress touched, INV-SUP-06).
- Lesson delete: supplement rows cascade inside the lesson-delete transaction (§12).
- No cross-DB transaction (DEBT-001, T2 §7 precedent): catalog existence reads hit Mongo,
  the link write hits Postgres. The read-then-write gap is accepted and mitigated by
  read-time availability flags (INV-SUP-08) — a source unpublished between attach-check
  and read renders `available: false`, never stale content.

## 8. Idempotency & concurrency

- Duplicate attach (same or concurrent requests): second writer hits
  `UNIQUE(lessonId, sourceType, sourceKey)` → `409 SUPPLEMENT_ALREADY_ATTACHED`. Replay
  is safe to retry: same state, same code, no second row.
- Concurrent reorders: each runs in one transaction against the current set; a loser
  whose set moved mid-flight fails permutation validation or the unique index →
  `409 SUPPLEMENT_ORDER_CONFLICT`; the committed order is always one complete client
  intent, never a half-state (P5 checklist).
- Attach racing lesson delete: the FK + the ownership join inside the write path means
  the attach either lands before the delete (and cascades with it) or fails the join
  after it — no orphan rows.
- Remove is idempotent in effect: deleting a missing link answers `404
  SUPPLEMENT_NOT_ATTACHED`, never a silent 204.

## 9. Error → code mapping

| Error branch | HTTP | Code | Code status |
|---|---|---|---|
| Lesson id malformed / missing | 404 | `LESSON_NOT_FOUND` | agreed |
| Lesson exists, not the caller's (teacher) | 403 | `LESSON_ACCESS_DENIED` | agreed |
| No / inactive enrollment (student) | 403 | `CLASS_ACCESS_DENIED` | agreed (student-lesson-detail precedent) |
| Lesson outside `classId` (student) | 404 | `LESSON_NOT_FOUND` | agreed |
| DTO invalid | 400 | `VALIDATION_ERROR` (+ `details`) | agreed |
| Duplicate attach | 409 | `SUPPLEMENT_ALREADY_ATTACHED` | agreed 2026-09-26 |
| Remove a link that is not there | 404 | `SUPPLEMENT_NOT_ATTACHED` | agreed 2026-09-26 |
| Reorder not the complete dense `1..N` permutation | 409 | `SUPPLEMENT_ORDER_CONFLICT` | agreed 2026-09-26 |
| Attach source unknown or unpublished | 404 | `SUPPLEMENT_SOURCE_NOT_FOUND` | agreed 2026-09-26 |

No other codes. The four `SUPPLEMENT_*` names live in the registry's agreed section
(signed 2026-09-26).

## 10. Side effects & notifications

None. Attaching/removing/reordering supplements produces no `Notification` rows — no
producing event in any notification matrix covers it, and students discover supplements
by opening the lesson. Stating this so a coder does not invent a producer.

## 11. Index & query

- `UNIQUE(lessonId, sourceType, sourceKey)` — duplicate rule + attach fast-path check.
- `UNIQUE(lessonId, orderIndex)` — order integrity + reorder abort signal.
- `INDEX(lessonId, orderIndex)` — ordered lesson reads (teacher detail, student detail).
- `assignedOnly` plan: active enrollments of caller → lesson ids → link rows →
  grammar-key set → catalog filter `key IN (…)` (index `(level, category)` + key per
  02-foundation-grammar §1) → paginate. Per-supplement source resolution at read batches
  by key set — no per-row catalog round-trip (N+1 rule).

## 12. Migration & seed

Prisma shape accepted for P4 (minimal — no spare fields, `LessonAssignment` precedent
has no `updatedAt` either):

```prisma
enum SupplementSourceType {
  learning_unit
  grammar_point
}

model SupplementalPractice {
  id         String               @id @default(uuid()) @db.Uuid
  lessonId   String               @map("lesson_id") @db.Uuid
  lesson     Lesson               @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  sourceType SupplementSourceType @map("source_type")
  sourceKey  String               @map("source_key")
  orderIndex Int                  @map("order_index")
  createdAt  DateTime             @default(now()) @map("created_at")

  @@unique([lessonId, sourceType, sourceKey])
  @@unique([lessonId, orderIndex])
  @@index([lessonId, orderIndex])
  @@map("supplemental_practice")
}
```

The P4 migration adds the enum + table + constraints and nothing else (own PR, merges
before runtime). Seed for tests: one teacher + class + lesson, one published unit key,
one grammar key, one `active` and one `dropped` enrollment.

## 13. Security & rate limit

- `forbidNonWhitelisted` DTOs: attach accepts `sourceType` + `sourceKey` only
  (`orderIndex` server-assigned); reorder items accept `id` + `orderIndex` only.
- Responses never contain enrollment codes, peer rosters, other users' data, or
  unpublished content (INV-SUP-08/11).
- No module-specific rate limit is proposed (`API_CONVENTIONS.md` has no rate-limit
  section; catalog reads stay within existing list-endpoint budgets).

## 14. Observability

- Log attach/remove/reorder with actor id, lesson id, source type + key (public catalog
  identities only — never words, answers, or progress values).
- Count `SUPPLEMENT_ORDER_CONFLICT` outcomes: a rising rate means a client is reordering
  against stale state, not a server problem.
- No content logging; no per-student open tracking in this module (progress reads own
  their telemetry).

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-SUP-01 | integration (real DB) | Teacher B attach/remove/reorder on A's lesson → `403 LESSON_ACCESS_DENIED`; unknown lesson → 404 |
| INV-SUP-02 | integration (real DB) | Same as 01 across all three write endpoints + picker reads never leak foreign rows |
| INV-SUP-03 | integration (real DB) | Attach unknown unit slug / unknown grammar id / unpublished source → `404 SUPPLEMENT_SOURCE_NOT_FOUND`, error carries no content |
| INV-SUP-04 | integration (real DB) | Attach same source twice → second is `409 SUPPLEMENT_ALREADY_ATTACHED`; concurrent duplicates → exactly one row |
| INV-SUP-05 | integration (real DB) | Reorder partial set / duplicate indexes / non-dense values → `409 SUPPLEMENT_ORDER_CONFLICT`, stored order unchanged; valid permutation commits whole |
| INV-SUP-06 | integration (real DB) | Remove attachment → link gone, source still readable, progress rows for that source+student unchanged |
| INV-SUP-07 | integration (real DB) | Dropped student, other-class student, anonymous → lesson supplements denied (`403`/`401`); cross-classId lesson → 404; active student reads in server order |
| INV-SUP-08 | integration (real DB) | Unpublish/remove a source after attach → lesson read still 200 with that row `{ available: false }` and no title/content |
| INV-SUP-09 | integration (real DB) | `assignedOnly=true` returns only grammar attached to active-enrollment lessons across the full catalog (page past the attached set to prove it); dropped/other-class attachments excluded; no enrollments → empty `data[]`; param absent → full list |
| INV-SUP-10 | integration (real DB) | Open/complete attached sources → no Attempt/XP/SRS rows created; teacher completion view uses existing progress reads only |
| INV-SUP-11 | integration (real DB) | Responses contain no enrollment codes, peer data, or unpublished content on any endpoint in §2 |
| INV-SUP-12 | integration (real DB) | Picker lists contain published summaries only; unpublished unit/grammar never appears; no `tokens`/answers/keys beyond public identity |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Accept this contract as **API-020**? Confirm the canonical ID and placement (proposed: Teacher module T8, `teacher/08-supplements.md`, invariants `INV-SUP-*`) | Everything — P4 migration, P5 runtime | Project owner | **RESOLVED 2026-09-26 — accepted verbatim** |
| Sign the four `SUPPLEMENT_*` codes (registry agreed section) | Coding §9 | BE owner | **RESOLVED 2026-09-26 — signed** |
| Confirm table name `SupplementalPractice` (+ `onDelete: Cascade` on lesson delete, no `updatedAt`) | P4 migration | Project owner | before P4 |
| `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` supplement rows + `API_TEACHER.md` / `API_STUDENT.md` catalog rows: separate-approval edits (precedent: teacher-lessons-list contract) | P6 wiring clarity (not coding) | BE owner | with acceptance |
| Page Contract/spec updates for the three FE surfaces (teacher lessons picker region; student lesson-detail supplements region + states; grammar assigned-filter state) — follow-up slices, not this proposal | P6/P7 | FE lane | after acceptance |
| Confirm: `assignedOnly=true` with enrollments-but-none-active → empty set (specified in §3.8) | P7 edge | Project owner | with acceptance |
| Confirm: attach-time unpublished rejection (`404`, specified in INV-SUP-03) vs allow-plus-unavailable-marker | Attach UX | Project owner | with acceptance |
