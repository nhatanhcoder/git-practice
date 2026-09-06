"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, login } from "@/lib/api-client";
import { useAuthStore, type UserRole } from "@/lib/auth/auth-store";
import { AuthShell } from "@/components/auth/auth-shell";
import "@/styles/hanlu/tokens.css";
import "@/styles/hanlu/auth.css";

const HOME_FOR_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/**
 * Login messages are mapped from the registry `code`, never from the HTTP status.
 *
 * A pending account and a wrong password are both a failed login, but they need
 * opposite advice: one is "wait to be approved", the other is "check your
 * password". Reading only the status collapses them into one useless sentence.
 * Codes come from docs/api/API_ERROR_CODES.md.
 */
const MESSAGE_FOR_CODE: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  AUTH_ACCOUNT_PENDING:
    "Tài khoản đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được sau khi được duyệt.",
  AUTH_ACCOUNT_SUSPENDED: "Tài khoản đã bị khoá. Liên hệ quản trị viên để được mở lại.",
  TOO_MANY_REQUESTS: "Bạn đã thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.",
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ. Kiểm tra lại email và mật khẩu.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextParam = searchParams.get("next");
  // Set by /register after a successful signup, so the person lands here already
  // told what happened instead of guessing why they cannot sign in yet.
  const registered = searchParams.get("registered") === "1";

  // Already signed in (e.g. the restore succeeded while this page was open, or
  // the user navigated here by hand) — send them where they were going.
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(nextParam || HOME_FOR_ROLE[user.role]);
    }
  }, [status, user, nextParam, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await login(email.trim(), password);
      router.replace(nextParam || HOME_FOR_ROLE[signedIn.role]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(MESSAGE_FOR_CODE[err.code] ?? err.message);
      } else {
        // A thrown non-ApiError here is almost always the API being unreachable,
        // which looks identical to "wrong password" if reported as a login error.
        setError("Không kết nối được máy chủ. Kiểm tra API có đang chạy không.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Một con đường, từ HSK 1 đến HSK 9."
      lead="Lộ trình, ngữ pháp, phát âm, luyện viết và phòng thi — tiếp tục ở đúng chỗ bạn đang dở."
    >
      <h1 className="auth-title">Đăng nhập</h1>
      <p className="auth-sub">Dùng tài khoản đã được quản trị viên duyệt.</p>

      {registered && !error && (
        <div className="auth-banner auth-banner--ok" role="status">
          Đã tạo tài khoản. Quản trị viên cần duyệt trước khi bạn đăng nhập được.
        </div>
      )}

      {error && (
        <div className="auth-banner auth-banner--error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field" style={{ "--i": 0 } as React.CSSProperties}>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? "true" : undefined}
          />
        </div>

        <div className="auth-field" style={{ "--i": 1 } as React.CSSProperties}>
          <label className="auth-label" htmlFor="password">
            Mật khẩu
          </label>
          <input
            id="password"
            className="auth-input"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? "true" : undefined}
          />
        </div>

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting && <span className="auth-spinner" aria-hidden="true" />}
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>

      <p className="auth-foot">
        Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
      </p>

      <p className="auth-hint" style={{ textAlign: "center", marginTop: 18 }}>
        Tài khoản seed để thử: <code>admin@hsk.local</code> / <code>Password123!</code>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary or the whole route opts out of
  // static rendering and Next fails the build.
  return (
    <Suspense fallback={<div className="auth-root student-root" data-theme="dark" />}>
      <LoginForm />
    </Suspense>
  );
}
