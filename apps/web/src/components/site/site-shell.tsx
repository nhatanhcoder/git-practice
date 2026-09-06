"use client";

/**
 * Site chrome for the public landing page — ported from the prototype's
 * `frontend/src/components/layout/SiteShell.tsx` (`Chinese UI test/ui-claude`):
 * the compact premium sitebar, the "Khám phá" dropdown, the theme toggle, the
 * mobile menu and the site footer.
 *
 * Port notes for Next.js 14:
 * - react-router `Link`/`NavLink` → `next/link`; anchor navigation is smooth
 *   via `scrollIntoView` on the section id, exactly like the prototype;
 * - theme lives on the **page wrapper** (`.student-root` with `data-theme`),
 *   not on `document.documentElement` — this repo scopes the Hán Lộ tokens to
 *   `.student-root` so Admin and Teacher are untouched (see
 *   `docs/front-end-design-docs/HANLU_PROTOTYPE_DISTILLED.md`); SiteShell
 *   therefore receives `theme` / `onToggleTheme` instead of owning them.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Layers,
  Map,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

const PRIMARY_NAV = [
  { to: "#lo-trinh", id: "lo-trinh", label: "Lộ trình" },
  { to: "#phuong-phap", id: "phuong-phap", label: "Phương pháp" },
  { to: "#hoc-vien", id: "hoc-vien", label: "Thành tích" },
];

const EXPLORE_ITEMS = [
  {
    to: "#ky-nang",
    id: "ky-nang",
    label: "Bốn kỹ năng",
    desc: "Nghe, đọc, viết & khẩu ngữ công sở",
    icon: <Sparkles size={16} />,
  },
  {
    to: "#khu-vuc",
    id: "khu-vuc",
    label: "Khu vực học",
    desc: "9 không gian học tập & luyện thi",
    icon: <Layers size={16} />,
  },
  {
    to: "/student/learning-path",
    id: "",
    label: "Bản đồ HSK 1–9",
    desc: "Lộ trình 9 bậc chi tiết",
    icon: <Map size={16} />,
  },
  {
    to: "/student/grammar",
    id: "",
    label: "Thư viện ngữ pháp",
    desc: "Điểm ngữ pháp & bài tập tương tác",
    icon: <BookOpen size={16} />,
  },
];

const FOOTER_COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Học tập",
    links: [
      { to: "/student/learning-path", label: "Lộ trình HSK 1–9" },
      { to: "/student/grammar", label: "Thư viện ngữ pháp" },
      { to: "/student/foundation", label: "Nền tảng phát âm" },
      { to: "/student/writing", label: "Luyện viết chữ" },
    ],
  },
  {
    title: "Luyện tập",
    links: [
      { to: "/student/exams", label: "Phòng thi HSK" },
      { to: "/student/mistakes", label: "Sổ tay lỗi sai" },
      { to: "/student/lego", label: "Ghép câu Lego" },
      { to: "/student/workplace", label: "Mô phỏng công sở" },
    ],
  },
  {
    title: "Thành tích",
    links: [
      { to: "/student/progress", label: "Tiến độ học tập" },
      { to: "/student/leaderboard", label: "Bảng xếp hạng" },
      { to: "/student/badges", label: "Kho huy hiệu" },
      { to: "/student", label: "Trang chủ học viên" },
    ],
  },
];

/** Smooth-scroll to an in-page anchor section. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function SiteShell({
  theme,
  onToggleTheme,
  children,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);

  // Scroll listener: transparent sitebar over the hero, blurred once scrolled.
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAnchorClick(id: string) {
    setMenuOpen(false);
    setExploreOpen(false);
    if (id) scrollToSection(id);
  }

  return (
    <div className="site">
      <a className="skip-link" href="#site-main">
        Bỏ qua điều hướng, tới nội dung chính
      </a>

      <header className={`sitebar ${isScrolled ? "sitebar--scrolled" : "sitebar--transparent"}`}>
        <div className="sitebar__inner">
          <Link href="/student/landing" className="sitebrand" aria-label="Hán Lộ — trang giới thiệu">
            <span className="seal han" aria-hidden="true">
              汉
            </span>
            <span className="stack">
              <span className="sitebrand__name">Hán Lộ</span>
              <span className="sitebrand__tag">Học viện HSK</span>
            </span>
          </Link>

          <nav className="sitenav" aria-label="Điều hướng chính">
            {PRIMARY_NAV.map((item) => (
              <a
                key={item.id}
                href={item.to}
                className="sitenav__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnchorClick(item.id);
                }}
              >
                {item.label}
              </a>
            ))}

            <div className="sitenav__dropdown-wrap" ref={exploreRef}>
              <button
                type="button"
                className={`sitenav__link sitenav__dropdown-btn ${exploreOpen ? "is-active" : ""}`}
                onClick={() => setExploreOpen((v) => !v)}
                aria-expanded={exploreOpen}
                aria-haspopup="true"
              >
                <span>Khám phá</span>
                <ChevronDown size={14} className={`sitenav__chevron ${exploreOpen ? "is-open" : ""}`} />
              </button>

              {exploreOpen && (
                <div className="sitenav__dropdown-menu" role="menu">
                  {EXPLORE_ITEMS.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.to}
                      className="sitenav__dropdown-item"
                      role="menuitem"
                      onClick={(e) => {
                        if (sub.id) {
                          e.preventDefault();
                          handleAnchorClick(sub.id);
                        } else {
                          setExploreOpen(false);
                        }
                      }}
                    >
                      <span className="sitenav__dropdown-icon">{sub.icon}</span>
                      <span className="stack gap-0">
                        <strong className="sitenav__dropdown-title">{sub.label}</strong>
                        <span className="sitenav__dropdown-desc">{sub.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="sitebar__actions">
            <button
              type="button"
              className="btn btn--ghost btn--icon sitebar__theme-toggle"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <Link href="/student" className="sitebar__cta-premium">
              <span>Học thử miễn phí</span>
              <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              className="btn btn--ghost btn--icon sitebar__burger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="sitemenu" aria-label="Điều hướng di động">
            {PRIMARY_NAV.map((item) => (
              <a
                key={item.id}
                href={item.to}
                className="sitemenu__link"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnchorClick(item.id);
                }}
              >
                {item.label}
              </a>
            ))}

            <div className="sitemenu__divider" />
            <p className="sitemenu__heading">Khám phá học viện</p>

            {EXPLORE_ITEMS.map((sub) => (
              <Link
                key={sub.label}
                href={sub.to}
                className="sitemenu__link sitemenu__link--sub"
                onClick={(e) => {
                  if (sub.id) {
                    e.preventDefault();
                    handleAnchorClick(sub.id);
                  } else {
                    setMenuOpen(false);
                  }
                }}
              >
                <span style={{ color: "var(--accent)" }}>{sub.icon}</span>
                <span>{sub.label}</span>
              </Link>
            ))}

            <Link
              href="/student"
              className="btn btn--primary sitebar__cta-premium"
              style={{ width: "100%", justifyContent: "center", marginTop: "var(--sp-2)" }}
              onClick={() => setMenuOpen(false)}
            >
              <span>Học thử miễn phí</span>
              <ArrowRight size={15} />
            </Link>
          </nav>
        )}
      </header>

      <main id="site-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="sitefoot">
        <div className="sitefoot__inner">
          <div className="sitefoot__brand">
            <span className="seal han" aria-hidden="true">
              汉
            </span>
            <p className="sitefoot__wordmark">
              HÁN LỘ
              <br />
              <span>HỌC VIỆN HSK</span>
            </p>
            <p className="sitefoot__blurb">
              Lộ trình HSK 1–9 dựng riêng cho người Việt: chữ Hán, ngữ pháp, phát âm và bốn kỹ năng thi
              nằm trên cùng một con đường.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="sitefoot__col">
              <p className="sitefoot__coltitle">{col.title}</p>
              <ul className="stack gap-2">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link href={l.to} className="sitefoot__link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sitefoot__legal">
          <p>
            <strong>Bản prototype giao diện.</strong> Toàn bộ số liệu, bài học và hồ sơ học viên trên trang
            này là dữ liệu mô phỏng trong mã nguồn — không có backend, không có tài khoản thật.
          </p>
          <p>Hán Lộ · Thiết kế “Mực &amp; Chu Sa”</p>
        </div>
      </footer>
    </div>
  );
}
