"use client";

/**
 * Layout switch for the Student area.
 *
 * `/student/landing` is the public Hán Lộ landing page — it renders its own
 * `SiteShell` (sitebar + footer) and must NOT sit inside the app's
 * `StudentShell` (rail + HUD). Every other Student route keeps the app shell.
 *
 * CSS imports stay in `student/layout.tsx` on purpose: they are global once
 * imported, so the landing route reuses the same Hán Lộ tokens, utilities and
 * `.btn/.panel/.pill/.seal/.modal` chrome scoped to `.student-root`.
 */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StudentShell } from "./student-shell";

export function StudentChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/student/landing")) {
    return <>{children}</>;
  }
  return <StudentShell>{children}</StudentShell>;
}
