---
status: in-progress
---

# 2026-09-08 — CI quality gates — Codex

Branch: codex/ci-quality-gates. Base: main at 99a511c. User explicitly selected the CI
task from the reviewed list. CODE/tooling only; no DB schema, Auth, RBAC or money behavior
changes. Previous session A07 live browser verification remains separate and unfinished.

## Done

- Added ESLint 10 with TypeScript recommended checks and React hooks checks, using an
  explicit legacy baseline (336 findings / 62 files, DEBT-006).
- Added web type-check and CI-specific API test scripts; Next 14's old embedded lint
  integration is replaced by the standalone mandatory CI lint step.
- Added web and API CI jobs; API uses disposable Postgres 16 / Mongo 7 databases.
  Existing migrations and seed run only after the CI target guard.
- Added database-target guard regression and doc-check enforcement of quality commands.
- Documented actual Node runner, job-level isolation, baseline limits and branch protection.

## Verification

- API type-check and API build passed locally.
- 111 frontend/tooling tests passed before the doc-check enforcement addition; targeted
  recheck of the modified doc-check test is in progress.
- Web build compiled and generated all 42 routes; final completion pending.
- Hosted CI pending. Docker is not installed locally; no developer database tests were run.

## Follow-up

- Await final local checks, push and open PR, verify fresh CI and record results.
- Branch protection must be configured by the owner; no merge/deploy is authorized.
- User requested a second read-only review of the 11 recommendations during this work;
  findings are reported in the conversation, unrelated fixes remain deferred.
