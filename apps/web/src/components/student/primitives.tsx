"use client";

/**
 * Student primitives — Panel, SectionHeader, Chip, Bar, Ring, Metric, states.
 *
 * Distilled from the "Hán Lộ" prototype's Primitives.tsx. Every component here
 * renders the semantic class names defined in `app/student/components.css`;
 * none of them picks a colour, which is what keeps the whole area on one
 * palette (see ai/rules/working-rules.md § Frontend Design Rules).
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import type { CSSProperties, ReactNode } from "react";
import { Inbox, RefreshCw, TriangleAlert } from "lucide-react";

/* ---------------- Panel ---------------- */

export function Panel({
  children,
  className = "",
  as: Tag = "section",
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  style?: CSSProperties;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={`panel ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------------- Section header ---------------- */

export function SectionHeader({
  title,
  sub,
  action,
  id,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {sub ? <p className="section-sub">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Chip ---------------- */

export type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "info" | "epic";

export function Chip({
  children,
  tone = "neutral",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`chip ${tone !== "neutral" ? `chip--${tone}` : ""} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/* ---------------- Progress bar ---------------- */

export function Bar({
  value,
  tone = "accent",
  size = "md",
  label,
}: {
  value: number;
  tone?: "accent" | "success" | "gold" | "epic" | "info";
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`bar ${size === "sm" ? "bar--sm" : size === "lg" ? "bar--lg" : ""}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`bar__fill ${tone !== "accent" ? `bar__fill--${tone}` : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------------- Progress ring ---------------- */

export function Ring({
  value,
  size = 96,
  stroke = 8,
  children,
  color,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg
        className="ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <circle
          className="ring__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Metric ---------------- */

export function Metric({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <div className="stack gap-1">
      <span className="metric__label row gap-2">
        {icon}
        {label}
      </span>
      <span className="metric__value num" style={color ? { color } : undefined}>
        {value}
        {unit ? <span className="metric__unit"> {unit}</span> : null}
      </span>
    </div>
  );
}

/* ---------------- States ---------------- */

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="state__glyph" aria-hidden="true">
        {icon ?? <Inbox size={26} />}
      </div>
      <p className="state__title">{title}</p>
      {text ? <p className="state__text">{text}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Không tải được dữ liệu",
  text = "Kết nối tới máy chủ luyện tập bị gián đoạn. Đây là trạng thái lỗi mô phỏng của bản mockup.",
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role="alert">
      <div className="state__glyph state__glyph--danger" aria-hidden="true">
        <TriangleAlert size={26} />
      </div>
      <p className="state__title">{title}</p>
      <p className="state__text">{text}</p>
      {onRetry ? (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          <RefreshCw size={16} /> Thử lại
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({
  h = 16,
  w = "100%",
  radius = 10,
  style,
}: {
  h?: number | string;
  w?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="skel"
      style={{ height: h, width: w, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonPanel({ rows = 3, height = 120 }: { rows?: number; height?: number }) {
  return (
    <div className="panel panel--pad stack gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải dữ liệu…</span>
      <Skeleton h={20} w="42%" />
      <Skeleton h={height} radius={14} />
      <div className="stack gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} h={14} w={`${92 - i * 12}%`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Page header ---------------- */

export function PageHead({
  title,
  sub,
  action,
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="pagehead">
      <div>
        <h1 className="pagehead__title">{title}</h1>
        {sub ? <p className="pagehead__sub">{sub}</p> : null}
      </div>
      {action}
    </header>
  );
}
