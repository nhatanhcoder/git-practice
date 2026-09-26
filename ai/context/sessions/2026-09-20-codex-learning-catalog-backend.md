# Session — Learning Catalog backend runtime

**Date:** 2026-09-20
**Agent:** Codex
**Branch:** `codex/learning-catalog-backend`
**Task type:** CODE
**Risk scope approved:** Learning Catalog DB schema correction + RBAC; no Auth or money behavior

## Started from

- PR #96 (Slice 1A migration) was merged into `main` with all three CI checks green.
- Slice 1B was unfinished: no teacher/admin runtime endpoints and no approved-path visibility in the
  student catalogue.
- Main checkout had unrelated dirty work, so this task used a managed worktree from `origin/main`.

## Implemented

- Added `LearningCatalogModule` with all 13 teacher authoring endpoints and all 8 admin moderation
  endpoints from the accepted module contracts.
- Enforced service-layer ownership, frozen path states, conditional atomic transitions, max 100
  units, complete reorder permutations, publish immutability, source-reference validation and
  no progress/SRS/Attempt writes.
- Added notification producers: submit → all active admins; approve/reject/suspend → owner, inside
  the same Postgres transaction as the guarded state transition.
- Added Student `GET /student/learning-path/curricula`, approved-path visibility, reference-word
  resolution and an explicit `unavailable` catalogue node when a referenced source disappears.
- Corrected a Slice 1A schema omission required by INV-LMOD-08 and the admin response contract:
  Postgres `restoredById/restoredAt`; Mongo `moderatedById/moderatedAt`; additive migration only.
- Added `learning-catalog.e2e.test.ts`: 12 named tests covering INV-LCAT-01..14,
  INV-LMOD-01..12 and the explicit role/visibility/concurrency branches from the handoff prompt.

## Verification

- PASS — `pnpm --filter api build`
- PASS — `pnpm --filter api type-check`
- PASS — `pnpm lint`
- PASS — `node --test apps/web/scripts/*.test.mjs` (238/238)
- PASS — `pnpm --filter web build` (43 static pages generated)
- PASS — `node scripts/check-docs.mjs` (9/9 before each commit so far)
- BLOCKED — real-DB Learning Catalog test: 12 discovered, 12 cancelled in the parent `before`
  hook; Prisma `P1001`, no Postgres listener at `localhost:5432`. This is **not** a test pass or a
  product assertion.

## Environment blocker

Docker Desktop 4.83 crashes before its engine starts because stale reparse-point
`C:\Users\nhata\AppData\Local\Docker\run\dockerInference` cannot be removed. Disabling Docker AI,
stopping all Docker processes and terminating the `docker-desktop` WSL distro did not release it.
Factory reset was not attempted because it is destructive to local Docker data. Filed BUILD-006.

## Next exact actions

1. Human reboots Windows or explicitly authorises/executes Docker Desktop repair/reset.
2. Run `docker compose up -d` and verify port 5432.
3. Apply the new migration, seed as required, run focused Learning Catalog e2e, then the complete
   API suite.
4. Only after real-DB green: replace the 🔶 progress flag with ✅, update the two module statuses to
   fully verified, commit RECORD, push, and open the PR.
