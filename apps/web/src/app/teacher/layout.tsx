"use client";

import { RequireAuth } from "@/components/auth/require-auth";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="teacher">{children}</RequireAuth>;
}
