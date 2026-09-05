"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore, type UserRole } from "@/lib/auth/auth-store";

/**
 * Route guard for an authenticated area.
 *
 * This is a UX gate, not a security boundary — the real check is the API's
 * JwtAuthGuard/RolesGuard, which runs whatever the browser believes. Hiding a
 * screen here without the server check would be theatre.
 */
export function RequireAuth({
  role,
  children,
}: {
  role?: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const wrongRole = status === "authenticated" && role !== undefined && user?.role !== role;

  useEffect(() => {
    // `unknown` means the restore attempt has not finished. Redirecting on it
    // bounces a signed-in user to /login on every reload — the single most
    // common bug in this pattern.
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "unknown") {
    return <FullPageNotice title="Đang kiểm tra phiên đăng nhập…" />;
  }

  if (status === "anonymous") {
    return <FullPageNotice title="Cần đăng nhập" body="Đang chuyển tới trang đăng nhập…" />;
  }

  if (wrongRole) {
    return (
      <FullPageNotice
        title="Không đủ quyền"
        body={`Tài khoản này có vai trò "${user?.role}", không vào được khu vực "${role}".`}
      />
    );
  }

  return <>{children}</>;
}

function FullPageNotice({ title, body }: { title: string; body?: string }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
        color: "#334155",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "38ch" }}>
        <h1 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>{title}</h1>
        {body && <p style={{ marginTop: 8, fontSize: "0.9rem", color: "#64748b" }}>{body}</p>}
      </div>
    </main>
  );
}
