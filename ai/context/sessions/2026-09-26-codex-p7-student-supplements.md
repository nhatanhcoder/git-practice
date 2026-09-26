# 2026-09-26 — P7 student supplements + assigned grammar — Codex

Branch `feat/api020-student-supplements`, worktree `../Real-p7`, stacked on P6
`feat/api020-teacher-supplements`. Owner approved the P7 plan after the existing claim commit.
No DB schema, Auth, RBAC or money behavior changed.

## Completed
- Extended the Student lesson-detail contract and added its v1 page spec.
- Rendered API-020 `supplements[]` in server order with unit/grammar destinations, kind chips,
  a successful empty state and a non-interactive unavailable row that exposes no stale title or
  source key. Shared class-list payloads remain compatible because supplements are optional there.
- Extended the Student grammar contract and added its v1 page spec.
- Added the “Giáo viên giao” filter. It sends `assignedOnly=true` to the server and composes with
  HSK level, category and search; the empty result has specific, honest copy.
- Made point selection deep-linkable with `?point=`. A request sequence prevents stale detail
  responses from repainting another selection. Close removes only the point; browser Back closes
  a point opened from the catalog and preserves filters. Finishing a drill also clears the point.
- Updated the page index: S-LESSON-4 is live through API-020; S-LESSON-3 remains unavailable.

## Verification
- `pnpm --filter web type-check` — pass.
- `pnpm --filter web lint` — pass.
- `pnpm --filter web build` — pass, 43/43 routes.
- `node scripts/check-docs.mjs` — pass, 9/9.
- Production Playwright targeted P7 suite — 8/8 across desktop and 375px:
  ordered lesson links, unavailable secrecy, lesson empty, assigned query/empty, combined filters,
  deep-link close and browser Back. Screenshots read; no horizontal overflow.
- The committed P7 browser cases mock accepted HTTP envelopes. P5 retains the real-DB proof for
  active-enrollment filtering and supplement resolution. The broader live grammar tests were not
  counted as P7 passing evidence during the isolated-port run; see BUILD-007.

## Commits
- `8486905` — contracts and page specs.
- `9eeb35b` — Student P7 UI and browser coverage.

## Follow-up
- Merge dependency order: P4 → P5 → P6 → P7.
- Push this branch and open the stacked P7 PR.
