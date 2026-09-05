"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartLine,
  ChevronRight,
  ClipboardList,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Wallet,
  X,
} from "lucide-react";
import styles from "./teacher-shell.module.css";
import { SessionChip } from "@/components/auth/session-chip";

interface Crumb {
  label: string;
  href?: string;
}

const nav = [
  { href: "/teacher", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/teacher/questions", label: "Ngân hàng câu hỏi", icon: BookOpen },
  { href: "/teacher/assignments", label: "Bài tập & Đề", icon: ClipboardList },
  { href: "/teacher/grading", label: "Chấm bài", icon: FileCheck },
  { href: "/teacher/sessions", label: "Buổi học & Điểm danh", icon: CalendarDays },
  { href: "/teacher/income", label: "Thu nhập", icon: Wallet },
];

const futureNav = [
  { label: "Phân tích lớp học", icon: ChartLine, sprint: "S5" },
];

export function TeacherShell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/teacher") return pathname === "/teacher";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebar = (
    <aside className={styles.sidebar + (mobileNav ? " " + styles.sidebarOpen : "")}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>学</span>
        <span>HSK Platform</span>
        <button className={styles.closeNav} onClick={() => setMobileNav(false)} aria-label="Đóng menu">
          <X size={20} />
        </button>
      </div>
      <nav className={styles.nav} aria-label="Điều hướng giáo viên">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              className={styles.navItem + (active ? " " + styles.navActive : "")}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <p className={styles.navGroup}>SẮP CÓ</p>
        {futureNav.map((item) => {
          const Icon = item.icon;
          return (
            <span key={item.label} className={styles.navItem + " " + styles.navDisabled} title={`Sprint ${item.sprint.slice(1)}`}>
              <Icon size={20} />
              <span>{item.label}</span>
              <small>{item.sprint}</small>
            </span>
          );
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <BookOpen size={18} />
        <div>
          <strong>HSK 1–9</strong>
          <span>Nền tảng học tập</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div className={styles.appShell}>
      {sidebar}
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Mở menu">
              <Menu size={20} />
            </button>
            {crumbs.map((crumb, i) => (
              <span key={crumb.label} className={styles.crumbPair}>
                {i > 0 && <ChevronRight size={14} />}
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <strong>{crumb.label}</strong>
                )}
              </span>
            ))}
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            {/* Was a hardcoded "PL / Phạm Thị Lan", so the chrome named someone who
                was not signed in — and there was no way to sign out at all. */}
            <SessionChip
              classNames={{
                button: styles.profileButton,
                avatar: styles.headerAvatar,
                text: styles.profileText,
              }}
              profileHref="/teacher"
            />
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
