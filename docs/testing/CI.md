---
status: active
---

# CI quality gates

The `quality` workflow runs on pull requests, pushes to main, and manual dispatch.
This describes the executable Node test runner setup; the older TEST_STRATEGY.md
Jest/Supertest examples are not the current runner.

## Gates

- `pnpm lint`: ESLint 10 recommended JavaScript/TypeScript checks and React hook rules.
- `pnpm --filter web build`, then `pnpm --filter web type-check`: Next generates route
  types before the standalone TypeScript check. Next 14's embedded lint runner is
  disabled because lint is a separate mandatory gate using current ESLint.
- `node --test apps/web/scripts/*.test.mjs scripts/*.test.mjs`: frontend regressions
  and tooling tests. This does not run the Playwright browser suites.
- `pnpm --filter api type-check`, `pnpm --filter api build`, `pnpm --filter api test:ci`:
  real API integration tests after Prisma generation, migrations and seed.

Node 24 and the pnpm version from package.json are used with a frozen lockfile.
The separate docs-check workflow remains mandatory and checks the quality gate commands.

## Database isolation

Each API job gets fresh PostgreSQL 16 and MongoDB 7 service containers. Both databases
are named `hsk_ci`, use runner-local ports, and are destroyed with the job. No repository
secrets, Atlas databases, development databases or checked-in environment files are used.
The database guard runs before migrations/seed and again before tests; it rejects a root
`.env`, remote hosts, unexpected database names/ports and connection query overrides.

Suites run serially because the current tests share mutable fixtures within a run.
Isolation is **per CI job**, not per test. Existing migrations and development seed run
only against these disposable services. A passing suite covers implemented endpoints only.

## Legacy lint baseline

`eslint-suppressions.json` records pre-existing findings by file/rule/count. It is an
explicit migration baseline, not a clean-code claim. New files and counts above the
baseline fail CI. Replacing one violation with another of the same rule in the same file
can remain under that count; review is still required. Unused suppressions fail the gate.
Never regenerate the baseline in CI or increase it to make a PR green. When fixing debt,
prune the obsolete entries with ESLint's `--prune-suppressions` option and review the diff.

The baseline avoids mixing application behavior changes into CI setup. Hook-order
findings and remaining type-safety issues need their own reviewed follow-up.

GitHub branch protection must require `web-quality`, `api-quality` and `check-docs`
to block merges; adding a workflow does not change repository protection settings.
