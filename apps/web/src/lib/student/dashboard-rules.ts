import type { EnrolledClass } from "./classes-service";
import type { SrsStats } from "./flashcards-service";

/**
 * Pure dashboard rules (Task A). No fetch here — `dashboard-service.ts` owns
 * the network; this file owns what the numbers mean, and unit tests import
 * this leaf directly (extensionless service imports do not resolve under
 * plain `node --test`).
 */

export interface DashboardTile {
  key: string;
  label: string;
  value: string;
}

/**
 * The seven tiles the dashboard renders, in display order. `matureCards`
 * (SM-2 interval ≥ 21 days) is what "Đã thuộc" means; `streak` is
 * deliberately null server-side until the calendar rule is approved, so it
 * renders as "—" via formatStat — never 0.
 */
export function buildDashboardTiles(
  classes: EnrolledClass[] | null,
  stats: SrsStats,
): DashboardTile[] {
  return [
    { key: "classes", label: "Lớp đã tham gia", value: classes === null ? "—" : String(classes.length) },
    { key: "due", label: "Thẻ đến hạn", value: String(stats.dueToday) },
    { key: "learned", label: "Thẻ đã học", value: String(stats.totalCards) },
    { key: "matured", label: "Đã thuộc", value: String(stats.matureCards) },
    { key: "retention", label: "Tỉ lệ ghi nhớ", value: `${stats.retentionRate}%` },
    { key: "reviews", label: "Lượt ôn", value: String(stats.totalReviews) },
    // Same rule as formatStat (srs-session): a missing streak reads "—", never 0.
    // Inlined (not imported) so this module stays import-free for plain node --test.
    { key: "streak", label: "Chuỗi ngày", value: stats.streak === null || stats.streak === undefined ? "—" : String(stats.streak) },
  ];
}

/** Figures with no endpoint behind them — named as missing, never rendered as numbers. */
export const MISSING_FIGURES: string[] = [
  "Tổng XP",
  "Danh hiệu",
  "Phút học hôm nay",
  "Tiến độ bậc HSK",
  "Bài đang học dở",
  // Named "Lịch sử hoạt động" rather than the mock panel's "Hoạt động gần đây":
  // same gap (no activity endpoint), but the production sweep check treats that
  // exact heading as a leaked mock widget.
  "Lịch sử hoạt động",
];
