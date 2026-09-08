---
status: completed
---

# 2026-09-08 — CI quality gates — Codex

Branch: codex/ci-quality-gates. Base: main at 99a511c. User explicitly selected the CI
task from the reviewed list. CODE/tooling only; no DB schema, Auth, RBAC or money behavior
changes. Previous session A07 live browser verification remains separate and unfinished.

## Done

- Added standalone ESLint 10, TypeScript and React hooks checks with an explicit legacy
  baseline of 336 findings across 62 files (DEBT-006 remains open).
- Added web/API type checks and builds, frontend/tooling tests, and API integration tests
  using disposable PostgreSQL 16 / MongoDB 7 services. Existing migrations and seed execute
  only after the CI database-target guard; API tests run serially and share job-local seed.
- Added guard regression tests and a ninth docs check enforcing the required CI commands.
- Documented commands, isolation and baseline limitations in docs/testing/CI.md.
- Opened https://github.com/nhatanhcoder/git-practice/pull/50; no merge or deployment.

## Verification

- Local API/web type checks and builds passed; web build generated 42 static pages.
- Local baseline-aware lint passed. 111 frontend/tooling tests passed; subsequent targeted
  checks of the modified docs-check test and database guard passed (2/2).
- GitHub Actions quality run 34252312577 passed web-quality and api-quality, including
  isolated API migrations, seed and integration tests. Docs run 34252312622 passed.
- Local Docker is unavailable; no developer databases were used for verification.
- node scripts/check-docs.mjs: 9/9 passed before implementation commit.

## Workspace incident

An external task switched the shared checkout branch during implementation. The local
implementation commit briefly landed on local main, without any push to main. Work was
moved to D:/PersonalProject/Real-ci-quality on codex/ci-quality-gates (c4a8e2e), then the
clean original main was restored to 99a511c. Subsequent work used the isolated worktree.

## Second review of the 11 recommendations

1. CI gates: implemented and hosted checks passed; branch protection is an owner action.
2. CSS Modules plus Tailwind: valid combination; document responsibilities, not a bug fix.
3. Duplicate HanLu token files: identical hashes; consolidate through a separate scoped task.
4. Tailwind colors: hardcoded values duplicate tokens; connect to shared CSS variables.
5. Admin users search: no debounce or request abort; mounted-state guard only avoids stale UI.
6. TanStack Query: installed but unused; adoption is optional architecture work.
7. Unused dependencies: Axios/Query have no source imports found; decide adoption before removal.
8. Config validation/prefix-cookie mismatch: missing startup validation and hardcoded Auth
   cookie path; Auth-related changes require named approval.
9. Shared transport types: packages/types absent; reduce manual contract duplication later.
10. Documentation: stale project status and Auth policy mismatch remain; entity specs win,
    and unresolved policy conflicts must be recorded rather than silently implemented.
11. General API throttling: policies/error contract and multi-instance storage remain undefined;
    @nestjs/throttler alone with in-memory storage does not solve distributed limits.

## Remaining

- Review and merge PR #50 only with user authorization; configure required branch checks.
- Legacy lint debt, unrelated modernization and Auth cache/counter lifecycle findings remain
  unfixed. No critical exploit was confirmed; existing tests cover only their tested scope.
