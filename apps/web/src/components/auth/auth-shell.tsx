"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useStudentPreferences } from "@/lib/student/preferences";

/**
 * The split layout both /login and /register sit in.
 *
 * The left panel is the reason this is a shared component rather than markup copied
 * twice: the brand, palette and the drifting ink motif are what carry one product
 * across both auth screens. Keeping it in one place also means the reduced-motion
 * handling is written once.
 *
 * Theme follows the persisted learner preference (same store as the app shell),
 * defaulting to dark on first paint to avoid a hydration flash — an anonymous
 * visitor who picked light in a previous session gets light here too.
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
  const theme = useStudentPreferences((s) => s.theme);
  const toggleTheme = useStudentPreferences((s) => s.toggleTheme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // The auth screens had no way to switch theme of their own — a visitor who
  // wanted light had to sign in first. Same toggle semantics as the app shell.
  const themeBtn = (
    <button
      type="button"
      className="auth-theme-toggle"
      onClick={toggleTheme}
      aria-label={mounted && theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
  return (
    <div className="auth-root student-root" data-theme={mounted ? theme : "dark"}>
      <aside className="auth-art">
        {/* Decorative: announced to nobody, and it must not land in the tab order. */}
        <span className="auth-glyph" aria-hidden="true">
          汉
        </span>

        <Link href="/" className="auth-brand">
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
        <div className="auth-theme-slot">{themeBtn}</div>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
