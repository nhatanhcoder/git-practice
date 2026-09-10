## [2026-09-08] — A09: Student leave class against the real API — OpenCode

**Context**: A08 already contained the basic `DELETE /student/classes/:id/leave` call from
`60728c2`, but A09's checklist also requires cancel/failure/reload/rejoin behavior. This work was
rebased onto current `origin/main` (A07 merged in PR #48) and kept A07 join plus A08 detail code.

**Done**:
- Preserved the server-backed leave action: `DELETE /student/classes/:id/leave`.
- Added pure leave-error mapping for the documented registry codes and a network fallback.
- Confirm keeps the modal locked while pending; cancellation performs no request; failure keeps the
  modal and class visible; redirect happens only after the server confirms success.
- Removed the stale A07 unavailable placeholder assertion from the classes-list path; the page now
  remains server-backed with no local class mutation.
- Added four A09 regression tests covering error mapping, endpoint/no-local-delete invariants,
  cancel versus confirm separation, and stale placeholder removal.

**Verification**:
- Red phase: the new test suite failed because `describeLeaveFailure` did not exist.
- Green phase: `node --test apps/web/scripts/student-class-detail.test.mjs` **35/35**.
- Full serial run: `node --test apps/web/scripts/*.test.mjs` **145/145** across 34 suites.
- `pnpm --filter web build`: **clean, 42/42 routes, zero warnings** after a fresh install.
- `node scripts/check-docs.mjs`: **8/8**.
- Live API sequence (leave, reload list, deep-link detail denial, rejoin) is **NOT RUN** because
  Docker Desktop's Postgres/API engine is unavailable (rechecked at commit time). No live result
  is counted as pass.

**Environment incident worth repeating**: running `pnpm --filter web build` and
`node --test apps/web/scripts/*.test.mjs` in parallel with a fresh worktree `pnpm install`
left `node_modules` partially extracted — `lucide-react` was missing icon files (`circle-alert`,
`archive`, `inbox`, `ellipsis`), and a later build failed on `/teacher/classes` imports.
`pnpm install --frozen-lockfile` reported "Already up to date" without repairing anything
(pnpm's up-to-date check does not inspect package contents), and neither did `--force`.
The fix was deleting `node_modules` (root + apps) and reinstalling, then removing the stale
`apps/web/.next` — the leftover webpack cache pointed at the replaced `node_modules` and produced
fake "Attempted import error" warnings for `ArrowLeft`/`FileText`/`PlayCircle` etc. on a healthy
tree. **Never run install and build/test concurrently in one worktree, and clean `.next` after
replacing `node_modules`.**

**DB/Auth/RBAC/money**: none changed. Backend/schema/RBAC were not modified.

**Next steps**:
- Run the live A09 sequence when Docker is available, then verify the production browser flow at
  desktop and 375px before opening the PR.
