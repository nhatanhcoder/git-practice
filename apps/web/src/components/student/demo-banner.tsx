"use client";

/**
 * A visible banner for screens that run on mock data (the mockup-era student
 * screens that have no backend yet).
 *
 * WEB-017's lesson: a disclaimer that lives only in code comments is not read
 * by the person looking at the screen. These screens already gate themselves
 * to development (`process.env.NODE_ENV !== "production"`); the banner makes
 * the demo status visible ON the page as well, so nobody — a learner, a
 * reviewer, the owner — mistakes browser-local data for a live feature.
 *
 * In production this component renders nothing: every screen that mounts it is
 * already behind an UnavailableState there, so the banner is belt-and-braces.
 */

import { FlaskConical } from "lucide-react";

export function DemoBanner({ text }: { text?: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      role="note"
      className="demo-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.55rem 0.9rem",
        borderRadius: "var(--radius-2, 10px)",
        border: "1px dashed var(--line-3, #d4b106)",
        background: "color-mix(in oklab, var(--warn, #b45309) 8%, transparent)",
        color: "var(--warn, #b45309)",
        fontSize: "var(--step--1, 0.875rem)",
        lineHeight: 1.45,
        margin: 0,
      }}
    >
      <FlaskConical size={15} aria-hidden="true" />
      <span>
        {text ?? "Dữ liệu mô phỏng — chạy cục bộ trong trình duyệt, không gửi lên máy chủ."}
      </span>
    </div>
  );
}
