---
status: complete
task: student-leaderboard-badges-live
branch: codex/student-progress-live
last_updated: 2026-09-16
---

# Student leaderboard and badges live

## Outcome

Added read-only `GET /student/leaderboard` and `GET /student/badges`, then replaced both production-gated mock pages with live API states. Leaderboard eligibility is three official graded attempts and returns only a stable hashed alias, normalized score, count and rank. Badges are computed server-side for 1/5/10 graded attempts and one perfect score; earned time comes from `gradedAt`.

## Verification

- API type-check and build: pass
- Web type-check and production build: pass (44 routes)
- Workspace lint: pass
- Gamification rule tests: 3/3 pass
- Combined progress/gamification DB e2e: 7/7 pass
- Privacy assertions: no email, user id, nickname, prompt or answer content in leaderboard payload
- `node scripts/check-docs.mjs`: pass (9 checks)
- Mock grep on both routes: no `MOCK(`, rivals, local student store or production unavailable gate
- Production browser: leaderboard desktop + 375px and badges 375px inspected; both loaded live
  empty/partial states and measured `scrollWidth === clientWidth` with no horizontal overflow

## Remaining scope

XP, named levels/ranks, streak/timezone, retention metrics, social profiles, quiz-room realtime rankings and a wider badge catalog remain unapproved and unimplemented.
