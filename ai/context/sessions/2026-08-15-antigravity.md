# Session Note — 2026-08-15 — antigravity

## [/admin/dashboard (A-DASH-1,2,4) implementation] — antigravity — branch `feat/s1-web-dashboard`

**Done**:
- Created `apps/web/src/lib/dashboard-data.ts` — pure helpers + hardcoded mock data for the
  dashboard (currency `formatVnd`, avatar `initialsOf` aligned to `auth-profile getInitials`
  first+last-word convention, `abbreviateVnd` axis ticks, `emptyDashboardData`, chart series
  tokens `#2563EB`/`#EA580C` per `root-design-fe.md` §6.1).
- Implemented `/admin/dashboard` (`apps/web/src/app/admin/dashboard/page.tsx` +
  `dashboard.module.css`) reusing the `/admin/users` shell (240px sidebar `#0F172A`, sticky
  56px header, content on `#F8FAFC`).
  - 4 KPI tiles (Chờ duyệt / Buổi chờ duyệt / Thu tháng này / Chi lương tháng này), count
    tiles have no delta; money tiles show `so với tháng trước` + arrow.
  - 2 action-queue cards (Tài khoản chờ duyệt / Buổi học chờ duyệt), each row navigates.
  - Revenue-vs-payroll **hand-written inline SVG** line chart (no new dependency) — 2px series,
    single y-axis with abbreviated ticks, dashed `T8 chưa hết tháng` partial month, crosshair
    + shared tooltip, direct labels at final point, plus `Xem dạng bảng` table toggle.
  - All 5 review states via the `REVIEW STATE` switcher: Ready / Loading (per-region
    skeletons) / Empty (queue empty state) / Partial (chart skeleton only) / Error
    (per-region chart retry `Không tải được biểu đồ.` + `Thử lại`). Forbidden handled by
    route guard (`/login` + `AUTH_INSUFFICIENT_ROLE`).
  - Responsive: KPI `4→2→1` columns, sidebar→hamburger drawer under 768px, chart max-height
    200px at 375px.
- Created `apps/web/scripts/admin-dashboard.test.mjs` (5 tests, all pass).
- Verified: `pnpm --filter web build` (`✓ Generating static pages (8/8)`), all 21 unit tests
  pass. Dev server served `/admin/dashboard` 200.

**Not done / caveats**:
- **Fully mocked.** `GET /api/v1/admin/dashboard/stats` does not exist in
  `docs/api/API_ADMIN.md` (spec §3 + contract both flag "Confirm this shape before build").
  Screen stays `🔶` in `ai/PROGRESS.md`, NOT `✅`, until the endpoint lands with agreed shape.
  `MOCK(A-DASH-1/2/4)` markers in `src/lib/dashboard-data.ts` state what removes them.
- Visual browser screenshot verification was started (Ready desktop + mobile captured) but
  the full multi-state screenshot set was not completed (ended early at user request).
- `pnpm check:docs` reports a **pre-existing/unrelated** failure:
  `.agents/skills/slides/SKILL.md is 1137 B — looks like a stub` (from the earlier
  `npx skills add` install). Not introduced by this screen; left untouched per working-tree rule.

**Contract/temporary decisions to preserve**:
- Money in integer minor units (VND) on the wire, formatted at render only.
- Status colours are NOT used on this screen (KPI tiles are counts/money, no status enum
  badges); no `status.ts` change needed.
- Chart palette `#2563EB` (Thu) / `#EA580C` (Chi) from `root-design-fe.md` §6.1 — never
  status hues, never green/red.

**Needs from the other lane**:
- Define + implement `GET /api/v1/admin/dashboard/stats` payload shape (pendingUsers,
  pendingSessions, revenueThisMonth/revenueDeltaPct, payrollThisMonth/payrollDeltaPct,
  chart[6] with partial flag). Only then can the mock comments be removed and `🔶 → ✅`.
