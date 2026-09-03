"use client";

/**
 * Landing page "Hán Lộ" — ported from the prototype's
 * `frontend/src/pages/Landing.tsx` (`Chinese UI test/ui-claude`): the
 * full-screen teacher hero on the Three.js cylinder stage, the trust-metrics
 * strip, the student hall of fame, the 3-step method, the HSK 1–9 path grid,
 * the four skills, the nine learning areas and the final CTA.
 *
 * Port notes for Next.js 14:
 * - `useContent()` (runtime JSON from an Express backend) → hard-coded
 *   `CONTENT_COUNTS` verified against the prototype's content on 2026-09-03;
 * - the Three.js stage is loaded with `next/dynamic` + `ssr: false`;
 * - the student modal reuses `@/components/student/overlay` (which reuses the
 *   repo's `use-overlay` hook) instead of the prototype's private copy;
 * - theme is scoped: `data-theme` sits on this wrapper (`.student-root`), NOT
 *   on `document.documentElement` — the same convention as `StudentShell`, so
 *   Admin and Teacher keep their own design.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Ear,
  GraduationCap,
  Layers,
  Map,
  Medal,
  MessagesSquare,
  NotebookPen,
  PenTool,
  Puzzle,
  ScrollText,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Modal } from "@/components/student/overlay";
import { SiteShell } from "@/components/site/site-shell";
import {
  CONTENT_COUNTS,
  METHOD,
  PATH_LEVELS,
  STUDENTS,
  TEACHERS,
  type Student,
} from "@/components/site/landing-data";

const TeacherHero3DStage = dynamic(
  () =>
    import("@/components/site/three-teacher-cylinder-stage").then(
      (m) => m.ThreeTeacherCylinderStage,
    ),
  { ssr: false },
);

function buildAreas() {
  return [
    {
      to: "/student/learning-path",
      icon: <Map size={20} />,
      name: "Lộ trình HSK",
      text: "Bản đồ bài học, nhiệm vụ phụ và ải trùm trải suốt chín bậc.",
      count: `${CONTENT_COUNTS.hskLevels} bậc`,
      tone: "accent" as const,
    },
    {
      to: "/student/grammar",
      icon: <BookOpen size={20} />,
      name: "Thư viện ngữ pháp",
      text: "Mỗi điểm ngữ pháp kèm ví dụ song ngữ và năm dạng bài tập.",
      count: `${CONTENT_COUNTS.grammar} điểm`,
      tone: "info" as const,
    },
    {
      to: "/student/foundation",
      icon: <Blocks size={20} />,
      name: "Nền tảng",
      text: "Thanh mẫu, vận mẫu, bốn thanh điệu, biến điệu và bộ thủ Khang Hy.",
      count: `${CONTENT_COUNTS.radicals} bộ thủ`,
      tone: "success" as const,
    },
    {
      to: "/student/writing",
      icon: <PenTool size={20} />,
      name: "Luyện viết chữ",
      text: "Thứ tự nét chạy từng bước trên bảng 米字格, có ô tập viết tay.",
      count: `${CONTENT_COUNTS.writing} chữ`,
      tone: "info" as const,
    },
    {
      to: "/student/exams",
      icon: <GraduationCap size={20} />,
      name: "Phòng thi HSK",
      text: "Đề đầy đủ và đề luyện từng phần, đồng hồ đếm ngược như thi thật.",
      count: `${CONTENT_COUNTS.exams} đề`,
      tone: "epic" as const,
    },
    {
      to: "/student/mistakes",
      icon: <NotebookPen size={20} />,
      name: "Sổ tay lỗi sai",
      text: "Năm hộp lặp lại ngắt quãng, thẻ quay lại đúng lúc bạn sắp quên.",
      count: "5 hộp SRS",
      tone: "accent" as const,
    },
    {
      to: "/student/lego",
      icon: <Puzzle size={20} />,
      name: "Ghép câu Lego",
      text: "Xếp khối chữ theo đúng trật tự câu, mỗi vai ngữ pháp một màu.",
      count: `${CONTENT_COUNTS.legoSentences} câu`,
      tone: "success" as const,
    },
    {
      to: "/student/workplace",
      icon: <Briefcase size={20} />,
      name: "Mô phỏng công sở",
      text: "Báo giá, họp nhóm, email và phỏng vấn bằng tiếng Trung.",
      count: `${CONTENT_COUNTS.workplace} tình huống`,
      tone: "epic" as const,
    },
    {
      to: "/student/badges",
      icon: <Medal size={20} />,
      name: "Kho huy hiệu",
      text: "Huy hiệu theo nhóm và độ hiếm, mở khoá bằng thói quen học đều.",
      count: `${CONTENT_COUNTS.badges} huy hiệu`,
      tone: "info" as const,
    },
  ];
}

function buildStats() {
  return [
    { value: CONTENT_COUNTS.hskLevels, label: "Bậc HSK chuẩn mới", sub: "Nhập môn HSK 1 → Tinh thông HSK 9" },
    { value: CONTENT_COUNTS.grammar, label: "Điểm ngữ pháp", sub: "Kèm 5 dạng bài tập tương tác" },
    { value: CONTENT_COUNTS.radicals, label: "Bộ thủ Khang Hy", sub: "Tra cứu nét và diễn biến tự hình" },
    {
      value: CONTENT_COUNTS.pinyinSounds,
      label: "Âm pinyin chuẩn",
      sub: "Thanh mẫu, vận mẫu & thanh điệu",
    },
  ];
}

const SKILLS = [
  {
    to: "/student/foundation?tab=listening",
    icon: <Ear size={22} />,
    name: "Nghe",
    hanzi: "听",
    text: "Hội thoại theo tốc độ thi, có bản chép lời và chú giải từ mới.",
  },
  {
    to: "/student/exams",
    icon: <ScrollText size={22} />,
    name: "Đọc",
    hanzi: "读",
    text: "Đoạn văn chọn lọc theo bậc, câu hỏi bám sát định dạng đề HSK.",
  },
  {
    to: "/student/writing",
    icon: <PenTool size={22} />,
    name: "Viết",
    hanzi: "写",
    text: "Từ thứ tự nét từng chữ đến đoạn văn theo đề, chấm theo tiêu chí.",
  },
  {
    to: "/student/workplace",
    icon: <MessagesSquare size={22} />,
    name: "Nói",
    hanzi: "说",
    text: "Mẫu câu phản xạ và tình huống công sở để nói ra thành tiếng.",
  },
];

/** Student success-story modal, as in the prototype. */
function StudentDetailModal({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  if (!student) return null;

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title={student.nameVi}
      subtitle={student.achievement}
    >
      <div className="lp-student-modal">
        <div className="lp-student-modal__hero">
          {/* eslint-disable-next-line @next/next/no-img-element — external Unsplash URL */}
          <img src={student.avatar} alt={student.nameVi} className="lp-student-modal__avatar" />
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <h4 style={{ fontSize: "var(--step-1)", margin: 0, fontWeight: 700 }}>
              {student.nameVi}
            </h4>
            <span className="lp-student__hsk" style={{ width: "fit-content" }}>
              <Award size={13} /> {student.hskLevel}
            </span>
            <p style={{ fontSize: "var(--step--1)", color: "var(--text-3)", margin: 0 }}>
              Thời gian học: <strong>{student.duration}</strong>
            </p>
          </div>
        </div>

        <div className="lp-student-modal__achievement">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{student.achievement}</span>
        </div>

        <div className="lp-student-modal__grid">
          <div className="lp-student-modal__metric">
            <span className="lp-student-modal__metric-label">Bậc HSK đạt được</span>
            <span className="lp-student-modal__metric-val" style={{ color: "var(--success)" }}>
              {student.hskLevel}
            </span>
          </div>
          <div className="lp-student-modal__metric">
            <span className="lp-student-modal__metric-label">Trình độ ban đầu</span>
            <span className="lp-student-modal__metric-val">{student.startLevel}</span>
          </div>
          <div className="lp-student-modal__metric">
            <span className="lp-student-modal__metric-label">Điểm thi chính thức</span>
            <span className="lp-student-modal__metric-val">{student.score}</span>
          </div>
          <div className="lp-student-modal__metric">
            <span className="lp-student-modal__metric-label">Thời gian luyện</span>
            <span className="lp-student-modal__metric-val">{student.duration}</span>
          </div>
          <div className="lp-student-modal__metric" style={{ gridColumn: "span 2" }}>
            <span className="lp-student-modal__metric-label">Khu vực học trọng tâm</span>
            <span className="lp-student-modal__metric-val" style={{ fontSize: "var(--step--1)" }}>
              {student.studyFocus}
            </span>
          </div>
        </div>

        <blockquote className="lp-student-modal__quote">
          &quot;{student.fullTestimonial}&quot;
        </blockquote>

        <div className="row gap-3 wrap" style={{ marginTop: "var(--sp-2)" }}>
          <Link href="/student" className="btn btn--primary grow" onClick={onClose}>
            Bắt đầu hành trình của bạn <ArrowRight size={16} />
          </Link>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function LandingView() {
  const AREAS = buildAreas();
  const STATS = buildStats();
  const [rotationStep, setRotationStep] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Theme is scoped to this wrapper, like StudentShell. Applied after mount so
  // the server and the first client render agree; dark is the default.
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("hanlo-theme");
      if (saved === "light") setTheme("light");
    } catch {
      /* prototype: ignore storage errors */
    }
  }, []);
  function toggleTheme() {
    setTheme((t) => {
      const nextTheme = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("hanlo-theme", nextTheme);
      } catch {
        /* prototype: ignore storage errors */
      }
      return nextTheme;
    });
  }

  const activeTeacherIdx = ((rotationStep % TEACHERS.length) + TEACHERS.length) % TEACHERS.length;
  const activeTeacher = TEACHERS[activeTeacherIdx];

  return (
    <div className="student-root" data-theme={theme}>
      <SiteShell theme={theme} onToggleTheme={toggleTheme}>
        {/* ---------- 1. Full-screen teacher hero (3D cylinder stage) ---------- */}
        <section
          id="giang-vien"
          className="lp-hero lp-hero--fullscreen"
          style={
            {
              background: activeTeacher.themeBg,
              "--teacher-theme": activeTeacher.themeColor,
            } as React.CSSProperties
          }
        >
          <span className="lp-hero__mark han" aria-hidden="true">
            {activeTeacher.sealHanzi}
          </span>

          <div className="lp-wrap lp-hero__split">
            <div key={activeTeacher.id} className="lp-hero__info-wrap lp-hero__info-animated">
              <p className="lp-eyebrow">HỌC VIỆN HÁN LỘ · ĐỘI NGŨ CHUYÊN GIA</p>

              <div className="stack gap-2">
                <h1 className="lp-hero__name-group">
                  <span className="lp-hero__name-vi">{activeTeacher.nameVi}</span>
                  <span className="lp-hero__name-han han">{activeTeacher.nameHan}</span>
                </h1>
                <p className="lp-hero__role">{activeTeacher.role}</p>
              </div>

              <div className="lp-hero__meta">
                <span className="lp-hero__badge">
                  <Sparkles size={13} /> {activeTeacher.qualification}
                </span>
                <span className="lp-hero__exp">
                  <Clock size={13} /> {activeTeacher.experience}
                </span>
              </div>

              <p className="lp-hero__bio">{activeTeacher.bio}</p>

              <div className="lp-hero__tags">
                {activeTeacher.tags.map((tag) => (
                  <span key={tag} className="lp-hero__tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="row gap-3 wrap lp-hero__ctas">
                <Link href="/student" className="btn btn--primary btn--lg">
                  Bắt đầu học <ArrowRight size={18} />
                </Link>
                <Link href="/student/learning-path" className="btn btn--outline btn--lg">
                  Xem lộ trình HSK
                </Link>
              </div>

              <p className="lp-note">
                Bản prototype giao diện · dữ liệu mô phỏng · không cần đăng ký
              </p>
            </div>

            <TeacherHero3DStage
              teachers={TEACHERS}
              rotationStep={rotationStep}
              setRotationStep={setRotationStep}
            />
          </div>
        </section>

        {/* ---------- 2. Trust metrics & content statistics ---------- */}
        <section className="lp-stats" aria-label="Quy mô nội dung và độ tin cậy">
          <div className="lp-wrap lp-stats__grid">
            {STATS.map((s) => (
              <div key={s.label} className="lp-stat">
                <p className="lp-stat__value num">{s.value}</p>
                <p className="lp-stat__label">{s.label}</p>
                <p className="lp-stat__sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- 3. Outstanding student success stories ---------- */}
        <section id="hoc-vien" className="lp-section lp-section--tint">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-eyebrow">Bảng vàng thành tích</p>
              <h2 className="lp-h2">
                Gương mặt <em>Học viên ưu tú</em>
              </h2>
              <p className="lp-lede lp-head__lede">
                Những học viên đã bứt phá ngoạn mục cùng phương pháp học lộ trình và lặp lại ngắt
                quãng của Hán Lộ. Bấm vào từng gương mặt để xem chi tiết quá trình học.
              </p>
            </header>

            <div className="lp-students">
              {STUDENTS.map((s) => (
                <article
                  key={s.id}
                  className="lp-student-card"
                  onClick={() => setSelectedStudent(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedStudent(s);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Xem chi tiết thành tích của ${s.nameVi}`}
                >
                  <div className="lp-student__header">
                    {/* eslint-disable-next-line @next/next/no-img-element — external Unsplash URL */}
                    <img
                      src={s.avatar}
                      alt={s.nameVi}
                      className="lp-student__avatar"
                      loading="lazy"
                    />
                    <div className="stack gap-1" style={{ minWidth: 0 }}>
                      <h3 className="lp-student__name-vi truncate">{s.nameVi}</h3>
                      <div>
                        <span className="lp-student__hsk">
                          <Award size={12} /> {s.hskLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="lp-student__quote">&quot;{s.quote}&quot;</p>

                  <div className="lp-student__achievement">
                    <CheckCircle2 size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span className="truncate">{s.achievement}</span>
                  </div>

                  <span className="lp-student-card__cta-hint">
                    Xem câu chuyện <ArrowRight size={13} />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 4. Learning method ---------- */}
        <section id="phuong-phap" className="lp-section">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-eyebrow">Phương pháp học tập</p>
              <h2 className="lp-h2">
                Ba bước, lặp lại <em>mỗi ngày</em>
              </h2>
              <p className="lp-lede lp-head__lede">
                Quy trình học tập khoa học kết hợp khoa học ghi nhớ SRS giúp bạn tiến bộ bền vững mà
                không bị quá tải.
              </p>
            </header>

            <ol className="lp-method">
              {METHOD.map((m) => (
                <li key={m.step} className="lp-step">
                  <span className="lp-step__num num" aria-hidden="true">
                    {m.step}
                  </span>
                  <h3 className="lp-step__title">{m.title}</h3>
                  <p className="lp-step__text">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- 5. HSK learning path overview ---------- */}
        <section id="lo-trinh" className="lp-section lp-section--tint">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-eyebrow">Khung chương trình</p>
              <h2 className="lp-h2">
                Chín bậc HSK, <em>một con đường</em>
              </h2>
              <p className="lp-lede lp-head__lede">
                Từ người mới bắt đầu không biết chữ Hán đến chuyên gia ngôn ngữ học thuật. Mỗi bậc đều
                có mục tiêu đo lường rõ ràng.
              </p>
            </header>

            <div className="lp-path-grid">
              {PATH_LEVELS.map((p) => (
                <div key={p.level} className="panel lp-path-card">
                  <span className="lp-path-card__hanzi han" aria-hidden="true">
                    {p.hanzi}
                  </span>
                  <div className="lp-path-card__head">
                    <span className="lp-path-card__level">{p.level}</span>
                    <span className={`pill pill--${p.tone}`}>{p.hanzi}</span>
                  </div>
                  <h3 className="lp-path-card__stage">{p.stage}</h3>
                  <div className="lp-path-card__meta">
                    <span>{p.words}</span>
                    <span>•</span>
                    <span>{p.lessons}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="row center" style={{ marginTop: "var(--sp-7)" }}>
              <Link href="/student/learning-path" className="btn btn--primary btn--lg">
                <Layers size={18} /> Khám phá bản đồ Lộ trình HSK 1–9 đầy đủ
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- 6. Four core language skills ---------- */}
        <section id="ky-nang" className="lp-section">
          <div className="lp-wrap lp-skills__grid">
            <header className="stack gap-4">
              <p className="lp-eyebrow">Bốn kỹ năng toàn diện</p>
              <h2 className="lp-h2">
                Đủ bốn mặt <em>của một kỳ thi</em>
              </h2>
              <p className="lp-lede">
                Đề thi HSK chấm nghe, đọc và viết; công việc thật còn hỏi cả kỹ năng nói. Hán Lộ
                luyện cả bốn, kèm phòng mô phỏng công sở để đưa tiếng Trung ra khỏi trang sách.
              </p>
              <div className="row gap-3 wrap">
                <Link href="/student/exams" className="btn btn--primary">
                  Vào phòng thi <ArrowRight size={16} />
                </Link>
                <Link href="/student/workplace" className="btn btn--outline">
                  Thử tình huống công sở
                </Link>
              </div>
            </header>

            <ul className="lp-skills">
              {SKILLS.map((s) => (
                <li key={s.name}>
                  <Link href={s.to} className="panel lp-skill lp-skill--link">
                    <span className="lp-skill__icon">{s.icon}</span>
                    <span className="lp-skill__hanzi han" aria-hidden="true">
                      {s.hanzi}
                    </span>
                    <h3 className="lp-skill__name">{s.name}</h3>
                    <p className="lp-skill__text">{s.text}</p>
                    <span className="lp-skill__action">
                      Bắt đầu luyện <ArrowRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- 7. Learning areas ---------- */}
        <section id="khu-vuc" className="lp-section lp-section--tint">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-eyebrow">Khu vực học tập</p>
              <h2 className="lp-h2">
                Mọi mặt của tiếng Trung, <em>dưới một mái</em>
              </h2>
              <p className="lp-lede lp-head__lede">
                Chín khu vực nối vào cùng một hồ sơ tiến độ. Học ở đâu cũng cộng về một chỗ.
              </p>
            </header>

            <div className="lp-areas">
              {AREAS.map((a) => (
                <Link key={a.to} href={a.to} className="panel lp-area">
                  <span className={`lp-area__icon lp-area__icon--${a.tone}`}>{a.icon}</span>
                  <span className="lp-area__count">{a.count}</span>
                  <h3 className="lp-area__name">{a.name}</h3>
                  <p className="lp-area__text">{a.text}</p>
                  <span className="lp-area__go">
                    Mở khu vực <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 8. Final conversion CTA ---------- */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="panel lp-cta">
              <span className="lp-cta__mark han" aria-hidden="true">
                始
              </span>
              <div className="stack gap-4" style={{ position: "relative" }}>
                <p className="lp-eyebrow">Bắt đầu học ngay</p>
                <h2 className="lp-h2 lp-cta__title">
                  Bậc đầu tiên đang <em>mở sẵn cho bạn</em>
                </h2>
                <p className="lp-lede">
                  Không cần tài khoản. Mở trang chủ học viên và đi thẳng vào bài học đang dang dở của
                  hồ sơ mẫu Nguyễn Minh Anh.
                </p>
                <div className="row gap-3 wrap">
                  <Link href="/student" className="btn btn--primary btn--lg">
                    Vào học viện ngay <ArrowRight size={18} />
                  </Link>
                  <Link href="/student/progress" className="btn btn--ghost">
                    <TrendingUp size={16} /> Xem cách theo dõi tiến độ
                  </Link>
                  <Link href="/student/leaderboard" className="btn btn--ghost">
                    <Trophy size={16} /> Bảng xếp hạng
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      </SiteShell>
    </div>
  );
}
