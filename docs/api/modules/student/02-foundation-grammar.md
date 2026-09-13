---
module: student-foundation-grammar
status: proposed
blocked_by: content adoption; storage and completion rules; endpoint/DTO/error contracts
owner: project owner
last_updated: 2026-09-10
---

# Foundation and Grammar — design for approval

## 0. Summary

Scope: S-SELF-2, S-SELF-3 and the corresponding private-progress slice of S-SELF-9.
The owner approved **writing this design**, not its decisions or implementation.
All Foundation/Grammar backend operations below are **NOT IMPLEMENTED**.
No new endpoint, payload, error code or physical schema is asserted to exist.

Sources: [source audit](foundation-grammar-source-audit.md),
[ADR-016](../../../shared/decisions/016-combined-student-learning-domain.md),
[Student permissions](../../../actors/student/PERMISSIONS_STUDENT.md),
[RBAC matrix](../../../shared/RBAC_MATRIX.md),
[entity index](../../../entities/_INDEX.md),
[Student API](../../API_STUDENT.md), and the existing Foundation/Grammar pages and local store.
Entity specifications outrank feature descriptions; the entity index explicitly leaves catalog
and personal progress undesigned. Prototype data is input evidence, not an accepted entity spec.

Recommended sequence: audited text catalog and private study completion first, verified Grammar
practice second, playable/downloadable media third. This is sequencing, not permission to call
the whole feature done while any committed capability remains unavailable.

## 1. Data and storage proposal — no tables touched

| Aggregate | Recommendation to approve | Identity / boundary |
|---|---|---|
| Published Foundation and Grammar content | MongoDB versioned content, preserving source fields | Source group plus source `id`; radicals use source `no`; immutable published revision |
| Personal study progress | PostgreSQL relational state linked to existing User | One learner + one stable content identity; distinguish self-reported study from assessed ability |
| Grammar practice result | PostgreSQL result and progress update in the same transaction | Pin the content/exercise revision; retries of one submission must not create another result |
| Audio/PDF assets | Separate reviewed asset manifest | Verified file/hash/rights, never the unverified source duration/size labels |
| Microphone recording | Recommend browser-session playback only in the first media slice | No upload or retention; no pronunciation score; choice pending D4 |

These are conceptual aggregates, not approved collection/table/column names. Physical schemas,
indexes and transport fields stay ⛔ until D2/D5. No Prisma/Mongoose file is changed by this task.
PostgreSQL progress avoids adding relational learner/result records to the content documents.
Mongo content and PG progress cannot share a transaction: pin immutable content before the PG write.
A future content withdrawal policy must preserve past result references rather than hard-delete them.

### Source-derived field mapping

- Preserve Grammar `id`, `level`, `category`, `name`, `formula`, `hanzi`, `pinyin`, `vi`, `note`,
  `key`, `tokens`, `frequency` in the proposed content representation. These names are observed
  source fields, not permission to expose a DTO unchanged. Eight source categories cannot be
  silently cast into the current six-category FE type.
- Preserve sounds' `sound` and example `pinyin` separately; they mean different things. Preserve
  `ipa`, `hanzi`, `vi`, `group`. Do not turn `group` into a fabricated instructional `tip`.
- Preserve tones/sandhi/radicals/listening/speaking/PDF descriptor fields listed in the audit.
  Validate numeric tone geometry before rendering; do not interpret it as arbitrary SVG/HTML.
- Personal progress has no valid source in either JSON. The existing demo `masteredSounds`,
  `learnedRadicals`, `grammarMastery` and `awardXp` are not migration input.
- `PROJECT_KNOWLEDGE.md` proposes `UserGrammarProgress` with `userId`, `grammarPointId`, `status`,
  `attemptCount`, `lastPracticedAt`; ADR-016 explicitly does not approve that SQL shape. It also
  does not define content revisioning or retry identity, so it cannot be implemented as-is.
- Physical fields for those missing concepts must be specified and approved, not inferred from
  mock counters. No sample request body is provided while the required contract is missing.

## 2. Required API operations — blocked contract register

Operation labels here are document references, not API routes or error codes.
Every path/method is **⛔ missing**, including operations described as reads/writes below.

| Operation | Caller need | Contract status |
|---|---|---|
| F-read | Read published Foundation groups/items and available resource references | ⛔ path, query, envelope fields and item identity mapping |
| F-progress | Read own Foundation study state | ⛔ path, response fields and missing-state semantics |
| F-save | Explicitly set own studied state; never infer from play/download | ⛔ method, body, concurrency/revision and response |
| G-read | Read Grammar list/detail using HSK/category/search filters | ⛔ path, query, pagination, fields and stable order |
| G-progress | Read own study/practice results separately from catalog | ⛔ path, fields and aggregate semantics |
| G-save | Explicitly mark studied, separate from assessed mastery | ⛔ method, body and response |
| G-practice | Start/submit a reviewed exercise and get server-assessed feedback | ⛔ all transport, answer identity, retry and scoring contracts |
| M-read | Resolve verified audio/PDF resources | ⛔ delivery contract and CR-3; absent resources must stay unavailable |

