"use client";

import { clsx } from "clsx";
import { LucideIcon, TriangleAlert, Inbox, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

/* ---------- Shared UI primitives for the Student prototype ---------- */

export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag className={clsx("rounded-3xl border border-sp-line bg-sp-card shadow-sp", className)}>
      {children}
    </Tag>
  );
}

export function SectionHead({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sp-primary-soft text-sp-primary">
            <Icon size={20} aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <h2 className="sp-font-head text-lg font-extrabold leading-tight text-sp-ink">{title}</h2>
          {desc ? <p className="mt-0.5 text-sm text-sp-ink2">{desc}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Chip({
  children,
  tone = "default",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "accent" | "ok" | "warn" | "danger" | "xp" | "boss" | "locked";
  size?: "sm" | "md";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-sp-locked-soft text-sp-ink2",
    primary: "bg-sp-primary-soft text-sp-primary-strong",
    accent: "bg-sp-accent-soft text-sp-accent-strong",
    ok: "bg-sp-ok-soft text-sp-ok",
    warn: "bg-sp-warn-soft text-sp-warn",
    danger: "bg-sp-danger-soft text-sp-danger",
    xp: "bg-sp-xp-soft text-sp-warn",
    boss: "bg-sp-boss-soft text-sp-boss",
    locked: "bg-sp-locked-soft text-sp-locked",
  };
  return (
    <span
      className={clsx(
        "sp-font-head inline-flex items-center gap-1 rounded-full font-bold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number; // 0–100
  tone?: "primary" | "ok" | "accent" | "xp";
  className?: string;
  label?: string;
}) {
  const colors = {
    primary: "bg-sp-primary",
    ok: "bg-sp-ok",
    accent: "bg-sp-accent",
    xp: "bg-sp-xp",
  } as const;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={clsx("h-2.5 w-full overflow-hidden rounded-full bg-sp-locked-soft", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={clsx("h-full rounded-full transition-[width] duration-500", colors[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function XpPill({ xp }: { xp: number }) {
  return (
    <Chip tone="xp" className="font-sp">
      <span aria-hidden="true">✦</span> {xp.toLocaleString("vi-VN")} XP
    </Chip>
  );
}

/* ---------- Demo state machinery (prototype only) ---------- */

export type DemoState = "ready" | "loading" | "empty" | "error";

export function DemoStateSwitcher({
  state,
  onChange,
}: {
  state: DemoState;
  onChange: (s: DemoState) => void;
}) {
  const options: { key: DemoState; label: string }[] = [
    { key: "ready", label: "Sẵn sàng" },
    { key: "loading", label: "Đang tải" },
    { key: "empty", label: "Rỗng" },
    { key: "error", label: "Lỗi" },
  ];
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-sp-line bg-sp-card p-1 shadow-sp-sm"
      role="group"
      aria-label="Chuyển trạng thái demo của trang"
    >
      <span className="hidden pl-2 pr-1 text-[11px] font-semibold uppercase tracking-wide text-sp-ink3 sm:block">
        Demo
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={state === o.key}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-bold transition-colors",
            state === o.key
              ? "bg-sp-primary text-white"
              : "text-sp-ink2 hover:bg-sp-primary-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải dữ liệu">
      <span className="sr-only">Đang tải…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sp-skeleton h-16 rounded-2xl" />
      ))}
      <div className="flex items-center gap-2 pt-1 text-sm text-sp-ink2">
        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        Đang tải dữ liệu…
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  desc,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-sp-line bg-sp-card px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sp-primary-soft text-sp-primary">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3 className="sp-font-head mt-4 text-base font-extrabold text-sp-ink">{title}</h3>
      {desc ? <p className="mt-1 max-w-sm text-sm text-sp-ink2">{desc}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Không tải được dữ liệu",
  desc = "Đã có lỗi khi kết nối. Bạn có thể thử lại hoặc quay về Tổng quan.",
  onRetry,
}: {
  title?: string;
  desc?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-3xl border border-sp-danger-soft bg-sp-danger-soft/40 px-6 py-12 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sp-danger-soft text-sp-danger">
        <TriangleAlert size={26} aria-hidden="true" />
      </span>
      <h3 className="sp-font-head mt-4 text-base font-extrabold text-sp-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-sp-ink2">{desc}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="sp-press mt-4 rounded-xl bg-sp-danger px-4 py-2 text-sm font-bold text-white hover:bg-sp-danger/90"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Buttons ---------- */

export function PrimaryButton({
  children,
  icon: Icon,
  className,
  onClick,
  disabled,
  type = "button",
  full,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "sp-press sp-font-head inline-flex items-center justify-center gap-2 rounded-xl bg-sp-primary px-5 py-3 text-sm font-extrabold text-white shadow-sp-sm hover:bg-sp-primary-strong disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:transform-none",
        full && "w-full",
        className,
      )}
    >
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
  className,
  onClick,
  disabled,
  active,
  title,
  full,
}: {
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "sp-press sp-font-head inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:transform-none",
        full && "w-full",
        active
          ? "border-sp-primary bg-sp-primary text-white"
          : "border-sp-line bg-sp-card text-sp-ink hover:border-sp-primary-line hover:bg-sp-primary-soft",
        className,
      )}
    >
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
