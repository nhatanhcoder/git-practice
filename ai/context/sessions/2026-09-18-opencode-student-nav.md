## [2026-09-18] — Student nav restructure — opencode — branch `codex/student-nav-restructure`

**Context**: owner-approved plan (2026-09-18) from Codex: regroup the student
rail into Lớp học / Tự luyện / Kho kiến thức, move five account routes into the
avatar menu, and replace the mock topbar streak with the real SRS-stats streak
(null → "—"). No new routes/APIs; invoice move is link-only.

**Corrections to the plan found during analysis** (applied, recorded here):
- The rail was NOT flat — it already had PRIMARY/SECONDARY/ACHIEVEMENT groups;
  the work was regrouping, not grouping.
- XP/rank mock in the profile header left untouched (out of scope, recorded debt).
- TABBAR 4th slot became Lộ trình (invoices moved to avatar).

**Done** (all in `student-shell.tsx` + docs + tests):
- New CLASS/PRACTICE/LIBRARY/ACCOUNT nav configs (placement finally has a rail
  entry — it had a route but no nav item); rail renders home + 3 groups;
  tabbar = home/classes/assignments/learning-path; "Thêm" sheet grouped;
  prefetch list simplified (placement now in ALL_NAV_ITEMS).
- Avatar menu (desktop userchip + new mobilebar avatar button): identity header,
  lazy-loaded real streak row with retry, five account links.
- Streak HUD spans removed from both topbars.
- Docs: flow map billing/mistakes traversals + 5 Page Contract entry points
  (badges, invoices, leaderboard, progress, placement).
- Tests: new `student-nav-restructure.spec.ts` (rail order, avatar streak/links/
  Escape/focus, mobile groups/overflow); A02 streak assertion updated to absence.

**Verification (FULL LANE)**: web build · type-check · 238/238 unit · eslint
clean · check-docs 9/9 · nav PW 3/3 (+2 by-design skips) · A02-1 green ·
desktop + 375px screenshots read (rail groups, avatar, mobile sheet).

**Notes for next**: A02 test 3 asserts UnavailableState for now-live routes
(pre-existing staleness, untouched). Seeded profile shows a real session
nickname, not mock. Stale `:3000` servers repeatedly poisoned PW runs — kill
before running.
