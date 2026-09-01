/**
 * MOCK(T-INC-*): payroll periods in-memory until /api/v1/teacher/payroll exists.
 * View-only per RBAC (PayrollPeriod read = own). Pay-rate basis is dual-mode per the
 * 2026-08-16 decision (ADR-012 pending) — mock uses per_session for display only.
 */

export type PayrollStatus = "draft" | "finalized" | "paid";

export const payrollStatusLabels: Record<PayrollStatus, string> = {
  draft: "Nháp",
  finalized: "Đã chốt",
  paid: "Đã trả",
};

export interface PayrollSessionLine {
  sessionId: string;
  date: string;
  className: string;
  topic: string | null;
  minutes: number;
  amount: number; // VND, display-only
}

export interface PayrollPeriod {
  id: string;
  month: string; // "2026-08"
  monthLabel: string; // "Tháng 8/2026"
  status: PayrollStatus;
  sessions: PayrollSessionLine[];
  ratePerSession: number; // VND
  total: number; // VND — comes from the envelope; not recomputed client-side
}

export const mockPayrollPeriods: PayrollPeriod[] = [
  {
    id: "p202608",
    month: "2026-08",
    monthLabel: "Tháng 8/2026",
    status: "finalized",
    ratePerSession: 250000,
    total: 1000000,
    sessions: [
      { sessionId: "ss4", date: "2026-08-26", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 4: Mua sắm (bài tập)", minutes: 92, amount: 250000 },
      { sessionId: "x1", date: "2026-08-24", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 4: Mua sắm", minutes: 90, amount: 250000 },
      { sessionId: "ss6", date: "2026-08-30", className: "Luyện đề HSK 5 — cuối tuần", topic: "Đề luyện số 3 — Nghe hiểu HSK 5", minutes: 155, amount: 250000 },
      { sessionId: "x2", date: "2026-08-19", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 3: Hỏi đường", minutes: 90, amount: 250000 },
    ],
  },
  {
    id: "p202607",
    month: "2026-07",
    monthLabel: "Tháng 7/2026",
    status: "paid",
    ratePerSession: 250000,
    total: 3000000,
    sessions: [
      { sessionId: "y1", date: "2026-07-31", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — ôn tập giữa kỳ", minutes: 90, amount: 250000 },
      { sessionId: "y2", date: "2026-07-29", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 3", minutes: 90, amount: 250000 },
      { sessionId: "y3", date: "2026-07-27", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 2", minutes: 90, amount: 250000 },
      { sessionId: "y4", date: "2026-07-26", className: "Luyện đề HSK 5 — cuối tuần", topic: "Đề luyện số 2", minutes: 150, amount: 250000 },
      { sessionId: "y5", date: "2026-07-22", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 1", minutes: 90, amount: 250000 },
      { sessionId: "y6", date: "2026-07-19", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — khởi động", minutes: 90, amount: 250000 },
      { sessionId: "y7", date: "2026-07-12", className: "Luyện đề HSK 5 — cuối tuần", topic: "Đề luyện số 1", minutes: 150, amount: 250000 },
      { sessionId: "y8", date: "2026-07-05", className: "Luyện đề HSK 5 — cuối tuần", topic: "Làm quen đề HSK 5", minutes: 150, amount: 250000 },
      { sessionId: "y9", date: "2026-07-03", className: "Sơ cấp A — Thứ 3/5/7", topic: "Kiểm tra đầu vào", minutes: 90, amount: 250000 },
      { sessionId: "y10", date: "2026-07-01", className: "Luyện đề HSK 5 — cuối tuần", topic: "Tư vấn lộ trình", minutes: 120, amount: 250000 },
      { sessionId: "y11", date: "2026-07-08", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — phát âm", minutes: 90, amount: 250000 },
      { sessionId: "y12", date: "2026-07-15", className: "Sơ cấp A — Thứ 3/5/7", topic: "HSK 3 — Chương 1 (tiếp)", minutes: 90, amount: 250000 },
    ],
  },
  {
    id: "p202606",
    month: "2026-06",
    monthLabel: "Tháng 6/2026",
    status: "paid",
    ratePerSession: 250000,
    total: 2250000,
    sessions: [
      { sessionId: "z1", date: "2026-06-28", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 1 · Chào hỏi", minutes: 90, amount: 250000 },
      { sessionId: "z2", date: "2026-06-25", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 2 · Gia đình", minutes: 90, amount: 250000 },
      { sessionId: "z3", date: "2026-06-22", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 3 · Số và thời gian", minutes: 90, amount: 250000 },
      { sessionId: "z4", date: "2026-06-19", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 4 · Ngày sinh", minutes: 90, amount: 250000 },
      { sessionId: "z5", date: "2026-06-16", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 5 · Đi ăn", minutes: 90, amount: 250000 },
      { sessionId: "z6", date: "2026-06-13", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 6 · Đi mua đồ", minutes: 90, amount: 250000 },
      { sessionId: "z7", date: "2026-06-10", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 7 · Hỏi đường", minutes: 90, amount: 250000 },
      { sessionId: "z8", date: "2026-06-07", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 8 · Thời tiết", minutes: 90, amount: 250000 },
      { sessionId: "z9", date: "2026-06-04", className: "Sơ cấp A — Thứ 3/5/7", topic: "Bài 9 · Sở thích", minutes: 90, amount: 250000 },
    ],
  },
];
