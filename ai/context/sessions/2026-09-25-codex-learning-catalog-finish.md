---
status: complete
owner: codex
last_updated: 2026-09-25
---

# Learning Catalog backend verification and handoff

## Done

- Rebased `codex/learning-catalog-backend` onto current `origin/main` without replacing the
  existing implementation.
- Deployed migration `20260920120000_add_learning_catalog_moderation_audit` to local `hsk_dev`.
- Fixed only the new catalog e2e harness: compiled imports now include `.js`, and assertions use
  the flat error envelope required by `API_CONVENTIONS.md`.
- Ran the shared Teacher/Admin/Student Learning Catalog invariant suite against real PostgreSQL
  and an isolated Mongo database: 12/12 passed, zero cancelled.
- API build, API type-check, workspace lint, web production build and check-docs passed.

## Verification boundary

- The 12 catalog cases cover INV-LCAT-01..14, INV-LMOD-01..12, role denial, ownership,
  concurrency, notifications, immutability, reference behavior and Student visibility.
- A sequential local full-suite attempt stopped in the unrelated payroll/billing test file at
  `GET /admin/pay-rates`: 22/23 cases in that file passed. Money code was not changed because it is
  outside the approved scope. The clean CI database run remains the full-regression merge gate.
- On Windows, the package wildcard and multi-file `tsx` invocation only ran the first test file;
  those partial runs are not reported as full-suite passes.

## Contract decisions preserved

- No Auth or money behavior changed.
- Teacher ownership is enforced in the service layer; Admin alone performs moderation.
- Published unit content remains immutable, and suspend/unpublish never deletes learner progress.
- Error responses remain the project-wide flat envelope (`body.code`), not nested errors.

## Remaining work

- Teacher and Admin Learning Catalog screens are separate frontend slices and remain unimplemented.
- Class-lesson supplements and assigned Grammar remain blocked on the separate API-020 contract.
