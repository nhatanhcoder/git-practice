import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { StudentShell } from "@/components/student/student-shell";
import "./student.css";

export const metadata: Metadata = {
  title: "Hành trình HSK — Khu vực học tập",
  description: "Mockup prototype khu vực học tập HSK 1–9 cho học viên.",
};

/**
 * Every /student route requires a signed-in student. Until now this area had no guard at
 * all — /admin and /teacher were gated and /student was not, so anyone could browse the
 * whole learner area without an account. The screens are still mock-backed, which is
 * exactly why the gap survived unnoticed: nothing 401'd, because nothing was being fetched.
 *
 * Kept as a server component so the metadata export above still works (a "use client"
 * layout cannot export metadata). RequireAuth is the client boundary, rendered from here —
 * the pattern /admin should move to as well, since it lost its per-area metadata by making
 * the whole layout a client component (WEB-005).
 *
 * As on the other two areas this is a UX gate, not a security boundary: the API's
 * JwtAuthGuard and RolesGuard are what actually protect student data.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="student">
      <StudentShell>{children}</StudentShell>
    </RequireAuth>
  );
}
