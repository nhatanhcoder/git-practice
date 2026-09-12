---
status: completed-locally
---

# 2026-09-10 — Auth PR 55 review — Codex

## Scope and source

CODE / Auth scope A1+A2 explicitly approved by user: review Antigravity's completed work and
correct missing behavior. No schema/RBAC/money change. Startup sources read; prior session
Foundation/Grammar runtime remains blocked on proposed contracts. Original PR 55 head 7e2e2ab,
implementation 580218b, reviewed with CI logs. New branch from main 73bdd2c, claim e8b9f9e
committed alone, original implementation retained via cherry-pick 3b839bf.

## Findings and corrections

- High: one-hop trust enabled by default lets direct callers supply XFF and change rate-limit
  identity. Default now false; explicit safe-integer hop count or Express-validated address/CIDR
  list supported. Unrestricted true and malformed configuration fail startup. .env.example
  documents required origin protection and variable-hop risks. No deployment topology guessed.
- Medium: 19 new lint errors in original tests; replaced any casts with typed test interfaces
  and removed unused dependency. Real AuthController/AuthService/bcrypt exercised with stubbed
  persistence, avoiding the original accidental developer .env/database dependency.
- Added missing default-off/spoofed-XFF and write-sweep assertions. Original cleanup algorithms,
  five-failure policy and oldest-entry eviction retained. Controller uses only Express req.ip.
- Records missing from PR55: append-only KNOWN_ISSUES updated, including counter-policy and
  window-description conflicts. Shared storage and broader throttling remain out of scope.

## Verification and limits

9/9 isolated tests passed; new source/test targeted ESLint passed. Original PR55 GitHub run
34486450786 failed lint (19 new errors) and API type-check (A11 importer type incompatibility).
Local API build on latest main also fails at vocab-apply.ts:56. No unrelated importer edits.
Final full pnpm lint passed (no new suppressions). API type-check fails on the same existing A11 importer type error; check-docs all 9 passed and diff whitespace check is clean.
Local auth.e2e.test.ts, refresh-token-concurrency.e2e.test.ts and full DB suite NOT RUN: Docker
unavailable. Unit/controller tests are not counted as DB integration or deployment verification.
No remote changes or merge; publish permission for the new concrete payload is still needed
following automatic approval review rejection on the separate B+C+D branch.
