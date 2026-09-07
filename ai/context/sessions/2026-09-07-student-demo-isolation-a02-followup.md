## [2026-09-07] — Student Demo Isolation QC Follow-up (A02 / WEB-016) — Antigravity — branch `codex/a02-isolate-demo`

**Context**:
QC review follow-up for TASK A02 (`docs/prompts/student-integration-checklist.md` §A02) on branch `codex/a02-isolate-demo`. The initial implementation established demo tool gating and baseline isolation, but review identified four critical areas requiring completion: absent-vs-zero progress semantics, actually wired preference migration/hydration verification, unified live-route/navigation classification, and hookless wrappers for unbacked routes.

**Done**:
1. **Absent vs Zero Progress Semantics** (`lib/student/demo-rules.ts`, `lib/student/store.ts`, `components/student/student-shell.tsx`):
   - Changed `resolveStudentProgressStats` in production to return `null` for `xp`, `streakDays`, `currentLevel`, and `rank` (rather than fabricating `0` or "Học viên"), adhering strictly to WEB-015 fix guidelines.
   - Added `formatProgressStat(value: number | null): string`: renders `null` as em dash (`"—"`), and numbers in `vi-VN` locale.
   - Removed artificial production branch from `useStudentProfile()`; components rendered in production read `useHudProgressStats()` instead.
2. **Wired Preference Migration & Hydration** (`lib/student/preferences.ts`, `scripts/student-preferences-store.test.mjs`):
   - Added `skipHydration: true` and safe storage fallback to `useStudentPreferences` persist configuration, ensuring hydration happens explicitly via `rehydrate()` on mount and avoiding SSR/hydration mismatches.
   - Created executable store regression test suite `apps/web/scripts/student-preferences-store.test.mjs` (with `ts-resolution-loader.mjs`) verifying store-level migration from `hanlu-student` to `hanlu-preferences` without mutating or clearing legacy keys.
3. **Consistent Live-Route & Navigation Classification** (`lib/student/demo-rules.ts`, `components/student/student-shell.tsx`, `app/student/(app)/page.tsx`):
   - Defined `LIVE_PROD_STUDENT_ROUTES` and `isLiveStudentRoute()` as single source of truth for routes active in production: `/student`, `/student/classes`, `/student/flashcards`, `/student/mistakes`, `/student/grammar`, `/student/foundation`.
   - Unified navigation filtering across sidebar rail nav (`RAIL_PRIMARY`, `RAIL_SECONDARY`, `RAIL_ACHIEVEMENT`), mobile bottom tab bar (`TAB_ITEMS`), sheet grid (`SHEET_NAV`), and dashboard production welcome shortcuts.
   - Re-enabled `/student/grammar` and `/student/foundation` as live repo-static content in production, while gating mock mastery calculations and XP awards.
4. **Hookless Wrapper Pattern for Unbacked Routes** (`app/student/(app)/**/page.tsx`):
   - Wrapped 10 unbacked route components (`assignments`, `attempts`, `exams`, `badges`, `leaderboard`, `learning-path`, `lego`, `placement`, `progress`, `workplace`, `writing`) in hookless outer page components returning `UnavailableState` prior to invoking inner component hooks.
5. **Executable Tests & Verification**:
   - `node --test apps/web/scripts/*.test.mjs`: **59/59 tests pass** across 15 suites (including 10 in `student-demo-isolation.test.mjs` and 4 in `student-preferences-store.test.mjs`).
   - `pnpm --filter web build`: **42/42 pages compile cleanly** with zero type or lint errors.
   - `node scripts/check-docs.mjs`: **8/8 checks pass**.
   - Updated Playwright test `tests/student-demo-isolation.spec.ts` aligning with absent progress (`"—"`) and live static routes.

**Blocker / needs follow-up**:
- `/student/flashcards` and `/student/mistakes/review` retention of Leitner/local store is owned by A03/A05 as documented in A00.

**Next steps**:
- Push follow-up commit to PR #46 (`codex/a02-isolate-demo`).
- Human review and merge of PR #46.
