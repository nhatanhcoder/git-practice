import type { Metadata } from "next";
import { StudentShell } from "@/components/student/student-shell";
import "./tokens.css";
import "./base.css";
import "./layout.css";
import "./components.css";
import "./pages.css";

export const metadata: Metadata = {
  title: "Hán Lộ — Học viện HSK",
  description:
    "Khu vực học tập HSK 1–9 cho học viên: lộ trình, ngữ pháp, nền tảng, luyện viết, phòng thi và ôn tập.",
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
