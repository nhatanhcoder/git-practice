"use client";

/**
 * Student app shell — the ink rail, the topbar HUD, and the mobile bars.
 *
 * Three responsibilities that all have to happen in one place:
 *  1. own `.student-root`, which is where the theme tokens are scoped;
 *  2. apply theme and the Pinyin / meaning flags as data attributes **after
 *     mount**, so the server and first client render agree (see `store.ts`);
 *  3. rehydrate the persisted store, for the same reason.
 *
 * Distilled from the prototype's AppShell.tsx — see
 * docs/front-end-design-docs/HANLU_PROTOTYPE_DISTILLED.md §2.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  BookOpen,
  Briefcase,
  Flame,
  GraduationCap,
  Home,
  LayoutGrid,
  Map,
  Medal,
  Moon,
  NotebookPen,
  PenTool,
  Puzzle,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { ToastProvider } from "./toast";
import { Sheet } from "./overlay";
import { useStudentProfile, useStudentStore } from "@/lib/student/store";

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: ReactNode;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: "/student", label: "Trang chủ", short: "Trang chủ", icon: <Home size={18} /> },
  { to: "/student/learning-path", label: "Lộ trình HSK", short: "Lộ trình", icon: <Map size={18} /> },
  { to: "/student/flashcards", label: "Từ vựng Flashcard", short: "Từ vựng", icon: <Sparkles size={18} /> },
  { to: "/student/grammar", label: "Ngữ pháp", short: "Ngữ pháp", icon: <BookOpen size={18} /> },
  { to: "/student/foundation", label: "Nền tảng", short: "Nền tảng", icon: <Blocks size={18} /> },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: "/student/exams", label: "Phòng thi HSK", short: "Thi thử", icon: <GraduationCap size={18} /> },
  { to: "/student/mistakes", label: "Sổ tay lỗi sai", short: "Lỗi sai", icon: <NotebookPen size={18} /> },
  { to: "/student/writing", label: "Luyện viết chữ", short: "Viết chữ", icon: <PenTool size={18} /> },
  { to: "/student/lego", label: "Ghép câu Lego", short: "Ghép câu", icon: <Puzzle size={18} /> },
  { to: "/student/workplace", label: "Mô phỏng công sở", short: "Công sở", icon: <Briefcase size={18} /> },
];

export const ACHIEVEMENT_NAV: NavItem[] = [
  { to: "/student/leaderboard", label: "Bảng xếp hạng", short: "Xếp hạng", icon: <Trophy size={18} /> },
  { to: "/student/progress", label: "Tiến độ học tập", short: "Tiến độ", icon: <TrendingUp size={18} /> },
  { to: "/student/badges", label: "Kho huy hiệu", short: "Huy hiệu", icon: <Medal size={18} /> },
];

/**
 * Longer prefixes first, so `/student/exams/e-h3-1` matches "Phòng thi HSK"
 * rather than falling through to the bare `/student` entry.
 */
const PAGE_TITLES: [string, string][] = [
  ["/student/learning-path", "Lộ trình HSK"],
  ["/student/flashcards", "Flashcard từ vựng"],
  ["/student/grammar", "Thư viện ngữ pháp"],
  ["/student/foundation", "Nền tảng"],
  ["/student/writing", "Luyện viết chữ"],
  ["/student/mistakes/review", "Phiên ôn lỗi sai"],
  ["/student/mistakes", "Sổ tay lỗi sai"],
  ["/student/exams", "Phòng thi HSK"],
  ["/student/workplace", "Mô phỏng công sở"],
  ["/student/lego", "Ghép câu Lego"],
  ["/student/leaderboard", "Bảng xếp hạng"],
  ["/student/progress", "Tiến độ học tập"],
  ["/student/badges", "Kho huy hiệu"],
  ["/student/placement", "Kiểm tra xếp cấp"],
  ["/student", "Trang chủ"],
];

function titleFor(pathname: string) {
  const hit = PAGE_TITLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return hit ? hit[1] : "Học viện";
}

