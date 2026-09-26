---
status: complete
owner: codex
last_updated: 2026-09-26
---

# PR #99 review fixes and migration-first rollout

## Done

- Split the restore-audit Prisma fields and SQL migration from PR #99 into migration-first PR
  #100. Prisma validate, check-docs, all three CI jobs and independent review passed; PR #100 was
  squash-merged before the runtime branch was rebased.
- Rebased `codex/learning-catalog-backend` on the resulting `main`; the migration and Prisma schema
  are no longer part of PR #99's runtime diff.
- Added a shared PostgreSQL transaction-scoped advisory lock per Learning Path. Teacher path/unit
  mutations, submit, Admin moderation and authored-unit unpublish reload state while holding the
  same lock, closing the stale frozen-state window.
- Serialized count, cap validation, order allocation and insert for authored units. Concurrent
  creates at 99 units now produce one success and one validation error without duplicate order or
  a 101st unit.
- Added deterministic real-DB regression cases for the frozen transition race and the concurrent
  100-unit boundary. The focused catalog suite passes 14/14.

## Verification completed before record

- `pnpm --filter api type-check`
- `pnpm --filter api build`
- focused `learning-catalog.e2e.test.ts`: 14/14 pass against local PostgreSQL and isolated MongoDB

## Final local verification

- Workspace lint: pass.
- `pnpm --filter web build`: pass (43 static/dynamic routes generated).
- `node scripts/check-docs.mjs`: 9/9 pass.
- Full local API suite: 378/380 pass. Both failures are outside this slice and depend on reused
  `hsk_dev` state (`GET /admin/pay-rates` fixture lookup and Admin Users pagination while the
  shared database contains additional rows). The focused catalog suite still passes 14/14 inside
  that same full run. This local result is not reported as a full-suite pass; clean isolated CI is
  the merge gate.

## Remaining verification

- Obtain a fresh independent review of the rebased PR #99 diff and merge only if clean CI is green.
