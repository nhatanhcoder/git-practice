"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, login } from "@/lib/api-client";
import { useAuthStore, type UserRole } from "@/lib/auth/auth-store";
import styles from "./login.module.css";

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
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            汉
          </span>
          <span className={styles.brandName}>HSK Platform</span>
        </div>

        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.subtitle}>Dùng tài khoản đã được quản trị viên duyệt.</p>

        {error && (
          <div className={styles.banner} role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? "true" : undefined}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        <p className={styles.hint}>
          Tài khoản seed để thử: <code>admin@hsk.local</code> / <code>Password123!</code>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary or the whole route opts out of
  // static rendering and Next fails the build.
  return (
    <Suspense fallback={<main className={styles.page} />}>
      <LoginForm />
    </Suspense>
  );
}
