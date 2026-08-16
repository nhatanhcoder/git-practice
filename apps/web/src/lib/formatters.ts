/**
 * Shared formatting and UI helper utilities.
 * Conforms to docs/front-end-design-docs/root-design-fe.md §2 & specs/_DESIGN-SYSTEM.md
 */

export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

export function formatDate(isoString: string | null | undefined, fallback = "—"): string {
  if (!isoString) return fallback;
  // Handle YYYY-MM-DD or ISO datetime
  try {
    const parts = isoString.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return isoString;
  } catch {
    return isoString || fallback;
  }
}

export function formatDateTime(isoString: string | null | undefined, fallback = "—"): string {
  if (!isoString) return fallback;
  try {
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) {
      // If simple "YYYY-MM-DD HH:mm" string
      const [datePart, timePart] = isoString.split(" ");
      if (datePart && timePart) {
        const [y, m, d] = datePart.split("-");
        return `${d}/${m}/${y} ${timePart}`;
      }
      return isoString;
    }
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const mins = String(dateObj.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoString || fallback;
  }
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  { bg: "#DBEAFE", text: "#1E40AF" }, // blue
  { bg: "#EDE9FE", text: "#5B21B6" }, // violet
  { bg: "#D1FAE5", text: "#065F46" }, // emerald
  { bg: "#FEF3C7", text: "#92400E" }, // amber
  { bg: "#CFFAFE", text: "#155E75" }, // cyan
  { bg: "#FFE4E6", text: "#9F1239" }, // rose
  { bg: "#E0E7FF", text: "#3730A3" }, // indigo
  { bg: "#F1F5F9", text: "#334155" }, // slate
];

export function avatarToneFor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_TONES.length;
  return AVATAR_TONES[index];
}
