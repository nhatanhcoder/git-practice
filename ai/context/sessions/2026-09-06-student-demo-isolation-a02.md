## [2026-09-06] — Student Demo Isolation & Production Gating (A02 / WEB-016) — Codex — branch `codex/a02-isolate-demo`

**Context**:
TASK A02 from `docs/prompts/student-integration-checklist.md` §A02 (depends on A00 merged via PR #42,
A01 merged via PR #43). The production student build still presented local demo state as the signed-in
learner's own data: the DEMO state switcher shipped in production (`WEB-016`), `?demo=1` / a storage
flag enabled it, XP/rank/streak came from the `hanlu-student` mock store, and 20 backend-less routes
let a real account "complete lessons", "submit attempts" and "earn XP" against localStorage.

**Done**:
1. **Demo tooling gated to development** (`components/student/controls.tsx`):
   `useDemoToolsEnabled()` returns `false` unconditionally when `NODE_ENV === "production"` —
   `?demo=1` and the `hanlu-demo` storage flag are both ignored there, so `DemoStateSwitcher`
   never mounts (`WEB-016`). Dev/demo behavior unchanged.
2. **Preferences split from demo progress** (`lib/student/preferences.ts`, new):
   theme/pinyin/meaning now live in their own `hanlu-preferences` zustand-persist store. Migration
   is read-only: if the new key is absent, initial state inspects the legacy `hanlu-student`
   without modifying or deleting it (`lib/student/demo-rules.ts`, pure helpers, zero deps so
   `node --test` imports them directly). No mass localStorage wipe.
3. **Progress neutralized for real accounts** (`lib/student/store.ts`, `student-shell.tsx`):
   `useStudentProfile()` returns neutral stats (0 XP/streak, "Học viên") in production;
   `unlockNode` (100-XP force unlock) is demo-only; the shell userchip/profile drawer show the
   real account (email, join month) instead of mock rank/level; the profile drawer's mockup note,
   placement link and demo-reset button are dev-only.
4. **Honest unavailable states** (`components/student/unavailable-state.tsx`, new):
   all 20 backend-less routes render `UnavailableState` in production — the 11 gated by the first
   working-tree pass (assignments, attempts + result, exams + detail + result,
   learning-path/[nodeId], placement, workplace/[scenarioId], writing/[charId]) plus 9 more gated
   in this session (learning-path, grammar, foundation, writing, lego, workplace, badges,
   leaderboard, progress) — each still writes/awards mock XP locally otherwise
   (e.g. lego `awardXp`/`setLegoStars`, grammar `practiseGrammar`). Dev/demo unaffected.
5. **Production dashboard** (`(app)/page.tsx`): mock widgets (continue-learning hero, rank/streak,
   HSK ladder, review queue, activity, week chart) replaced by a production-only block that lists
   the three genuinely live features (flashcards, mistakes, classes). Hook order untouched —
   the swap is render-only, so no rules-of-hooks hazard.
6. **Tests**:
   - `scripts/student-demo-isolation.test.mjs` (new, 10 cases): preference resolution +
     non-destructive legacy read, demo-tool gating, XP unlock gating, progress neutralization.
   - `tests/student-demo-isolation.spec.ts` (new, Playwright, production build + real API login
     as seeded `student@hsk.local`): switcher absent with `?demo=1`, neutral userchip/HUD,
     profile drawer shows the real account and hides demo tools, 19 unbacked routes (incl.
     detail slugs) render `UnavailableState`, theme toggle writes `hanlu-preferences` while
     `hanlu-student` survives byte-for-byte, dashboard shows only live features.
     Aligned to the real DOM (`.userchip__text`, `.sheet`, `.unavailable-state`, per-page titles)
     after the first draft referenced selectors that did not exist.
   - `tests/screens.spec.ts`: added the missing seeded **student** account to the `ACCOUNT` map —
     without it `PW_AREA=student` walked the guarded area anonymous and the designed restore 401
     failed all 36 checks (pre-existing gap, found while verifying A02).
   - `unavailable-state.tsx` renders its title as `h1` (the page's main heading on those screens)
     and carries the `unavailable-state` class for testability.

**Verification** (all commands run on this branch, production build `next start`, API live on :3001
against the local dev DB, seeded account only — no fixtures created):
- `node --test apps/web/scripts/*.test.mjs` → **50/50** (10 new).
- `pnpm --filter web build` → green (42/42 pages), twice (after gating and after the h1 change).
- `pnpm exec playwright test student-demo-isolation` → **9 passed, 1 skipped** (deliberate:
  userchip is desktop-only) across `desktop` + `mobile-375`.
- `PW_AREA=student pnpm exec playwright test screens` → **36/36** across both viewports.
- Screenshots read by hand: production dashboard (desktop + 375px) shows greeting by real account,
  0 XP / 0 streak HUD, three live-feature cards; profile drawer shows email + join month with no
  demo buttons; unavailable state at both viewports with no overflow; theme toggle switches the
  whole shell to light. No console errors (asserted in every test).

**Blocker / needs follow-up**:
- `/student/flashcards` still rates through the Leitner local store and `/student/mistakes/review`
  still reviews the local mistakes store in production. Both are the A00/DOC-016-recorded
  presentation rewire owned by **A03/A05** (mistake-collection backend is Sprint 4); gating them
  would remove the only live learning feature, so A02 leaves them and records them. Not counted
  as passing scope here.
- The generic screen check's `PW_ROUTES` arg is mangled by Git Bash path conversion; run it via
  `export PW_*=...` + `pnpm exec playwright test screens` inside `apps/web` instead of inline
  `VAR=... pnpm --filter ...` (MSYS rewrites leading-slash values).

**Next steps**:
- Review + merge PR for `codex/a02-isolate-demo`.
- Next task per checklist order: A03 (SRS presentation per Hán Lộ) / A05 (SRS onto the canonical
  flashcards route), which close the two remaining demo-isolation gaps above.
