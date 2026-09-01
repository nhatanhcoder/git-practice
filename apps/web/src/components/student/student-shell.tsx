"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  BookMarked,
  Briefcase,
  ClipboardCheck,
  Flame,
  Home,
  Layers,
  Map,
  Menu,
  NotebookPen,
  PenTool,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { mockLearner } from "@/lib/student/mock-user";
import { useStudentProgress } from "@/lib/student/store";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean; // shown in mobile bottom nav
  soon?: boolean;
}

const navItems: NavItem[] = [
  { href: "/student", label: "Tổng quan", icon: Home, primary: true },
  { href: "/student/learning-path", label: "Lộ trình học", icon: Map, primary: true },
  { href: "/student/grammar", label: "Ngữ pháp", icon: BookOpen, primary: true },
  { href: "/student/foundation", label: "Nền tảng", icon: Layers, primary: true },
  { href: "/student/workplace", label: "Giao tiếp công sở", icon: Briefcase, soon: true },
  { href: "/student/exams", label: "Thi HSK", icon: ClipboardCheck, soon: true },
  { href: "/student/mistakes", label: "Sổ lỗi & Ôn tập", icon: NotebookPen, soon: true },
  { href: "/student/writing", label: "Tập viết chữ Hán", icon: PenTool, soon: true },
  { href: "/student/leaderboard", label: "Bảng xếp hạng", icon: Trophy, soon: true },
];

function Logo() {
  return (
    <Link
      href="/student"
      className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-sp-primary"
    >
      <span className="sp-font-head flex h-10 w-10 items-center justify-center rounded-2xl bg-sp-primary text-lg font-black text-white shadow-sp-sm">
        汉
      </span>
      <span className="sp-font-head text-base font-black leading-tight text-sp-ink">
        Hành trình HSK
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Điều hướng khu vực học tập" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "sp-press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold",
              active
                ? "bg-sp-primary text-white shadow-sp-sm"
                : "text-sp-ink2 hover:bg-sp-primary-soft hover:text-sp-primary-strong",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.soon ? (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                  active ? "bg-white/20 text-white" : "bg-sp-xp-soft text-sp-warn",
                )}
              >
                Sắp ra mắt
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const xp = useStudentProgress((s) => s.xp);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sp-line bg-sp-primary-soft p-3">
      <span className="sp-font-head flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sp-primary text-sm font-black text-white">
        MA
      </span>
      <div className="min-w-0 flex-1">
        <p className="sp-font-head truncate text-sm font-extrabold text-sp-ink">
          {mockLearner.nickname}
        </p>
        <p className="text-xs text-sp-ink2">
          HSK {mockLearner.currentLevel} · {xp.toLocaleString("vi-VN")} XP
        </p>
      </div>
    </div>
  );
}

function XpChips() {
  const xp = useStudentProgress((s) => s.xp);
  return (
    <div className="flex items-center gap-2">
      <span className="sp-font-head inline-flex items-center gap-1 rounded-full bg-sp-xp-soft px-3 py-1.5 text-xs font-extrabold text-sp-warn">
        <Zap size={13} aria-hidden="true" />
        {xp.toLocaleString("vi-VN")}
      </span>
      <span className="sp-font-head inline-flex items-center gap-1 rounded-full bg-sp-accent-soft px-3 py-1.5 text-xs font-extrabold text-sp-accent-strong">
        <Flame size={13} aria-hidden="true" />
        {mockLearner.streakDays} ngày
      </span>
    </div>
  );
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="student-root min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-sp-line bg-sp-card px-4 py-5 lg:flex">
        <div>
          <div className="px-2 pb-5">
            <Logo />
          </div>
          <NavList />
        </div>
        <UserCard />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sp-line bg-sp-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <XpChips />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
            className="sp-press flex h-10 w-10 items-center justify-center rounded-xl border border-sp-line bg-sp-card text-sp-ink"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile menu sheet */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35"
          />
          <div className="absolute inset-y-0 left-0 flex w-[290px] flex-col justify-between bg-sp-card px-4 py-5 shadow-sp">
            <div>
              <div className="flex items-center justify-between px-2 pb-5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Đóng menu"
                  className="sp-press flex h-9 w-9 items-center justify-center rounded-xl text-sp-ink2 hover:bg-sp-locked-soft"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <NavList onNavigate={() => setMenuOpen(false)} />
            </div>
            <UserCard />
          </div>
        </div>
      ) : null}

      {/* Page content */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Điều hướng nhanh"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sp-line bg-sp-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {navItems
            .filter((i) => i.primary)
            .map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-bold",
                    active ? "text-sp-primary" : "text-sp-ink3",
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-bold text-sp-ink3"
          >
            <BookMarked size={20} aria-hidden="true" />
            Xem thêm
          </button>
        </div>
      </nav>
    </div>
  );
}
