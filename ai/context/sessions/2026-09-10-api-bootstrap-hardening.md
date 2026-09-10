---
status: in-progress
---

# 2026-09-10 — API bootstrap hardening — Codex

## Scope and approval

CODE, user-approved checklist B+C+D and H; backend lane assigned to Codex for this task.
No DB schema, Auth algorithm, RBAC or money changes in this branch. A1+A2 are claimed in
fix/auth-map-cleanup-trust-proxy but only a claim commit and untracked test were located;
requested the completed revision from the owner. G is separate.
Startup: AGENTS, five always-loaded files and newest session read. Prior Foundation/Grammar
contracts are now merged but proposed D1–D5 decisions and runtime endpoints remain unresolved.
Claim committed alone as 00b30f3, after check-docs 9/9.

## Implementation

Helmet covers API responses, with production HSTS and restrictive script CSP; development
allows Swagger initialization and does not force HTTPS on localhost. Swagger UI/JSON/YAML
are mounted only outside production. SIGTERM/SIGINT stop accepting requests, drain up to
30 seconds, then app.close() runs Nest teardown. Automatic enableShutdownHooks is intentionally
not added because its provider-first order can disconnect Prisma before active requests finish.
F logging/request-id remains optional/deferred; multi-instance API-016 is unchanged.
H documentation records custom composite-key limiter vs the independent-counter spec conflict.

## Verification

- API build passed after documented BUILD-002 package repair; type-check pending final result.
- Isolated HTTP and shutdown tests: 3/3 passed. Windows emits the same signal event in a child;
  Linux CI sends actual SIGTERM. The fixture proves provider lifetime, not actual DB teardown.
- Added real AppModule health/login/refresh integration test for existing isolated DB CI.
- Local full API suite NOT RUN: Docker unavailable; no developer database used.
- Full lint FAILS on three existing main findings from A08/A09: two no-useless-escape findings
  at student-class-detail.test.mjs:163, unused hasLessons at classes/[classId]/page.tsx:203.
  New bootstrap source/tests pass targeted ESLint. No baseline suppression added.
- check-docs 9/9 passed; git diff --check clean.

## Remaining review

Run hosted isolated API CI and record actual results. Real Prisma/Mongoose SIGTERM disconnect
is not yet asserted by the fixture. Review G separately: the uncommitted Real-fe-prod-hooks
version moves Grammar's gate into MatchExercise instead of GrammarPage, exposing production
demo content. Do not merge that change as-is. No merge or deployment authorized.
