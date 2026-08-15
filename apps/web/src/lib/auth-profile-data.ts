// MOCK(A-AUTH-4): hardcoded profile dataset and mock responses until GET /api/v1/auth/me exists. Remove with API wiring.

export interface UserProfile {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "teacher" | "student";
  createdAt: string; // Stored in UTC ISO 8601, formatted only at render (WEB-003)
  lastLoginAt: string | null;
  initials: string;
}

export const initialAdminProfile: UserProfile = {
  id: "8",
  fullName: "Bùi Anh Tuấn",
  nickname: "Bùi Anh Tuấn",
  email: "tuanbui@example.com",
  avatarUrl: null,
  role: "admin",
  createdAt: "2025-11-05T00:00:00.000Z",
  lastLoginAt: "2026-08-11T09:31:00.000Z",
  initials: "BT",
};

// MOCK(A-AUTH-4): Validation error sample per API_AUTH.md / VALIDATION_ERROR.details
export const mockValidationErrors: Record<string, string[]> = {
  email: ["Email đã được sử dụng"],
  password: ["Mật khẩu phải có ít nhất 8 ký tự", "Phải có chữ hoa và số"],
};

export function getInitials(name: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format UTC ISO string at render time.
 * Never stores pre-formatted strings in state/data objects (resolving WEB-003).
 */
export function formatDate(isoString: string | null, withTime = false): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    if (!withTime) {
      return `${day}/${month}/${year}`;
    }
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}
