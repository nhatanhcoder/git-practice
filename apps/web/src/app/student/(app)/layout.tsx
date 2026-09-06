import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { StudentChrome } from "@/components/student/student-chrome";

// The Hán Lộ stylesheet stack, in the source branch's order — tokens first, because every
// sheet below it reads the custom properties it defines.
//
// One copy, in src/styles/hanlu/, shared by this area, /student/landing and the auth
// screens. They were briefly duplicated (an identical tokens.css in two places), which is
// how a design system quietly splits in two.
import "@/styles/hanlu/tokens.css";
import "@/styles/hanlu/base.css";
import "@/styles/hanlu/layout.css";
import "@/styles/hanlu/components.css";
import "@/styles/hanlu/pages.css";
import "@/styles/hanlu/lms.css";
import "@/styles/hanlu/ground.css";

export const metadata: Metadata = {
  title: "Hán Lộ — Học viện HSK",
  description:
    "Khu vực học tập HSK 1–9 cho học viên: lộ trình, ngữ pháp, nền tảng, luyện viết, phòng thi và ôn tập.",
};

/**
 * The signed-in learner area, in the Hán Lộ design.
 *
 * `(app)` is a route group, so it contributes nothing to the URL — /student and every learner
 * route keep the paths they already had. The group exists so the guard and the chrome stop
 * applying to /student/landing, which is a public marketing page.
 *
 * RequireAuth is kept deliberately. The source branch's layout had no guard because that
 * branch predates PR #32; dropping it while porting would have taken the entire learner area
 * back out from behind the login without anything failing loudly enough to notice.
 */
export default function StudentAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="student">
      <StudentChrome>{children}</StudentChrome>
    </RequireAuth>
  );
}
