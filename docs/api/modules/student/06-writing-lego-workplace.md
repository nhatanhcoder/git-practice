---
module: student-writing-lego-workplace
status: accepted — owner-approved implementation 2026-09-18
blocked_by: none for this bounded slice
owner: project owner
last_updated: 2026-09-18
---

# Writing, Lego and Workplace — live self-study contract

## 0. Scope and authority

This module implements S-SELF-4, S-SELF-5, S-SELF-6 and their private-progress
slice of S-SELF-9. The owner approved the complete bounded scope on 2026-09-18:

- adopt the audited `writing.json`, `strokes.json`, `lego.json` and
  `workplace.json` corpora into `apps/api/content/`;
- reuse PostgreSQL `UserStudyProgress`; no schema migration;
- remove prototype XP, handwriting coverage scores and workplace keyword scores;
- grade Lego block order on the server;
- make Workplace a model/rubric comparison flow, not an AI or numeric grader.

This does not change Auth, RBAC, DB schema, money behavior, official grades,
teacher visibility, SRS scheduling or the XP economy.

## 1. Storage and ownership

Content is immutable, file-backed repository data parsed and validated by the
API. A malformed corpus fails the content load; records are never silently
dropped. Writing's optional stroke-path enhancement covers only the characters
present in `strokes.json`; absence is returned honestly as `strokePaths: null`.

Private progress uses the existing unique
`UserStudyProgress(userId, contentKind, contentKey)` row:

| Feature | `contentKind` | `contentKey` | Meaning of `studied=true` |
|---|---|---|---|
| Writing | `writing` | character source id | learner explicitly saved a practice canvas |
| Lego | `lego` | `station:<id>` | learner submitted a complete station attempt |
| Lego | `lego` | `sentence:<id>` | learner has submitted that sentence in correct order |
| Workplace | `workplace` | `turn:<scenarioId>:<turnId>` | learner submitted a nonblank reply and revealed the model |

Every query/write is scoped to the access-token subject. Request DTOs never
accept `userId`. Progress is voluntary self-study and never an official score.

## 2. Writing transport

| Method + path | Contract |
|---|---|
| `GET /student/writing` | Lean HSK 1–9 character list in corpus order. |
| `GET /student/writing/progress` | `{ practised: [{ characterId, practised, updatedAt }] }`; absent means never practised. |
| `GET /student/writing/:id` | Full character, words, mnemonic, named strokes and optional `strokePaths`. |
| `PUT /student/writing/:id/progress` | Body `{ practised: true }`; idempotently records explicit practice and returns the row. |

Unknown character id returns `WRITING_CHAR_NOT_FOUND` 404. The server does not
score canvas pixels, recognise handwriting, count attempts or award XP.

## 3. Lego transport

| Method + path | Contract |
|---|---|
| `GET /student/lego` | Seven source stations plus own derived `{ attempted, correctCount, total, stars, unlocked }`. Station 1 is open; each next station unlocks after the previous station has been attempted. |
| `GET /student/lego/stations/:stationId` | One station with sentences and deterministically shuffled source blocks. Canonical order is not returned before submit. |
| `POST /student/lego/stations/:stationId/attempt` | Body `{ answers: [{ sentenceId, blockIds }] }`; exactly one complete permutation for every station sentence. Server grades exact block-id order and returns per-sentence result, canonical reveal, and derived station progress. |

The attempt write is convergent: the station marker and every newly correct
sentence are idempotent upserts. Repeating a request cannot add XP, counters or
duplicate rows. Stars are derived, never client supplied: one star after a
complete attempt, two at `correctCount / total >= 0.5`, three at `>= 0.8`.
Unlock is presentation progression, not an authorization boundary; direct
reading remains allowed for this voluntary practice catalog.

Unknown station returns `LEGO_STATION_NOT_FOUND` 404. Invalid/missing/duplicate
sentence or block ids return existing `VALIDATION_ERROR` 400.

## 4. Workplace transport

| Method + path | Contract |
|---|---|
| `GET /student/workplace` | Six source scenario summaries plus own `{ completedTurns, totalTurns, completed }`. |
| `GET /student/workplace/:scenarioId` | Full briefing, rubric, vocabulary, phrases and turns, but no model answer, keyword list or corrections. |
| `POST /student/workplace/:scenarioId/turns/:turnId/reveal` | Body `{ reply: string }` (trimmed, 1–2000 chars). Returns that turn's model answer, translation and reviewed corrections, then marks the turn complete. |

Turns must be revealed in source order; skipping a prior turn returns existing
`VALIDATION_ERROR` 400. The submitted reply is not persisted. The response has
no numeric score, pass/fail, keyword coverage or AI claim. Scenario completion
is derived only when all source turns have progress rows.

Unknown scenario returns `WORKPLACE_SCENARIO_NOT_FOUND` 404; an unknown turn
within a known scenario returns `WORKPLACE_TURN_NOT_FOUND` 404.

## 5. Invariants

1. Only the repository corpus is served; production never falls back to FE fixtures.
2. A malformed corpus fails explicitly instead of publishing a partial catalog.
3. Every progress read/write is scoped by the authenticated student id.
4. Client correctness, scores, XP, mastery and completion values are never trusted.
5. Writing records practice only; it never claims handwriting recognition.
6. Lego correctness is exact canonical source-block order graded by the server.
7. Lego attempt replay converges on the same existing progress rows.
8. Workplace model/corrections are withheld until a nonblank reply is submitted.
9. Workplace replies are not retained and no numeric/AI evaluation is implied.
10. Self-study progress never becomes an Assignment/Attempt grade or teacher-visible signal.

## 6. Verification obligations

- service unit tests cover corpus validation, not-found behavior and derivation rules;
- controller/API integration tests cover Student-only access and self-scoped writes;
- frontend tests prove production pages call live services and contain no fixture,
  XP, fake handwriting score or workplace keyword-score path;
- `pnpm --filter web build` and `node scripts/check-docs.mjs` must pass.

