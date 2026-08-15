/**
 * Dashboard data + pure helpers for /admin/dashboard.
 * Single source of truth for formatting so it can be unit-tested (see
 * scripts/admin-dashboard.test.mjs). Reference: root-design-fe.md §1-§6 and
 * specs/admin-pages/admin-dashboard.spec.md.
 *
 * MOCK(A-DASH-1/2/4): GET /api/v1/admin/dashboard/stats is not defined anywhere in
 * docs/api/API_ADMIN.md (contract + spec both say "Confirm this shape before build").
 * Data below is hardcoded per spec §6. Remove when the endpoint lands.
 */

export type ReviewState = "ready" | "loading" | "empty" | "partial" | "error";

export type KpiData = {
  pendingUsers: number;
  pendingSessions: number;
  revenueThisMonth: number;
  revenueDeltaPct: number;
  payrollThisMonth: number;
  payrollDeltaPct: number;
};

export type ChartPoint = {
  month: string;
  revenue: number;
  payroll: number;
  partial?: boolean;
};

export type PendingUser = { nickname: string; email: string; role: string; since: string };
export type PendingSession = { teacher: string; klass: string; date: string };

export type DashboardData = {
  kpi: KpiData;
  chart: ChartPoint[];
  pendingUsers: PendingUser[];
  pendingSessions: PendingSession[];
};

export const SERIES_REVENUE = "#2563EB";
export const SERIES_PAYROLL = "#EA580C";

// MOCK(A-DASH-1/2/4): hardcoded per spec §6.
export const initialDashboardData: DashboardData = {
  kpi: {
    pendingUsers: 2,
    pendingSessions: 5,
    revenueThisMonth: 12500000,
    revenueDeltaPct: -28.6,
    payrollThisMonth: 7250000,
    payrollDeltaPct: -3.3,
  },
  chart: [
    { month: "T3", revenue: 15000000, payroll: 6500000 },
    { month: "T4", revenue: 17500000, payroll: 7000000 },
    { month: "T5", revenue: 20000000, payroll: 8250000 },
    { month: "T6", revenue: 20000000, payroll: 8750000 },
    { month: "T7", revenue: 17500000, payroll: 7500000 },
    { month: "T8", revenue: 12500000, payroll: 7250000, partial: true },
  ],
  pendingUsers: [
    { nickname: "Nguyễn Minh Anh", email: "minhanh@example.com", role: "student", since: "2 ngày trước" },
    { nickname: "Trần Thu Hà", email: "thuha.teacher@example.com", role: "teacher", since: "3 ngày trước" },
  ],
  pendingSessions: [
    { teacher: "Phạm Thị Lan", klass: "HSK 2 — Nhóm A", date: "08/08/2026" },
    { teacher: "Phạm Thị Lan", klass: "HSK 2 — Nhóm A", date: "06/08/2026" },
    { teacher: "Đỗ Hải Yến", klass: "HSK 3 — Nhóm B", date: "06/08/2026" },
    { teacher: "Đỗ Hải Yến", klass: "HSK 1 — Nhóm C", date: "05/08/2026" },
    { teacher: "Phạm Thị Lan", klass: "HSK 2 — Nhóm A", date: "01/08/2026" },
  ],
};

/** Currency format: `.` thousands separator, `₫` suffix. 12500000 -> "12.500.000 ₫". */
export function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

/** Compute initials for an avatar (first + last word, matching auth-profile getInitials). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Build the "empty" dataset: pending counts to 0, queues emptied, chart kept. */
export function emptyDashboardData(base: DashboardData): DashboardData {
  return {
    ...base,
    kpi: { ...base.kpi, pendingUsers: 0, pendingSessions: 0 },
    pendingUsers: [],
    pendingSessions: [],
  };
}

/** Abbreviate a VND amount for y-axis ticks: 20tr / 15tr / 5tr / 0. */
export function abbreviateVnd(v: number): string {
  if (v >= 1000000000) return `${(v / 1000000000).toLocaleString("vi-VN")} tỷ`;
  if (v >= 1000000) return `${Math.round(v / 1000000).toLocaleString("vi-VN")}tr`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${v}`;
}
