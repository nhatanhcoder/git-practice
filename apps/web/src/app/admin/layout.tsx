"use client";

import { RequireAuth } from "@/components/auth/require-auth";

/**
 * Every /admin route requires a signed-in admin. The API enforces this too
 * (RolesGuard) — this layout only stops the browser rendering a screen that is
 * guaranteed to 403, which used to show up as an empty table with no explanation.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="admin">{children}</RequireAuth>;
}
