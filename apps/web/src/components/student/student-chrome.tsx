"use client";

/**
 * Layout switch for the Student area.
 *
 * Every Student route renders inside the app shell (`StudentShell` — rail + HUD).
 * The prototype landing page that once bypassed it was removed (WEB-017,
 * 2026-09-12); the component stays as the single place a future public page
 * would hook into.
 *
 * CSS imports stay in `student/layout.tsx` on purpose: they are global once
 * imported, so every Student route shares the same Hán Lộ tokens, utilities and
 * `.btn/.panel/.pill/.seal/.modal` chrome scoped to `.student-root`.
 */

import type { ReactNode } from "react";
import { StudentShell } from "./student-shell";

export function StudentChrome({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
