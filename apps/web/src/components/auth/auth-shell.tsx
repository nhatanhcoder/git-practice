import Link from "next/link";

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
  return (
    <div className="auth-root student-root" data-theme="dark">
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
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
