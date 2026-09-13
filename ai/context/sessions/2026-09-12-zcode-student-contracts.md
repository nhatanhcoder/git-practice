## [2026-09-12] — Page Contracts for ten remaining student routes — zcode — branch `docs/student-page-contracts`

**Context**: owner asked for Page Contracts per remaining student item (route, RBAC, 7 states,
data, endpoint), endpoints unapproved → ⛔ + a "Needs" entry, nothing invented, **no `apps/`
changes**; the notifications contract must match the notifications branch's BE, conflicts → ask.

**Task type**: DOCS. No schema, Auth, RBAC, or money change; no `apps/` file touched.

**Scope decided** (student routes still missing contracts after PR #71): notifications, mistakes, exams, placement, progress, leaderboard, badges, writing, lego,
workplace — 10 contracts. Deliberately out: `/student` dashboard (no FEATURES row; its own
follow-up), attempts take/result + invoices (already contracted in open PRs #73/#72).

**Done**:
- S-ASGN-1 uses the `student-assignments-list.md` contract merged by PR #71; this PR does not add a duplicate contract.
- `student-notifications.md` — written against the **merged** module 07 BE (PR #67 landed the
  branch; the controller/DTO/service on `origin/main` are the source of truth, not memory):
  role-agnostic `/api/v1/notifications` (4 endpoints), 11-type enum, no display text from the
  API (FE builds sentences from `type` + `payload`), limit cap 50, idempotent read marks,
  read-all → `{updated}`, append-only (no POST/DELETE). **Flagged, not silently fixed**: the
  FE deep-link helper returns `null` for `referenceType: "invoice"` with a stale comment "S-BILL-1/2
  screens don't exist yet" — they now do (PR #72); the contract specifies the invoice
  deep-link target, and the wiring fix belongs to the notifications lane's `apps/` code.
- Nine ⛔ prototype contracts (`built (mock)` statuses): mistakes, exams, placement, progress,
  leaderboard, badges, writing, lego, workplace. Each carries its real blocker in the Data
  section: DOC-017/ADR-005 0-byte stub (exams, placement), reserved-but-undescribed analytics
  paths (progress — **conflict with PROGRESS Sprint 5 recorded, no side picked**), DOC-011
  corpus + progress contracts (writing, lego, workplace), aggregation/privacy rules
  (leaderboard), server-authoritative unlocks (badges), collection endpoints (mistakes —
  source data now exists via PR #73).
- `_INDEX.md`: 10 new rows; the "mockups outside the pipeline" note retired — every student route
  is now mapped. Flow map: blocked-branch table + extended Missing endpoints.
- `ai/PROGRESS.md` § Needs from the other lane: four new unchecked needs (analytics spec,
  S-MSTK collection, exam/placement transport, gamification cluster).

**Mechanics worth remembering**: the status-drift check's regex only matches a status cell
that is a bare lowercase word — suffixes like `built (mock)` or `contracted (proposed)` are
skipped, which is how the ⛔ mocks stay honest without failing on existing routes.

**Verification**: every relative link in the changed docs checked against disk (the flow map's
nine new links were initially wrong — `./student-pages/` twice — caught by check-docs' broken-link
check before commit) · `check-docs` **9/9** · no `apps/` file touched (`git status` clean of apps/).

**Blocker / needs follow-up**:
- Notifications invoice deep-link wiring (their lane, one line) once PR #72 merges.
- The four Needs entries are now the FE↔BE contract backlog for the student lane.

**Next steps**:
- Review/merge PR for `docs/student-page-contracts` (and #72, #73 — the _INDEX table will
  conflict lightly across the three; merge order resolves by keeping all rows).
