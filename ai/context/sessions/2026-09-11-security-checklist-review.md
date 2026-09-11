---
status: blocked-publication
---

# 2026-09-11 — Security checklist review continuation — Codex

## Startup and approved scope

Continued CODE task, with existing explicit Auth approval limited to A1+A2 review/correction.
AGENTS, project brain, working rules, known issues, handoff/progress and latest Antigravity
session reviewed. Previous work left final API/Grammar records interrupted by quota, no public
push permission for new code, no local isolated databases, and main's A11 type error.
No new schema, RBAC, money, or broader rate-limit policy changes were made.

## Concrete local results

- codex/auth-proxy-review: e423524 fixes default-off proxy trust and test lint; A1 cleanup
  retained from Antigravity. Nine isolated tests and full lint passed. DB suites NOT RUN.
- codex/api-bootstrap-hardening: 262c0dd code, af84e38 final record. Helmet, real production
  Swagger gate checks, and HTTP drain before resource teardown. Three isolated tests and
  API build/type-check passed on base 8050cba. Real database teardown/Linux signal NOT RUN.
- codex/grammar-production-gate: d00cf0b code, e5c1b2e final record. Wrapper regression,
  147/147 web tests, build 42/42 and targeted lint passed on base 8050cba. Browser drill
  interactions NOT RUN. Production Foundation/Grammar backend remains NOT IMPLEMENTED.
- check-docs all nine checks passed before each resumed record commit. No new issue ID.

## Updated PR55 review

Remote head is now 9128ae8 (OPEN; statusCheckRollup empty at inspection). Since 7e2e2ab it
also contains Throttler, UI/login changes, Helmet and the correct GrammarInner wrapper.
Do not duplicate the Grammar source refactor; its current wrapper is correct. Preserve
unrelated UI changes. The earlier wrong MatchExercise gate was in a different worktree.

Remaining concerns in PR55: trust defaults to one hop; no deployment proof blocks direct XFF
spoofing. Production Swagger assertion is only a local constant/boolean test; shutdown asserts
only method existence. Neither establishes HTTP behavior or graceful DB-backed draining.
The new register=10/minute, login=20/minute and global=1000/minute Throttler policies are a
separate addition, beyond the approved cleanup/IP correction. Their thresholds and coexistence
with the five-failure limiter require contract review; this branch does not remove or endorse
those changes. Existing custom-limiter verification does not cover the new global guard.

## Blockers and publication

Main remains 73bdd2c with A11 importer type incompatibility at vocab-apply.ts:56; outside this
named scope. Docker command unavailable locally. No DB suite, browser interaction or hosted
CI run is reported as passing based on source scans or unit tests.

Automatic approval review rejected pushing the separate hardening payload to public
nhatanhcoder/git-practice: prior publication approval covered Foundation/Grammar documents.
The user resumed work but has not explicitly authorized public publication of these three
new code branches. All three are local, committed and reviewable. Request permission to push
these concrete code/test/record packages and create review PRs; no merge or deployment.
