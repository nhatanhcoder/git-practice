---
status: completed-locally
---

# 2026-09-10 — Grammar production gate — Codex

CODE, authorized checklist G. No schema/Auth/RBAC/money change. Claim committed alone in
37d2256; latest Foundation/Grammar session and mandatory startup sources read.

GrammarPage now only selects UnavailableState in production or GrammarInner in development.
All demo hooks remain inside GrammarInner. The two runtime regression tests transpile and
execute the actual page export, failing if it executes hooks or selects the wrong component.
Observed red before refactor, 2/2 green afterward. Removed only this page's obsolete
rules-of-hooks suppression; the existing other lint debt remains visible.

The separate uncommitted Real-fe-prod-hooks change is unsafe: it moved the production guard
into MatchExercise, leaving GrammarPage unguarded. It was inspected, not modified or merged.
The proper fix in this branch is four added source lines and preserves all drill/drawer/modal
code. Page Contract remains contracted/proposed; backend remains NOT IMPLEMENTED.

Verification: full web scripts 147/147 passed, targeted Grammar lint passed, web build passed: compiled successfully, 42/42 pages on base 8050cba. Live browser drill interactions NOT RUN yet.
Full repository lint has three pre-existing A08/A09 errors; not covered up with suppressions.
No PR pushed: automatic approval review blocked public publication of this task's separate
API payload; publication permission for the concrete new code packages must be obtained.

## Resumed 2026-09-11

Implementation d00cf0b remains local. Final record update was interrupted by quota.
Main a28298b has fixed the three unrelated lint findings. PR55 head 9128ae8 now independently
uses the correct GrammarInner wrapper; the earlier warning concerns only the separate
uncommitted Real-fe-prod-hooks version. No need to apply both source refactors. These runtime
regressions and suppression cleanup can accompany whichever wrapper is selected for review.
Browser drill interaction remains NOT RUN; production backend remains NOT IMPLEMENTED.
