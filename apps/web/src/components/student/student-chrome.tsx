"use client";

/**
 * Layout switch for the Student area.
 *
 * Every Student route renders inside the app shell (`StudentShell` — rail + HUD).
 * The prototype landing page that used to bypass it was removed (WEB-017,
 * owner decision 2026-09-12); a future public page would render its own shell
 * outside this component, not as a branch here.
 */

import type { ReactNode } from "react";
import { StudentShell } from "./student-shell";

export function StudentChrome({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
