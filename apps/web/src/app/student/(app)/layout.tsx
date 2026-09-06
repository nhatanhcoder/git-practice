import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { StudentShell } from "@/components/student/student-shell";
import "../student.css";

export const metadata: Metadata = {
  title: "Hành trình HSK — Khu vực học tập",
  description: "Mockup prototype khu vực học tập HSK 1–9 cho học viên.",
};

/**
 * The signed-in learner area. `(app)` is a route group, so it contributes nothing to the
 * URL — /student, /student/grammar and the rest keep the paths they already had.
 *
 * The group exists so the guard and the learner shell stop applying to *every* child of
 * /student. A sibling like /student/landing is a public marketing page: gating it made it
 * unreachable for the very people it is written for, and wrapping it in StudentShell put a
 * learner sidebar around a page that brings its own SiteShell.
 *
 * Kept as a server component so the metadata export above still works (a "use client"
 * layout cannot export metadata). RequireAuth is the client boundary, rendered from here —
 * the pattern /admin should move to as well, since it lost its per-area metadata by making
 * the whole layout a client component (WEB-005).
 *
 * As on the other two areas this is a UX gate, not a security boundary: the API's
 * JwtAuthGuard and RolesGuard are what actually protect student data.
 */
export default function StudentAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="student">
      <StudentShell>{children}</StudentShell>
    </RequireAuth>
  );
}
