/**
 * Status colors and token mappings.
 * Single source of truth for enum-to-color mapping across all pages.
 * Reference: docs/front-end-design-docs/root-design-fe.md §2.1 & specs/_DESIGN-SYSTEM.md
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_COLORS: Record<StatusTone, { hex: string; bg: string; text: string }> = {
  success: { hex: "#16A34A", bg: "rgba(22, 163, 74, 0.15)", text: "#16A34A" },
  warning: { hex: "#D97706", bg: "rgba(217, 119, 6, 0.15)", text: "#D97706" },
  danger: { hex: "#DC2626", bg: "rgba(220, 38, 38, 0.15)", text: "#DC2626" },
  info: { hex: "#0284C7", bg: "rgba(2, 132, 199, 0.15)", text: "#0284C7" },
  neutral: { hex: "#64748B", bg: "rgba(100, 116, 139, 0.15)", text: "#64748B" },
};

export const ENUM_STATUS_MAP: Record<string, StatusTone> = {
  // Success
  active: "success",
  paid: "success",
  approved: "success",
  present: "success",

  // Warning
  pending: "warning",
  unpaid: "warning",
  partially_paid: "warning",
  completed_pending: "warning",
  finalized: "warning",

  // Danger
  suspended: "danger",
  rejected: "danger",
  overdue: "danger",
  absent_unexcused: "danger",

  // Info
  draft: "info",
  scheduled: "info",
  in_progress: "info",

  // Neutral
  archived: "neutral",
  void: "neutral",
  dropped: "neutral",
};

export function getStatusTone(status: string): StatusTone {
  return ENUM_STATUS_MAP[status] || "neutral";
}

export function getStatusColor(status: string) {
  const tone = getStatusTone(status);
  return STATUS_COLORS[tone];
}
