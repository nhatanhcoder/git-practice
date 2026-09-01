import type { Metadata } from "next";
import { StudentShell } from "@/components/student/student-shell";
import "./student.css";

export const metadata: Metadata = {
  title: "Hành trình HSK — Khu vực học tập",
  description: "Mockup prototype khu vực học tập HSK 1–9 cho học viên.",
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
