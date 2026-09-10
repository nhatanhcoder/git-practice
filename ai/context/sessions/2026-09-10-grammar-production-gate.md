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

Verification: full web scripts 147/147 passed, targeted Grammar lint passed, web build pending
final completion when this record was started. Live browser drill interactions NOT RUN yet.
Full repository lint has three pre-existing A08/A09 errors; not covered up with suppressions.
No PR pushed: automatic approval review blocked public publication of this task's separate
API payload; publication permission for the concrete new code packages must be obtained.
