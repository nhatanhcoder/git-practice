import type { Metadata } from "next";
import { LandingView } from "./landing-view";
import "./landing.css";

export const metadata: Metadata = {
  title: "Hán Lộ — Học viện HSK",
  description:
    "Lộ trình HSK 1–9, ngữ pháp, phát âm, luyện viết, phòng thi và mô phỏng công sở — tất cả trên một con đường. Bản prototype giao diện.",
};

export default function StudentLandingPage() {
  return <LandingView />;
}