function isActive(pathname: string, to: string) {
  return to === "/student" ? pathname === to : pathname.startsWith(to);
}

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/student";
  const profile = useStudentProfile();
  const theme = useStudentStore((s) => s.theme);
  const showPinyin = useStudentStore((s) => s.showPinyin);
  const showMeaning = useStudentStore((s) => s.showMeaning);
  const toggleTheme = useStudentStore((s) => s.toggleTheme);
  const togglePinyin = useStudentStore((s) => s.togglePinyin);
  const toggleMeaning = useStudentStore((s) => s.toggleMeaning);
  const resetProgress = useStudentStore((s) => s.resetProgress);
  const hydrated = useStudentStore((s) => s.hydrated);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const title = titleFor(pathname);

  // Read localStorage only after mount — see the note in store.ts.
  useEffect(() => {
    void useStudentStore.persist.rehydrate();
    useStudentStore.getState().setHydrated(true);
  }, []);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  /**
   * `globals.css` paints <html> and <body> with the Admin area's light
   * `--background`. The student root covers the viewport, but overscroll and any
   * page shorter than the fold still show that light band behind the ink theme.
   * Paint the document to match while the student area is mounted, and put it
   * back on the way out so Admin and Teacher are unaffected.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const previous = { html: html.style.backgroundColor, body: body.style.backgroundColor };
    const ink = theme === "light" ? "#f6f2ea" : "#0a0d13";
    html.style.backgroundColor = ink;
    body.style.backgroundColor = ink;
    return () => {
      html.style.backgroundColor = previous.html;
      body.style.backgroundColor = previous.body;
    };
  }, [theme]);

  // Until rehydration lands, render the server's defaults so the markup matches.
  const themeAttr = hydrated ? theme : "dark";
  const pinyinAttr = hydrated ? String(showPinyin) : "true";
  const meaningAttr = hydrated ? String(showMeaning) : "true";

  const themeBtn = (
    <button
      type="button"
      className="btn btn--ghost btn--icon"
      onClick={toggleTheme}
      aria-label={themeAttr === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {themeAttr === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  const displayToggles = (mobile = false) => (
    <div
      className={`display-toggles ${mobile ? "display-toggles--mobile" : ""}`}
      role="group"
      aria-label="Tùy chọn hiển thị chữ Hán"
    >
      <button
        type="button"
        className={`display-toggle-btn ${showPinyin ? "is-active" : ""}`}
        onClick={togglePinyin}
        aria-pressed={showPinyin}
        title={showPinyin ? "Đang bật Pinyin — bấm để ẩn" : "Đang ẩn Pinyin — bấm để hiện"}
      >
        <span className="display-toggle-badge han" aria-hidden="true">
          拼
        </span>
        {!mobile ? <span className="display-toggle-label">Pinyin</span> : null}
      </button>
      <button
        type="button"
        className={`display-toggle-btn ${showMeaning ? "is-active" : ""}`}
        onClick={toggleMeaning}
        aria-pressed={showMeaning}
        title={showMeaning ? "Đang bật dịch nghĩa — bấm để ẩn" : "Đang ẩn dịch nghĩa — bấm để hiện"}
      >
        <span className="display-toggle-badge han" aria-hidden="true">
          译
        </span>
        {!mobile ? <span className="display-toggle-label">Nghĩa</span> : null}
      </button>
    </div>
  );

  const navGroup = (heading: string, items: NavItem[]) => (
    <>
      <p className="rail__group">{heading}</p>
      {items.map((item) => (
        <Link
          key={item.to}
          href={item.to}
          className={`navlink ${isActive(pathname, item.to) ? "is-active" : ""}`}
          aria-current={isActive(pathname, item.to) ? "page" : undefined}
        >
          {item.icon}
          <span>{item.short}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div
      className="student-root"
      data-theme={themeAttr}
      data-show-pinyin={pinyinAttr}
      data-show-meaning={meaningAttr}
    >
      <ToastProvider>
        <div className="shell">
          <a className="skip-link" href="#main">
            Bỏ qua điều hướng, tới nội dung chính
          </a>

          {/* ---------- Desktop / tablet rail ---------- */}
          <nav className="rail" aria-label="Điều hướng chính">
            <Link href="/student" className="rail__brand" aria-label="Hán Lộ — về trang chủ">
              <span className="seal han" aria-hidden="true">
                汉
              </span>
              <span className="stack rail__brand-text">
                <span className="rail__name">Hán Lộ</span>
                <span className="rail__tag">Học viện HSK</span>
              </span>
            </Link>

            <div className="rail__nav">
              {navGroup("Học tập", PRIMARY_NAV)}
              {navGroup("Luyện tập", SECONDARY_NAV)}
              {navGroup("Thành tích", ACHIEVEMENT_NAV)}
            </div>

            <div className="rail__foot">
              <button
                type="button"
                className="userchip"
                aria-label={`Hồ sơ của ${profile.name}`}
                aria-haspopup="dialog"
                onClick={() => setProfileOpen(true)}
              >
                <span className="avatar han" aria-hidden="true">
                  {profile.initials}
                </span>
                <span className="stack userchip__text grow" style={{ textAlign: "left" }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--step--1)" }} className="truncate">
                    {profile.name}
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                    {profile.rank} · HSK {profile.currentLevel}
                  </span>
                </span>
              </button>
            </div>
          </nav>

          {/* ---------- Main column ---------- */}
          <div className="main">
            <header className="topbar">
              <nav className="crumb" aria-label="Đường dẫn">
                <span>Học viện</span>
                <span aria-hidden="true">/</span>
                <span className="crumb__now">{title}</span>
              </nav>

              <div className="hud">
                {displayToggles()}
                <span className="hud__stat hud__stat--streak" title="Chuỗi ngày học liên tiếp">
                  <Flame size={15} />
                  <span className="num">{profile.streakDays}</span>
                  <span className="sr-only">ngày chuỗi liên tiếp</span>
                </span>
                <span className="hud__stat hud__stat--xp" title="Tổng điểm kinh nghiệm">
                  <Zap size={15} />
                  <span className="num">{profile.xp.toLocaleString("vi-VN")}</span>
                  <span className="sr-only">điểm kinh nghiệm</span>
                </span>
                {themeBtn}
              </div>
            </header>

            {/* ---------- Mobile top bar ---------- */}
            <header className="mobilebar">
              <Link href="/student" aria-label="Hán Lộ — về trang chủ" style={{ flex: "none" }}>
                <span
                  className="seal han"
                  style={{ width: 30, height: 30, fontSize: 16 }}
                  aria-hidden="true"
                >
                  汉
                </span>
              </Link>
              <h1 className="mobilebar__title grow truncate">{title}</h1>
              {displayToggles(true)}
              <span className="hud__stat hud__stat--streak" style={{ height: 30 }}>
                <Flame size={14} />
                <span className="num">{profile.streakDays}</span>
              </span>
              {themeBtn}
            </header>

            <main id="main" className="content" tabIndex={-1}>
              {children}
            </main>
          </div>

          {/* ---------- Mobile tab bar ---------- */}
          <nav className="tabbar" aria-label="Điều hướng dưới cùng">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                className={`tabbar__item ${isActive(pathname, item.to) ? "is-active" : ""}`}
              >
                <span className="tabbar__glyph">{item.icon}</span>
                <span>{item.short}</span>
              </Link>
            ))}
            <button
              type="button"
              className={`tabbar__item ${sheetOpen ? "is-active" : ""}`}
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <span className="tabbar__glyph">
                <LayoutGrid size={18} />
              </span>
              <span>Thêm</span>
            </button>
          </nav>

          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tất cả khu vực học">
            <div className="sheet__grid">
              {[...PRIMARY_NAV, ...SECONDARY_NAV, ...ACHIEVEMENT_NAV].map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`sheet__item ${isActive(pathname, item.to) ? "is-active" : ""}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </Sheet>

          {/* ---------- Profile ---------- */}
          <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Hồ sơ học viên">
            <div className="stack gap-5" style={{ paddingTop: "var(--sp-4)" }}>
              <div className="row gap-3">
                <span className="avatar avatar--lg han" aria-hidden="true">
                  {profile.initials}
                </span>
                <div className="stack gap-1 grow">
                  <span style={{ fontWeight: 600 }}>{profile.name}</span>
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                    {profile.rank} · HSK {profile.currentLevel} · {profile.joinedLabel}
                  </span>
                </div>
              </div>
              <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                Bản mockup: mọi tiến độ được lưu trong trình duyệt này, chưa có tài khoản thật.
              </p>
              <Link
                href="/student/placement"
                className="btn btn--outline btn--block"
                onClick={() => setProfileOpen(false)}
              >
                <Target size={16} /> Làm bài kiểm tra xếp cấp
              </Link>
              <button
                type="button"
                className="btn btn--outline btn--block"
                onClick={() => {
                  resetProgress();
                  setProfileOpen(false);
                }}
              >
                <RotateCcw size={16} /> Đặt lại tiến độ demo
              </button>
            </div>
          </Sheet>
        </div>
      </ToastProvider>
    </div>
  );
}
