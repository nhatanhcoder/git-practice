/**
 * /landing — the public marketing page (WEB-017 follow-up, owner direction
 * 2026-09-12: landing returns at this path, outside /student).
 *
 * Content rule (WEB-017 stays in force): this page asserts NOTHING about
 * people. No teacher profiles, no student results, no testimonials. Everything
 * below is either a platform fact (content counts, verified against the
 * prototype's JSON on 2026-09-03) or a description of product behaviour
 * (SM-2 review, HSK 1–9 path per the 3.0 standard vocabulary sizes).
 *
 * Deliberately a server component with zero JS: the old prototype needed a
 * three.js carousel for exactly the invented-people sections that are gone.
 */

import Link from "next/link";
import "@/styles/hanlu/tokens.css";
import "./landing.css";

// Platform facts, verified 2026-09-03 against the prototype's JSON content
// (previously CONTENT_COUNTS in the deleted landing-data.ts — same numbers).
const CONTENT_COUNTS = {
  hskLevels: 9,
  grammar: 76,
  radicals: 214,
  writing: 587,
  exams: 11,
  legoSentences: 40,
  workplace: 6,
  badges: 20,
};

// HSK 3.0 standard vocabulary sizes per level (public standard figures).
const PATH_LEVELS = [
  { level: "HSK 1", hanzi: "入门", words: "150 từ vựng" },
  { level: "HSK 2", hanzi: "基础", words: "300 từ vựng" },
  { level: "HSK 3", hanzi: "进阶", words: "600 từ vựng" },
  { level: "HSK 4", hanzi: "中级", words: "1.200 từ vựng" },
  { level: "HSK 5", hanzi: "高级", words: "2.500 từ vựng" },
  { level: "HSK 6", hanzi: "精通", words: "5.000 từ vựng" },
  { level: "HSK 7–9", hanzi: "大师", words: "11.000+ từ vựng" },
];

const METHOD = [
  {
    step: "01",
    title: "Định vị bậc của bạn",
    text: "Bài kiểm tra xếp cấp đặt bạn vào đúng một trong chín bậc HSK, thay vì bắt bạn học lại từ đầu những gì đã biết.",
  },
  {
    step: "02",
    title: "Đi theo một con đường",
    text: "Bài học và nhiệm vụ luyện tập nối thành lộ trình có thứ tự theo chuẩn HSK 3.0.",
  },
  {
    step: "03",
    title: "Ôn đúng lúc sắp quên",
    text: "Từ vựng quay lại theo lịch lặp lại ngắt quãng SM-2 — chấm Again/Hard/Good/Easy, càng nhớ chắc khoảng cách càng giãn.",
  },
];

export const metadata = {
  title: "Hán Lộ — Một con đường, từ HSK 1 đến HSK 9",
  description:
    "Lộ trình HSK 1–9: từ vựng SRS, ngữ pháp, phát âm, luyện viết và phòng thi.",
};

export default function LandingPage() {
  return (
    <div className="student-root" data-theme="dark">
      <div className="landing-root">
        <header className="landing-header">
          <span className="landing-brand">
            <span className="landing-brand__mark" aria-hidden="true">
              汉
            </span>
            Hán Lộ
          </span>
          <nav className="landing-nav" aria-label="Điều hướng trang giới thiệu">
            <Link href="/login" className="landing-navlink">
              Đăng nhập
            </Link>
            <Link href="/register" className="landing-cta">
              Đăng ký
            </Link>
          </nav>
        </header>

        <main id="main">
          <section className="landing-hero">
            <h1 className="landing-title">Một con đường, từ HSK 1 đến HSK 9.</h1>
            <p className="landing-lead">
              Lộ trình, ngữ pháp, phát âm, luyện viết và phòng thi — theo chuẩn HSK 3.0, ôn tập
              bằng lặp lại ngắt quãng SM-2.
            </p>
            <div className="landing-actions">
              <Link href="/register" className="landing-cta landing-cta--lg">
                Bắt đầu học
              </Link>
              <Link href="/login" className="landing-navlink landing-navlink--lg">
                Đã có tài khoản
              </Link>
            </div>
          </section>

          <section className="landing-stats" aria-label="Nội dung nền tảng">
            {(
              [
                [CONTENT_COUNTS.hskLevels, "Bậc HSK"],
                [CONTENT_COUNTS.grammar, "Điểm ngữ pháp"],
                [CONTENT_COUNTS.radicals, "Bộ thủ Khang Hy"],
                [CONTENT_COUNTS.writing, "Chữ luyện viết"],
                [CONTENT_COUNTS.exams, "Đề thi thử"],
                [CONTENT_COUNTS.badges, "Huy hiệu"],
              ] as const
            ).map(([value, label]) => (
              <div className="landing-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>

          <section className="landing-section" aria-labelledby="landing-path">
            <h2 id="landing-path" className="landing-h2">
              Lộ trình HSK 1–9
            </h2>
            <ul className="landing-path">
              {PATH_LEVELS.map((l) => (
                <li className="landing-path__row" key={l.level}>
                  <strong>{l.level}</strong>
                  <span className="landing-path__hanzi" lang="zh-Hans">
                    {l.hanzi}
                  </span>
                  <span>{l.words}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-section" aria-labelledby="landing-method">
            <h2 id="landing-method" className="landing-h2">
              Phương pháp
            </h2>
            <ol className="landing-method">
              {METHOD.map((m) => (
                <li className="landing-method__step" key={m.step}>
                  <span className="landing-method__num">{m.step}</span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="landing-final" aria-labelledby="landing-final-cta">
            <h2 id="landing-final-cta" className="landing-h2">
              Sẵn sàng bắt đầu?
            </h2>
            <div className="landing-actions">
              <Link href="/register" className="landing-cta landing-cta--lg">
                Tạo tài khoản
              </Link>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <span>Hán Lộ — học viện HSK trực tuyến</span>
          <span className="landing-footer__links">
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register">Đăng ký</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
