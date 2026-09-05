"use client";

import { useEffect } from "react";
import { restoreSession } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth/auth-store";

/**
 * Restores the session once, as early as the app can run client code.
 *
 * The access token is memory-only (working-rules.md § Auth Rules), so every full
 * page load starts with nothing but the httpOnly refresh cookie. This turns that
 * cookie back into a usable session before any screen tries to fetch — otherwise
 * the first request of every reload 401s, and the user sees a login screen while
 * holding a perfectly valid 7-day cookie.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    // Only from `unknown`. Re-running after a deliberate sign-out would silently
    // sign the user back in from the cookie the logout call just revoked.
    if (status === "unknown") {
      void restoreSession();
    }
  }, [status]);

  return <>{children}</>;
}