Do not reuse the SRS review endpoint: studying grammar is not an SM-2 flashcard rating.
Do not copy the external prototype API or name-based profile authentication.
Do not reinterpret generic analytics routes as write APIs for study progress.

## 3. DTO design constraints — ⛔ exact contracts missing

The source mapping in section 1 defines required content information, not an executable DTO.
The BE owner must settle paths, identifiers, query names/defaults/limits, nullability, body and
success envelope fields before implementation. Apply existing API_CONVENTIONS flat envelopes
and UTC ISO timestamps. A client must never select another learner via a request `userId`.

Catalog filters must support HSK 1–9 for Grammar; Foundation pinyin/radicals need no invented
HSK level. Content and own progress must remain separable so a progress read failure does not
hide readable content. Unknown progress is not zero. Responses may not embed another learner's
state or fabricated audio, elapsed duration, examples or percentages.

## 4. Proposed invariants

| # | Rule to preserve in the implementation design |
|---|---|
| 1 | Only reviewed, approved-for-use content is published; missing content never falls back to demo |
| 2 | Content identity is stable across imports; published revision references remain readable |
| 3 | Every personal read/write is scoped to current User in the service layer |
| 4 | Catalog contains no private progress and imports never overwrite learner state |
| 5 | One submitted exercise retry causes at most one result/progress update |
| 6 | A client-supplied correctness flag, mastery, XP or duration is not assessment authority |
| 7 | Failed/uncertain writes do not show success or auto-replay without an approved retry contract |
| 8 | Self-reported study is visibly distinct from tested mastery; no fabricated completion percentage |
| 9 | Missing assets or denied microphone access yield an honest unavailable/error state |
| 10 | Changed filters, account changes and unmounts prevent stale responses repainting another view |
| 11 | HSK filters cover 1–9; empty levels are empty, not synthesized content |
| 12 | Self-study is not an official Assignment/Attempt grade or automatic SRS schedule change |

Numbers above are local design references, not additions to the error-code registry.

## 5. Ownership / RBAC

Existing RBAC already grants Student read of published units and read/update of own voluntary
progress. Enforce this at service level in any later implementation. Retain existing shell/Auth.
No new Admin authoring screen or Teacher progress visibility is part of this slice. Teacher
supplemental-unit access remains governed by ADR-016 and its separate not-yet-defined relation;
this design does not remove or expand any permission in the matrix.

## 6. State machine and completion proposal

Study: not studied -> explicitly marked studied -> explicitly unmarked by the same learner.
Repeated set-to-the-same-state should be idempotent; the UI must not use a toggle-only mutation.
An item being opened, TTS ending, a file download, or microphone permission is not mastery.

Practice: ready -> answering -> submitting -> confirmed result; failure keeps the answer and
supports recovery without silently awarding progress. There must be a stable submission identity
before retries can be safe. Same identity/different answer needs a defined conflict response (D5).

Recommendation D3: first expose studied-item counts and confirmed per-exercise feedback.
Keep mastery percentage, pass threshold, streak and XP unavailable until pedagogical/event rules
are approved. The current frontend's >=80 mastery threshold and +20 XP are demo rules.

Grammar supports five mock exercise tabs today. `tokens` supports a candidate reorder exercise,
but the source does not supply reviewed distractors, cloze blanks, match pairs or reflex timing.
Do not ship five graded modes just because the FE has five tabs. An approved exercise manifest
must identify prompt, accepted answers/alternatives and scoring rules; content owner review is
required even where concatenated tokens match an example. Acceptance of alternate correct word
orders and repeated-token identity must be explicit. Code must not split Hanzi into characters
and treat that as validated word tokenization.

## 7. Transaction boundary

Use immutable reviewed catalog revisions so validation reads cannot change between answer
validation and commit. Persist a practice result, its deduplication decision and progress update
in one PG transaction. If content/DB lookup fails, write nothing and preserve the user's draft.
No cross-database atomic publish/write is promised. Withdrawal/concurrent import policy is a
D2 prerequisite; old result references must remain valid even after new content is published.

## 8. Idempotency & concurrency

D5 must define a bounded retry identity and lifetime, uniqueness enforcement, same-identity/same-
answer replay and same-identity/different-answer rejection. These are missing transport fields,
not implicit headers to invent. Set studied/un-studied must also define ordering for competing
writes; recommend optimistic revision checks instead of nondeterministic toggles. Do not
implement or auto-replay either write until these cases have approved responses/error mappings.

## 9. Error mapping — ⛔ BE-owner decisions

