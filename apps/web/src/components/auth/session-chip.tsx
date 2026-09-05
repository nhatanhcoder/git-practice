"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth/auth-store";

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Học sinh",
};

/**
 * The signed-in user's chip in the top bar, plus sign-out.
 *
 * Every admin screen used to hardcode `AT` / "Anh Tuấn" / "Quản trị viên" in its
 * own copy of the header, so the chrome named a person who was not logged in —
 * and there was no way to sign out at all. Styling comes in as class names
 * because each screen owns its own CSS module and they do not share tokens for
 * this element yet.
 */
export function SessionChip({
  classNames,
  profileHref = "/admin/profile",
}: {
  classNames: {
    button: string;
    avatar: string;
    text: string;
  };
  profileHref?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const name = user.nickname || user.email;
  const initials = name.trim().slice(0, 2).toUpperCase();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <Link className={classNames.button} href={profileHref}>
        <span className={classNames.avatar}>{initials}</span>
        <span className={classNames.text}>
          <strong>{name}</strong>
          <small>{ROLE_LABEL[user.role] ?? user.role}</small>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở menu tài khoản"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 4px",
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            minWidth: 180,
            padding: 6,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 9,
            boxShadow: "0 8px 24px rgb(15 23 42 / 12%)",
          }}
        >
          <p style={{ margin: "6px 8px 8px", fontSize: 12, color: "#64748b" }}>{user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "8px 10px",
              textAlign: "left",
              fontSize: 13,
              color: "#b91c1c",
              background: "none",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </span>
  );
}
