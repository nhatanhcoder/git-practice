# 2026-09-26 — API-020 CI fixture repair — Codex

Branch `feat/api020-supplemental-api`, propagated to the stacked P6/P7 branches after verification.
No DB schema, Auth, RBAC, money behavior, endpoint, or response contract changed.

## Completed
- Diagnosed PR #103–#105 `api-quality`: all stopped because the API-020 suite assumed a shared
  published learning unit that the CI seed does not provide.
- Made the suite self-contained with a uniquely named built-in Mongo learning-unit fixture.
- Asserted picker visibility by exact slug and guaranteed fixture cleanup in `after`.

## Verification
- `pnpm --filter api build` — pass after generating the fresh-worktree Prisma client.
- Targeted real-DB `supplemental-practice.e2e.test.ts` via the `tsx` CLI — 11/11 pass.
- `node scripts/check-docs.mjs` — required before commit.

## Follow-up
- Push the P5 fix, propagate it to P6/P7, and confirm GitHub Actions is green on PR #103–#105.