Existing shared authentication/validation handling is reusable only as defined in the current
registry. New content-not-found/withdrawn, unavailable exercise, stale revision, submission
conflict, missing asset and invalid-answer cases have no approved Foundation/Grammar mapping.
Mark each TODO(error-code); do not borrow FLASHCARD errors or mint a new error family here.
The FE can distinguish request/network failure from empty content without inventing a code.

## 10. Side effects & notifications

Recommend none beyond private study/practice persistence for this slice. No XP, badges, streak,
leaderboard, invoice, class grade, notification or SRS write. These exclusions require D3 scope
approval and remain explicitly unfinished product capabilities, not deleted roadmap items.

## 11. Index & query proposal

Conceptual uniqueness: source-group/source-id/revision for content; learner/content for current
study state; learner/submission identity for practice retry suppression. Exact names/index DDL
are blocked on D2/D5. List stable ordering and pagination before writing query code; audit size
(76 Grammar records) is not a permanent maximum. Match/search Unicode consistently; preserve
original text and distinguish canonical normalization from changing pedagogical punctuation.

## 12. Import and rollout plan

1. Owner approves source/hash/provenance and editorial disposition of repeated concepts (D1).
2. Store approved corpus plus manifest in the repository or another approved versioned source
   accessible to CI; no developer-drive dependency. No copy occurs in this docs task.
3. Validate type/required fields, stable keys, HSK, Unicode, token integrity and resource refs.
   Emit per-record errors; structural success is not pedagogical approval.
4. Dry-run defaults to no writes; report create/update/unchanged/invalid and identity collisions.
5. Apply only to a named isolated database after schema/import approval. Reapply the same input
   twice; counts and identities must remain stable. Never drop/reset collections.
6. Failure midway is resumable against immutable revisions; do not publish a partial revision.
   Rollback reselects a previous catalog version, not deletion of learner progress/results.
7. After contract/backend verification, wire the two FE routes and remove their production
   unavailable gates only for actually implemented capabilities. Deploy/import remains separate.

## 13. Security, media & resource limits

No arbitrary HTML from source; validate display/drawing data. Limit request sizes, query volume
and practice submissions only through an approved API-limit contract; throttling remains D5.
No third-party media fetch/upload, microphone grant or cloud speech integration is approved.
D4 recommendation: approved static audio/PDF assets; optional clearly labelled synthetic speech
only after a separate decision, never presented as a native recording. For recording, begin with
local record/playback and explicit user permission; no cloud upload, persistence or auto-score.
Missing resources keep the relevant control unavailable with a reason. Speech availability and
permission denial must be tested; successful playback is not proof of pronunciation accuracy.

## 14. Observability

Record request outcome and content revision references for debugging; do not log credentials,
raw voice recordings or full private answer text. Track import totals/failed record keys and
whether publication occurred. Metrics and counters must come from confirmed backend outcomes.

## 15. Verification matrix — planned, NOT RUN

| Rules | Verification required |
|---|---|
| 1, 2, 4, 11 | Invalid content, duplicate keys, NFC/Unicode, missing media; dry-run; apply twice; update and failure recovery preserve ids/state |
| 3, 10 | Students A/B: forged ownership input rejected; no cross-account results after login switch or delayed response |
| 5, 6, 7 | Double-click, same submission retry, conflicting payload, lost response, DB rollback, forged correctness/XP |
| 8, 12 | Study mark differs from assessment; no writes to SRS, grades or gamification; null/unknown not rendered as zero |
| 9 | Missing file, playback error, microphone denial/unavailable; no fake completion or download toast |
| 10, 11 | Rapid HSK/category/search changes, browser back/forward, deep-link/reload and no-result filters |
| All UI | Production build, desktop/375px, keyboard/focus, light/dark, seven states, console/network review |

Build command when implementation starts: `pnpm --filter web build`; never root build.
UI -> API -> persisted state -> reload is required for feature acceptance. Docs check cannot
prove any of the runtime behaviors above.

## 16. Decisions required before implementation

| Decision | Recommendation | Owner / blocks |
|---|---|---|
| D1 Content | Approve the two exact source hashes after rights/pedagogy review; retain repeated ids pending editorial decisions | Content owner; publishing/import |
| D2 Storage | Versioned Mongo catalog + relational PG private progress/results; immutable revisions and withdrawal policy | Project/BE owner; physical schema/index/migration design |
| D3 Completion | Explicit self-reported study + confirmed practice results; mastery/XP/streak deferred until rules exist | Product/content owner; behavior and scope |
| D4 Media | Source real licensed audio/PDF; record/playback locally without upload or scoring first | Product/content owner; CR-3 and asset/voice implementation |
| D5 Transport | Define each operation in section 2 with exact path/method/DTO/errors, pagination, retry/conflict rules and limits | BE owner; all API implementation |

Deliverables in this task: audit, this proposal, two blocked Page Contracts, traversal and
updated indexes/records. **This is a review package, not a ready-to-code or accepted contract.**
Approval to implement must name the concrete schema/transport scope after D1–D5 are settled.
