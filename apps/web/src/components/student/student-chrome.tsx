"use client";

/**
 * Layout switch for the Student area.
 *
 * The public Hán Lộ landing page used to live at `/student/landing` and needed an
 * exemption here (it renders its own `SiteShell`, not the app's `StudentShell`).
 * It moved to `/landing` — outside this segment entirely — so the exemption is
 * gone and every remaining Student route keeps the app shell. The component stays
 * as the single place a future public sibling would hook into.
 *
 * CSS imports stay in `student/layout.tsx` on purpose: they are global once
 * imported, so the landing route reuses the same Hán Lộ tokens, utilities and
 * `.btn/.panel/.pill/.seal/.modal` chrome scoped to `.student-root`.
 */

import type { ReactNode } from "react";
import { StudentShell } from "./student-shell";

export function StudentChrome({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
