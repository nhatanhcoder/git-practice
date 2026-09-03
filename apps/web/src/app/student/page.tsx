"use client";

/**
 * /student — the dashboard.
 *
 * It answers one question: *what should I do right now?* Hence the order —
 * where you left off, then what is due, then how the week is going. Not a
 * control panel.
 *
 * MOCK(student): every figure comes from `lib/student/*`; no API call.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Blocks,
  Briefcase,
  ChevronRight,
  Flame,
  GraduationCap,
  Map,
  NotebookPen,
  PenTool,
  Play,
  Puzzle,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  Ring,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, LevelSelector, type DemoState } from "@/components/student/controls";
import { Drawer, Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { useStudentProfile, useStudentStore } from "@/lib/student/store";
import { boxInterval, rankProgress, reviewQueueFromMistakes } from "@/lib/student/student-rules";
import { levelProgress } from "@/lib/student/mock-user";
import { continueLesson } from "@/lib/student/dashboard-data";
import type { ReviewItem } from "@/lib/student/types";

const KIND_LABEL: Record<string, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  character: "Chữ Hán",
  listening: "Nghe",
  reading: "Đọc",
};

const SHORTCUTS = [
  { href: "/student/learning-path", icon: Map, tone: "accent", title: "Lộ trình HSK", text: "Bản đồ bài học, nhiệm vụ phụ và ải trùm." },
  { href: "/student/flashcards", icon: Sparkles, tone: "info", title: "Flashcard", text: "Ôn từ vựng theo cấp" },
  { href: "/student/grammar", icon: BookOpen, tone: "success", title: "Ngữ pháp", text: "Tra cứu và luyện 5 dạng bài" },
  { href: "/student/foundation", icon: Blocks, tone: "epic", title: "Nền tảng", text: "Pinyin, thanh điệu, 214 bộ thủ" },
  { href: "/student/exams", icon: GraduationCap, tone: "", title: "Phòng thi", text: "Đề thi thử có bấm giờ" },
  { href: "/student/writing", icon: PenTool, tone: "info", title: "Luyện viết", text: "Thứ tự nét và bảng 米字格" },
  { href: "/student/lego", icon: Puzzle, tone: "success", title: "Ghép câu", text: "Trật tự từ qua 7 trạm" },
  { href: "/student/mistakes", icon: NotebookPen, tone: "accent", title: "Sổ tay lỗi sai", text: "Ôn lại đúng chỗ đã sai" },
  { href: "/student/workplace", icon: Briefcase, tone: "epic", title: "Mô phỏng công sở", text: "Báo giá, họp nhóm, email, phỏng vấn." },
];

export default function StudentDashboard() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const profile = useStudentProfile();
  const mistakes = useStudentStore((s) => s.mistakes);
  const activity = useStudentStore((s) => s.activity);
  const weekData = useStudentStore((s) => s.week);
  const reviewMistake = useStudentStore((s) => s.reviewMistake);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  const [level, setLevel] = useState(profile.currentLevel);
  const [openItem, setOpenItem] = useState<ReviewItem | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionRight, setSessionRight] = useState(0);

  const queue = useMemo(() => reviewQueueFromMistakes(mistakes), [mistakes]);
  const levelRow = levelProgress.find((l) => l.level === level) ?? levelProgress[0];
  const maxMinutes = Math.max(...weekData.map((d) => d.minutes), 1);
  const totalMinutes = weekData.reduce((sum, d) => sum + d.minutes, 0);
  const rankPct = rankProgress(profile.xpIntoRank, profile.xpForNextRank);

  const sessionItem = queue[sessionIdx];

  function answerSession(correct: boolean) {
    if (!sessionItem) return;
    reviewMistake(sessionItem.id, correct);
    if (correct) {
      setSessionRight((n) => n + 1);
      awardXp(15, 1);
    }
    if (sessionIdx + 1 >= queue.length) {
      setSessionOpen(false);
      toast(`Xong phiên ôn — đúng ${sessionRight + (correct ? 1 : 0)}/${queue.length}`, "success");
      return;
    }
    setSessionIdx((i) => i + 1);
    setRevealed(false);
  }

  return (
    <>
      <PageHead
        title={
          <>
            Chào <em>{profile.name.split(" ").slice(-1)[0]}</em>
          </>
        }
        sub="Hôm nay học gì? Ba khối dưới đây xếp theo thứ tự nên làm."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={4} height={160} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : demo === "empty" ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có dữ liệu học tập"
            text="Bắt đầu bằng bài kiểm tra xếp cấp để hệ thống gợi ý đúng chặng."
            action={
              <Link href="/student/placement" className="btn btn--primary">
                Làm bài xếp cấp
              </Link>
            }
          />
        </Panel>
      ) : (
        <>
          {/* Prototype order: continue learning first, rank/streak alongside. */}
          <div className="dash-hero">
            <Panel className="hero" aria-labelledby="hero-title">
              <span className="hero__mark han" aria-hidden="true">学</span>
              <div className="stack gap-4" style={{ position: "relative" }}>
                <div className="row gap-2 wrap">
                  <Chip tone="accent" icon={<Play size={14} />}>Tiếp tục học</Chip>
                  <Chip>{continueLesson.course} · HSK {continueLesson.level}</Chip>
                </div>
                <div className="stack gap-2">
                  <p className="hero__hanzi han">{continueLesson.titleHanzi}</p>
                  <p className="hero__pinyin">qù shāngchǎng mǎi dōngxi</p>
                  <h2 id="hero-title" className="hero__title">{continueLesson.title}</h2>
                </div>
                <div className="stack gap-2">
                  <div className="row gap-3">
                    <span className="metric__label">Tiến độ bài học</span>
                    <span className="grow" />
                    <span className="num" style={{ fontWeight: 700 }}>{continueLesson.progress}%</span>
                  </div>
                  <Bar value={continueLesson.progress} label="Tiến độ bài học" />
                </div>
                <p className="hero__meta">
                  <span>{continueLesson.unit}</span>
                  <span><span className="num">{continueLesson.minutesLeft}</span> phút</span>
                  <span className="is-xp"><Zap size={14} /><span className="num is-xp">+180</span> XP</span>
                </p>
                <div className="row gap-3 wrap">
                  <Link href="/student/learning-path/lesson-8" className="btn btn--primary btn--lg">
                    Tiếp tục {continueLesson.title.split("·")[0]} <ArrowRight size={18} />
                  </Link>
                  <Link href="/student/learning-path" className="btn btn--ghost">
                    Xem toàn bộ lộ trình <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </Panel>

            <div className="stack gap-5">
              <Panel className="panel--pad">
                <div className="row gap-4">
                  <Ring value={rankPct} size={76} stroke={7} label="Tiến độ danh hiệu">
                    <span className="han" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                      {profile.rankHanzi}
                    </span>
                  </Ring>
                  <div className="grow stack gap-1">
                    <span className="metric__label">Danh hiệu</span>
                    <h2 style={{ fontSize: "var(--step-1)" }}>{profile.rank}</h2>
                    <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                      Còn <strong className="num" style={{ color: "var(--gold-400)" }}>
                        {(profile.xpForNextRank - profile.xpIntoRank).toLocaleString("vi-VN")} XP
                      </strong> để lên {profile.nextRank?.name ?? "cấp tối đa"}
                    </span>
                  </div>
                </div>
                <div className="divider" />
                <div className="row gap-5 wrap">
                  <Metric label="Tổng XP" value={profile.xp.toLocaleString("vi-VN")} />
                  <Metric label="Từ đã thuộc" value="412" />
                  <Metric label="Độ chính xác" value="87%" />
                </div>
              </Panel>

              <Panel className="panel--pad streak">
                <div className="row gap-4">
                  <span className="streak__flame" aria-hidden="true"><Flame size={25} /></span>
                  <div className="grow stack gap-1">
                    <span className="metric__label">Chuỗi ngày học</span>
                    <p className="metric__value num">{profile.streakDays} <span className="metric__unit">ngày</span></p>
                  </div>
                  <Chip tone="info">Kỷ lục {profile.bestStreak}</Chip>
                </div>
                <ul className="streak__week" aria-label="Bảy ngày gần nhất">
                  {weekData.map((d) => (
                    <li key={d.label} className={`streak__day ${d.minutes > 0 ? "is-done" : ""} ${d.isToday ? "is-today" : ""}`} title={`${d.label}: ${d.minutes} phút`}>
                      {d.label}
                    </li>
                  ))}
                </ul>
                <div className="stack gap-2">
                  <div className="row gap-2">
                    <span className="metric__label">Mục tiêu hôm nay</span>
                    <span className="grow" />
                    <span className="num" style={{ fontSize: "var(--step--1)", fontWeight: 700 }}>{totalMinutes}/30 phút</span>
                  </div>
                  <Bar value={(totalMinutes / 30) * 100} size="sm" label="Mục tiêu hôm nay" />
                </div>
              </Panel>
            </div>
          </div>

          {/* ---------- HSK 1–9 ladder ---------- */}
          <Panel className="panel--pad stack gap-5">
            <SectionHeader
              title="Bậc HSK 1 – 9"
              sub="Chọn một bậc để xem tiến độ từ vựng, ngữ pháp và điểm thi tốt nhất."
              action={<Link href="/student/learning-path" className="btn btn--outline btn--sm">Mở bản đồ lộ trình <ChevronRight size={15} /></Link>}
            />
            <LevelSelector
              levels={levelProgress.map((l) => ({
                id: l.level,
                done: l.state === "completed",
                locked: l.state === "locked",
              }))}
              value={level}
              onChange={setLevel}
            />
            <div className="ladder">
              <div className="ladder__glyph han" aria-hidden="true">{level}</div>
              <div className="grow stack gap-3">
                <div className="row gap-2 wrap">
                  <Chip tone="accent">HSK {level}</Chip>
                  <strong>{levelRow.state === "completed" ? "Đã hoàn thành" : levelRow.state === "current" ? "Đang học" : "Chưa mở"}</strong>
                </div>
                <div className="stack gap-2">
                  <div className="row gap-2"><span className="metric__label">Tiến độ cấp</span><span className="grow" /><span className="num" style={{ fontWeight: 700 }}>{Math.round((levelRow.lessonsDone / levelRow.lessonsTotal) * 100)}%</span></div>
                  <Bar value={(levelRow.lessonsDone / levelRow.lessonsTotal) * 100} tone="success" />
                </div>
                <div className="row gap-6 wrap">
                  <Metric label="Bài học" value={`${levelRow.lessonsDone}/${levelRow.lessonsTotal}`} />
                  <Metric label="Từ vựng" value={`${levelRow.vocabMastered}/${levelRow.vocabTotal}`} />
                  <Metric label="Ngữ pháp" value={`${levelRow.grammarMastered}/${levelRow.grammarTotal}`} />
                  <Metric label="Điểm thi" value={levelRow.bestExamScore === null ? "—" : `${levelRow.bestExamScore}%`} />
                </div>
                <div className="row gap-3 wrap">
                  <Link href="/student/learning-path" className="btn btn--primary"><Target size={16} /> Vào lộ trình</Link>
                  <Link href="/student/grammar" className="btn btn--outline"><BookOpen size={16} /> Ôn ngữ pháp</Link>
                </div>
              </div>
            </div>
          </Panel>

          {/* ---------- Review queue + week ---------- */}
          <div className="dash-split">
            <div className="stack gap-6">
              <Panel>
              <div className="panel__head">
                <div>
                  <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                    Ôn tập hôm nay
                  </h2>
                  <p className="section-sub">
                    <span className="num">{queue.length}</span> thẻ đến hạn, lấy từ sổ tay lỗi sai
                  </p>
                </div>
                {queue.length > 0 ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      setSessionIdx(0);
                      setSessionRight(0);
                      setRevealed(false);
                      setSessionOpen(true);
                    }}
                  >
                    <Play size={16} /> Ôn nhanh
                  </button>
                ) : null}
              </div>
                <div className="panel__body panel__body--flush">
                {queue.length === 0 ? (
                  <EmptyState
                    title="Hàng đợi trống"
                    text="Không còn thẻ nào đến hạn hôm nay. Học chặng mới để tạo thêm bài ôn."
                  />
                ) : (
                  queue.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="rowitem"
                      onClick={() => setOpenItem(item)}
                    >
                      <span className="rowitem__icon han" aria-hidden="true">
                        {item.hanzi.slice(0, 1)}
                      </span>
                      <span className="grow stack gap-1">
                        <span style={{ fontWeight: 600 }} className="truncate">
                          {item.prompt}
                        </span>
                        <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                          {KIND_LABEL[item.kind]} · Hộp <span className="num">{item.box}</span> ·{" "}
                          {boxInterval(item.box)}
                        </span>
                      </span>
                      <Ring value={item.strength} size={38} stroke={4} label="Độ nhớ" />
                    </button>
                  ))
                )}
                </div>
              </Panel>

              <Panel>
                <div className="panel__head"><h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>Hoạt động gần đây</h2></div>
                <div className="panel__body panel__body--flush">
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="rowitem">
                      <span className="rowitem__icon" aria-hidden="true">{a.kind === "badge" ? <Award size={16} /> : <Sparkles size={16} />}</span>
                      <span className="grow stack gap-1"><span style={{ fontSize: "var(--step--1)" }}>{a.text}</span>{a.detail ? <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>{a.detail}</span> : null}</span>
                      {a.xp ? <Chip tone="warn">+{a.xp} XP</Chip> : null}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="stack gap-6">
              <Panel className="panel--pad">
                <SectionHeader title="Tuần này" sub="Số phút học mỗi ngày" />
                <div className="chart">
                  {weekData.map((d) => (
                    <div className="chart__col" key={d.label}>
                      <div
                        className={`chart__bar ${d.isToday ? "is-today" : ""}`}
                        style={{ height: `${Math.max(4, (d.minutes / maxMinutes) * 100)}%` }}
                        title={`${d.label}: ${d.minutes} phút · ${d.xp} XP`}
                      ><span className="chart__tip num">{d.minutes} phút</span></div>
                      <span className="chart__label">{d.label}</span>
                    </div>
                  ))}
                </div>
              </Panel>

            </div>
          </div>

          {/* ---------- Shortcuts ---------- */}
          <section>
            <SectionHeader title="Lối tắt" sub="Chín khu vực học, mở thẳng từ đây." />
            <div className="shortcuts">
              {SHORTCUTS.map((s) => (
                <Link key={s.href} href={s.href} className="panel shortcut">
                  <span className={`shortcut__icon ${s.tone ? `shortcut__icon--${s.tone}` : ""}`}>
                    <s.icon size={18} />
                  </span>
                  <span className="shortcut__title">{s.title}</span>
                  <span className="shortcut__text">{s.text}</span>
                  <span className="row gap-2 shortcut__go" style={{ fontSize: "var(--step--1)", fontWeight: 600 }}>Mở khu vực <ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ---------- Review item drawer ---------- */}
      <Drawer
        open={openItem !== null}
        onClose={() => setOpenItem(null)}
        eyebrow={openItem ? KIND_LABEL[openItem.kind] : ""}
        title={openItem?.prompt ?? ""}
        subtitle={openItem ? `Hộp ${openItem.box} · ${boxInterval(openItem.box)}` : ""}
        footer={
          <>
            <button
              type="button"
              className="btn btn--outline grow"
              onClick={() => {
                if (openItem) reviewMistake(openItem.id, false);
                setOpenItem(null);
              }}
            >
              Chưa nhớ
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={() => {
                if (openItem) {
                  reviewMistake(openItem.id, true);
                  awardXp(15, 1);
                  toast("+15 XP", "success");
                }
                setOpenItem(null);
              }}
            >
              Đã nhớ
            </button>
          </>
        }
      >
        {openItem ? (
          <div className="stack gap-5">
            <div className="stack gap-2" style={{ textAlign: "center" }}>
              <span className="han" style={{ fontSize: 64, lineHeight: 1.1 }}>
                {openItem.hanzi}
              </span>
              <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                {openItem.pinyin}
              </span>
              <span className="vi-meaning" style={{ color: "var(--text-2)" }}>
                {openItem.meaning}
              </span>
            </div>
            <div className="stack gap-2">
              <span className="eyebrow">Độ nhớ</span>
              <Bar value={openItem.strength} tone="success" label="Độ nhớ" />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ---------- Quick review session ---------- */}
      <Modal
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        title="Phiên ôn tập nhanh"
        subtitle={
          sessionItem
            ? `Thẻ ${sessionIdx + 1}/${queue.length} · đúng ${sessionRight}`
            : undefined
        }
        footer={
          revealed ? (
            <>
              <button
                type="button"
                className="btn btn--outline grow"
                onClick={() => answerSession(false)}
              >
                Chưa nhớ
              </button>
              <button
                type="button"
                className="btn btn--primary grow"
                onClick={() => answerSession(true)}
              >
                Đã nhớ (+15 XP)
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => setRevealed(true)}
            >
              Xem đáp án
            </button>
          )
        }
      >
        {sessionItem ? (
          <div className="stack gap-4" style={{ textAlign: "center", padding: "var(--sp-6) 0" }}>
            <span className="han" style={{ fontSize: 72, lineHeight: 1.1 }}>
              {sessionItem.hanzi}
            </span>
            {revealed ? (
              <>
                <span
                  className="pinyin"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step-2)" }}
                >
                  {sessionItem.pinyin}
                </span>
                <span className="vi-meaning" style={{ color: "var(--text-2)" }}>
                  {sessionItem.meaning}
                </span>
              </>
            ) : (
              <span style={{ color: "var(--text-3)" }}>Nhớ nghĩa rồi bấm «Xem đáp án»</span>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
