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
  BookOpen,
  Blocks,
  Flame,
  GraduationCap,
  Map,
  NotebookPen,
  PenTool,
  Play,
  Puzzle,
  Sparkles,
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
  { href: "/student/learning-path", icon: Map, tone: "", title: "Lộ trình HSK", text: "Bản đồ chặng theo giáo trình" },
  { href: "/student/flashcards", icon: Sparkles, tone: "info", title: "Flashcard", text: "Ôn từ vựng theo cấp" },
  { href: "/student/grammar", icon: BookOpen, tone: "success", title: "Ngữ pháp", text: "Tra cứu và luyện 5 dạng bài" },
  { href: "/student/foundation", icon: Blocks, tone: "epic", title: "Nền tảng", text: "Pinyin, thanh điệu, 214 bộ thủ" },
  { href: "/student/exams", icon: GraduationCap, tone: "", title: "Phòng thi", text: "Đề thi thử có bấm giờ" },
  { href: "/student/writing", icon: PenTool, tone: "info", title: "Luyện viết", text: "Thứ tự nét và bảng 米字格" },
  { href: "/student/lego", icon: Puzzle, tone: "success", title: "Ghép câu", text: "Trật tự từ qua 7 trạm" },
  { href: "/student/mistakes", icon: NotebookPen, tone: "epic", title: "Sổ tay lỗi sai", text: "Ôn lại đúng chỗ đã sai" },
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
          {/* ---------- Hero: rank + streak ---------- */}
          <section className="hero">
            <span className="hero__mark han" aria-hidden="true">
              {profile.rankHanzi}
            </span>
            <div className="grow stack gap-2" style={{ position: "relative" }}>
              <span className="eyebrow">Danh hiệu hiện tại</span>
              <h2 className="hero__title">{profile.rank}</h2>
              <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>{profile.rankBlurb}</p>
              <div className="hero__meta">
                <span className="is-xp num">
                  <Zap size={14} style={{ display: "inline" }} /> {profile.xp.toLocaleString("vi-VN")} XP
                </span>
                <span className="dot" aria-hidden="true" />
                <span>
                  HSK <span className="num">{profile.currentLevel}</span>
                </span>
                <span className="dot" aria-hidden="true" />
                <span>
                  <Flame size={14} style={{ display: "inline" }} /> chuỗi{" "}
                  <span className="num">{profile.streakDays}</span> ngày
                </span>
              </div>
              {profile.nextRank ? (
                <div className="stack gap-2" style={{ maxWidth: 420, marginTop: "var(--sp-2)" }}>
                  <Bar value={rankPct} tone="gold" label={`Tiến tới ${profile.nextRank.name}`} />
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                    Còn{" "}
                    <span className="num">
                      {(profile.xpForNextRank - profile.xpIntoRank).toLocaleString("vi-VN")}
                    </span>{" "}
                    XP nữa lên {profile.nextRank.name} {profile.nextRank.hanzi}
                  </span>
                </div>
              ) : (
                <Chip tone="warn">Đã đạt danh hiệu cao nhất</Chip>
              )}
            </div>

            <div className="stack gap-3" style={{ position: "relative", flex: "none" }}>
              <span className="eyebrow">Tuần này</span>
              <div className="streak__week">
                {weekData.map((d) => (
                  <span
                    key={d.label}
                    className={`streak__day ${d.minutes > 0 ? "is-done" : ""} ${d.isToday ? "is-today" : ""}`}
                    title={`${d.label}: ${d.minutes} phút`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                Tổng <span className="num">{totalMinutes}</span> phút
              </span>
            </div>
          </section>

          {/* ---------- Continue where you left off ---------- */}
          <Panel className="panel--pad">
            <div className="row gap-4 wrap">
              <span className="hero__mark han" style={{ width: 64, height: 64, fontSize: 26 }} aria-hidden="true">
                {continueLesson.titleHanzi.slice(0, 2)}
              </span>
              <div className="grow stack gap-2">
                <span className="eyebrow">Học tiếp</span>
                <h2 style={{ fontSize: "var(--step-2)" }}>{continueLesson.title}</h2>
                <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                  {continueLesson.course} · HSK <span className="num">{continueLesson.level}</span> ·{" "}
                  {continueLesson.unit} · còn khoảng{" "}
                  <span className="num">{continueLesson.minutesLeft}</span> phút
                </p>
                <Bar value={continueLesson.progress} label="Tiến độ bài học" />
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                  Từ vựng <span className="num">{continueLesson.vocabDone}/{continueLesson.vocabTotal}</span> ·
                  Ngữ pháp <span className="num">{continueLesson.grammarDone}/{continueLesson.grammarTotal}</span>
                </span>
              </div>
              <Link href="/student/learning-path" className="btn btn--primary btn--lg">
                <Play size={18} /> Tiếp tục
              </Link>
            </div>
          </Panel>

          {/* ---------- HSK 1–9 ladder ---------- */}
          <Panel className="panel--pad">
            <SectionHeader
              title="Bậc HSK 1 – 9"
              sub="Chọn một bậc để xem tiến độ từ vựng, ngữ pháp và điểm thi tốt nhất."
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
            <div className="grid grid--4" style={{ marginTop: "var(--sp-5)" }}>
              <Metric
                label="Bài học"
                value={`${levelRow.lessonsDone}/${levelRow.lessonsTotal}`}
              />
              <Metric
                label="Từ vựng"
                value={`${levelRow.vocabMastered}/${levelRow.vocabTotal}`}
              />
              <Metric
                label="Ngữ pháp"
                value={`${levelRow.grammarMastered}/${levelRow.grammarTotal}`}
              />
              <Metric
                label="Điểm thi tốt nhất"
                value={levelRow.bestExamScore === null ? "—" : `${levelRow.bestExamScore}%`}
              />
            </div>
          </Panel>

          {/* ---------- Review queue + week ---------- */}
          <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
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

            <div className="stack gap-5">
              <Panel className="panel--pad">
                <SectionHeader title="Tuần này" sub="Số phút học mỗi ngày" />
                <div className="chart">
                  {weekData.map((d) => (
                    <div className="chart__col" key={d.label}>
                      <div
                        className={`chart__bar ${d.isToday ? "is-today" : ""}`}
                        style={{ height: `${Math.max(4, (d.minutes / maxMinutes) * 100)}%` }}
                        title={`${d.label}: ${d.minutes} phút · ${d.xp} XP`}
                      />
                      <span className="chart__label">{d.label}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <div className="panel__head">
                  <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                    Hoạt động gần đây
                  </h2>
                </div>
                <div className="panel__body panel__body--flush">
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="rowitem">
                      <span className="rowitem__icon" aria-hidden="true">
                        {a.kind === "badge" ? <Trophy size={16} /> : <Sparkles size={16} />}
                      </span>
                      <span className="grow stack gap-1">
                        <span style={{ fontSize: "var(--step--1)" }}>{a.text}</span>
                        {a.detail ? (
                          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                            {a.detail}
                          </span>
                        ) : null}
                      </span>
                      {a.xp ? <Chip tone="warn">+{a.xp} XP</Chip> : null}
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
                <Link key={s.href} href={s.href} className="shortcut">
                  <span className={`shortcut__icon ${s.tone ? `shortcut__icon--${s.tone}` : ""}`}>
                    <s.icon size={18} />
                  </span>
                  <span className="stack gap-1 grow">
                    <span className="shortcut__title">{s.title}</span>
                    <span className="shortcut__text">{s.text}</span>
                  </span>
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
