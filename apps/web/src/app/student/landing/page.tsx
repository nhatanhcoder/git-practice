import type { Metadata } from "next";
import { LandingView } from "./landing-view";

// The stylesheet stack this page was written against, ported verbatim from
// feat/student-hanlu-ui where it lived in that branch's student/layout.tsx and so applied to
// every page under /student. Here it belongs to this route alone: /student/landing sits
// outside the `(app)` group, and the learner screens keep main's student.css untouched.
//
// Order matters and is the source branch's order. tokens.css must come first — landing.css
// uses 50 CSS custom properties and defines only 2 of them; the other 48 come from tokens.css,
// which is why the page rendered unstyled when only landing.css was ported.
//
// Only three of the source branch's six stylesheets are here, and that is deliberate:
// base.css supplies 10 of the classes this page uses (skip-link, the small utilities, the
// han/num type styles) and components.css supplies the four btn-- variants. layout.css,
// pages.css and lms.css supply nothing this page references — pages.css only duplicates
// `num`, which base.css already defines — so importing them would be 2,349 lines of other
// screens' styling for no gain.
import "@/styles/hanlu/tokens.css";
import "@/styles/hanlu/base.css";
import "@/styles/hanlu/components.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Hán Lộ — Học viện HSK",
  description:
    "Lộ trình HSK 1–9, ngữ pháp, phát âm, luyện viết, phòng thi và mô phỏng công sở — tất cả trên một con đường. Bản prototype giao diện.",
};

export default function StudentLandingPage() {
  return <LandingView />;
}
