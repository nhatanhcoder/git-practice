"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";

/**
 * The split layout both /login and /register sit in.
 *
 * The left panel is the reason this is a shared component rather than markup copied
 * twice: someone arriving from /student/landing should not feel handed off to a
 * different product, and the brand, palette and the drifting ink motif are what carry
 * that. Keeping it in one place also means the reduced-motion handling is written once.
 */
export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem("hanlu-theme") ||
        window.localStorage.getItem("hanlo-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* prototype: ignore storage errors */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      themeAttr: html.getAttribute("data-theme"),
    };
    const ink = theme === "light" ? "#f6f2ea" : "#0a0d13";
    html.style.backgroundColor = ink;
    body.style.backgroundColor = ink;
    html.setAttribute("data-theme", theme);

    return () => {
      html.style.backgroundColor = previous.htmlBg;
      body.style.backgroundColor = previous.bodyBg;
      if (previous.themeAttr) {
        html.setAttribute("data-theme", previous.themeAttr);
      } else {
        html.removeAttribute("data-theme");
      }
    };
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => {
      const nextTheme = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("hanlu-theme", nextTheme);
        window.localStorage.setItem("hanlo-theme", nextTheme);
      } catch {
        /* prototype: ignore storage errors */
      }
      return nextTheme;
    });
  }

  return (
    <div className="auth-root student-root" data-theme={theme}>
      <aside className="auth-art">
        {/* Decorative: announced to nobody, and it must not land in the tab order. */}
        <span className="auth-glyph" aria-hidden="true">
          汉
        </span>

        <Link href="/student/landing" className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">
            汉
          </span>
          Hán Lộ
        </Link>

        <div className="auth-art__copy">
          <h2 className="auth-art__title">{title}</h2>
          <p className="auth-art__lead">{lead}</p>

          <ul className="auth-art__stats">
            <li className="auth-art__stat">
              <strong>9</strong>
              <span>Bậc HSK chuẩn mới</span>
            </li>
            <li className="auth-art__stat">
              <strong>214</strong>
              <span>Bộ thủ Khang Hy</span>
            </li>
            <li className="auth-art__stat">
              <strong>76</strong>
              <span>Điểm ngữ pháp</span>
            </li>
          </ul>
        </div>

        <p className="auth-art__lead" style={{ fontSize: 12 }}>
          Bản prototype giao diện · dữ liệu mô phỏng
        </p>
      </aside>

      <main className="auth-panel">
        <button
          type="button"
          className="auth-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
