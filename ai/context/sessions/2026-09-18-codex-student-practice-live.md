---
title: Codex — Student Writing, Lego and Workplace live integration
status: complete
date: 2026-09-18
branch: codex/student-practice-live
scope: S-SELF-4, S-SELF-5, S-SELF-6, private S-SELF-9 progress
schema_change: false
auth_rbac_money_change: false
---

# Outcome

Writing, Lego and Workplace no longer render production unavailable states or
read browser fixtures. The owner-approved corpora are in `apps/api/content/` and
all private progress uses the existing `UserStudyProgress` unique key. No schema
migration, Auth, RBAC or money behavior changed.

## Implemented

- Writing: 587-character catalog, full detail, optional stroke paths for 59
  characters, real canvas, and idempotent own “đã luyện” progress. Removed the
  coverage heuristic, best score, pass threshold and XP award.
- Lego: seven stations and 40 source sentences; deterministic shuffled block
  reads; complete-station server grading; idempotent attempted/correct markers;
  derived stars and prior-attempt unlock. Removed local stars and XP authority.
- Workplace: six source scenarios; model/keywords/corrections withheld on read;
  ordered nonblank reply submission reveals only model/translation/corrections;
  own turn completion is persisted. Reply text is not retained. Removed keyword
  and numeric scoring and XP.
- Contract: `docs/api/modules/student/06-writing-lego-workplace.md`; agreed error
  codes registered; Page Contracts, flow/index and API index updated to live.

## Verification

- `pnpm --filter api build` — pass.
- `node --import tsx --test test/student-practice-services.test.ts` — 3/3 pass.
- Focused API lifecycle with real configured Postgres/Mongo/Auth/RBAC — 4/4 pass
  after approved network escalation. The initial sandboxed full-suite attempt
  could not bootstrap external databases and was stopped; no assertion failure
  from this feature was counted as passing.
- `node --test apps/web/scripts/student-practice-live.test.mjs` — 3/3 pass.
- `pnpm --filter web build` — pass, all three production routes generated.
- `pnpm lint` initially found three new lint errors; fixed in `809ca04`; final
  full lint rerun passed with zero warnings/errors.
- `node scripts/check-docs.mjs` — pass before every commit.

## Commits before RECORD

- `29cd372` claim lane
- `a37c7ca` accepted contract + adopted corpus
- `cc3ae05` backend modules + service/API tests
- `10ecf01` live frontend integration + regression test
- `809ca04` lint corrections

## Remaining limitations

- Detailed SVG stroke paths exist for only 59/587 characters; the other 528 use
  named stroke order and the character ghost, without fabricated geometry.
- Workplace v1 is comparison practice, not AI assessment or an official grade.
- Broader `DOC-011` content-source debt outside these three corpora remains open.
