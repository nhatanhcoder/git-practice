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

## Remaining verification

- Run the complete API test suite, workspace lint, web production build and check-docs after the
  record commit.
- Obtain a fresh independent review of the rebased PR #99 diff and merge only if CI is green.
