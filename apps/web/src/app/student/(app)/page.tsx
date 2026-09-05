"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Layers,
  Map,
  Medal,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AudioButton } from "@/components/student/audio-button";
import {
  Card,
  Chip,
  DemoStateSwitcher,
  EmptyState,
  ErrorState,
  GhostButton,
  LoadingState,
  PrimaryButton,
  ProgressBar,
  SectionHead,
  XpPill,
  type DemoState,
} from "@/components/student/ui";
import {
  continueLesson,
  quickLinks,
  recentActivity,
  todayReview,
  type ActivityItem,
  type ReviewCard,
} from "@/lib/student/dashboard-data";
import { levelProgress, mockLearner, type LevelProgress } from "@/lib/student/mock-user";
import { useStudentProgress } from "@/lib/student/store";

const quickLinkIcons: Record<string, LucideIcon> = {
  map: Map,
  grammar: BookOpen,
  foundation: Layers,
  exam: ClipboardCheck,
};

const activityIcons: Record<ActivityItem["kind"], LucideIcon> = {
  lesson: BookOpen,
  exam: ClipboardCheck,
  srs: RotateCcw,
  grammar: BookOpen,
  streak: Flame,
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function timeAgo(minutes: number) {
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ trước`;
  return `${Math.round(minutes / 1440)} ngày trước`;
}

/* ---------- Level detail drawer content ---------- */

function LevelDetail({ level }: { level: LevelProgress }) {
  const items = [
    { label: "Bài học", done: level.lessonsDone, total: level.lessonsTotal },
    { label: "Từ vựng", done: level.vocabMastered, total: level.vocabTotal },
    { label: "Ngữ pháp", done: level.grammarMastered, total: level.grammarTotal },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="sp-font-head flex h-14 w-14 items-center justify-center rounded-2xl bg-sp-primary text-xl font-black text-white">
          {level.level}
        </span>
        <div>
          <p className="sp-font-head text-lg font-black text-sp-ink">{level.label}</p>
          <p className="text-sm text-sp-ink2">
            {level.state === "completed"
              ? "Đã hoàn thành"
              : level.state === "current"
                ? "Đang học"
                : "Chưa mở"}
          </p>
        </div>
        {level.state === "completed" ? (
          <Chip tone="ok" className="ml-auto">
            <CheckCircle2 size={13} aria-hidden="true" /> Hoàn thành
          </Chip>
        ) : level.state === "current" ? (
          <Chip tone="primary" className="ml-auto">Đang học</Chip>
        ) : null}
      </div>

      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-sp-ink">{it.label}</span>
            <span className="text-sp-ink2">
              {it.done.toLocaleString("vi-VN")} / {it.total.toLocaleString("vi-VN")}
            </span>
          </div>
          <ProgressBar
            value={(it.done / it.total) * 100}
            tone={it.done === it.total ? "ok" : "primary"}
            label={`Tiến độ ${it.label} ${level.label}`}
          />
        </div>
      ))}

      <div className="rounded-2xl border border-sp-line bg-sp-bg p-4">
        <p className="text-sm font-semibold text-sp-ink">Điểm thi thử cao nhất</p>
        {level.bestExamScore !== null ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="sp-font-head text-2xl font-black text-sp-primary">
              {level.bestExamScore}%
            </span>
            <Chip tone="ok">Đạt chuẩn</Chip>
          </div>
        ) : (
          <p className="mt-1 text-sm text-sp-ink2">Chưa thi thử cấp này</p>
        )}
      </div>

      <Link
        href={`/student/learning-path?level=${level.level}`}
        className="sp-press flex items-center justify-between rounded-xl bg-sp-primary px-4 py-3 text-sm font-extrabold text-white"
      >
        Xem lộ trình {level.label}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ---------- Review queue card ---------- */

function ReviewCardRow({ card }: { card: ReviewCard }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-sp-line bg-sp-card p-4 shadow-sp-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="sp-font-head flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sp-primary-soft text-base font-bold text-sp-primary-strong">
          {card.hanzi.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="sp-font-head block text-base font-extrabold text-sp-ink">
            {card.hanzi}
          </span>
          <span className="block truncate text-xs text-sp-ink2">
            {card.pinyin} · {card.meaning}
          </span>
        </span>
        <Chip tone={card.dueKind.includes("sai") ? "danger" : "warn"} size="sm">
          {card.dueKind}
        </Chip>
        <ChevronRight
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-sp-ink3 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open ? (
        <div className="mt-3 flex items-start gap-3 border-t border-sp-line pt-3">
          <AudioButton label={card.hanzi} size="sm" />
          <div className="min-w-0">
            <p className="text-sm text-sp-ink">{card.example}</p>
            <p className="mt-0.5 text-xs text-sp-ink2">
              HSK {card.level} · lặp lại ngẫu nhiên theo thuật toán SM-2
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Page ---------- */

export default function StudentDashboardPage() {
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [openLevel, setOpenLevel] = useState<LevelProgress | null>(null);
  const [reviewStarted, setReviewStarted] = useState(false);
  const xp = useStudentProgress((s) => s.xp);
  const addXp = useStudentProgress((s) => s.add);
  const xpInStore = xp;

  const goalPct = Math.min(100, (mockLearner.todayXp / mockLearner.dailyGoalXp) * 100);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sp-font-head text-2xl font-black text-sp-ink sm:text-3xl">
            {greeting()}, {mockLearner.nickname}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-sp-ink2">
            <CalendarDays size={15} aria-hidden="true" />
            Hôm nay là một ngày tốt để học tiếng Trung
          </p>
        </div>
        <DemoStateSwitcher state={demoState} onChange={setDemoState} />
      </div>

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continue learning */}
        <Card className="relative overflow-hidden p-5 lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Chip tone="primary">
                <Play size={12} aria-hidden="true" /> Tiếp tục học
              </Chip>
              <h2 className="sp-font-head mt-3 text-xl font-black text-sp-ink sm:text-2xl">
                {continueLesson.title}
              </h2>
              <p className="mt-1 text-base text-sp-ink2">{continueLesson.titleHanzi}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip>HSK {continueLesson.level}</Chip>
                <Chip>{continueLesson.course}</Chip>
                <Chip>còn {continueLesson.minutesLeft} phút</Chip>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-baseline justify-between text-xs text-sp-ink2">
                  <span>{continueLesson.unit}</span>
                  <span className="sp-font-head font-bold text-sp-ink">
                    {continueLesson.progress}%
                  </span>
                </div>
                <ProgressBar value={continueLesson.progress} label="Tiến độ bài học hiện tại" />
                <p className="mt-1.5 text-xs text-sp-ink2">
                  Từ vựng {continueLesson.vocabDone}/{continueLesson.vocabTotal} · Ngữ pháp{" "}
                  {continueLesson.grammarDone}/{continueLesson.grammarTotal}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <PrimaryButton
                icon={Play}
                onClick={() => addXp(10)}
                className="w-full sm:w-auto"
              >
                Học tiếp
              </PrimaryButton>
              <GhostButton className="w-full sm:w-auto">Xem tổng quan bài</GhostButton>
            </div>
          </div>
          <Sparkles
            size={120}
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 text-sp-primary-soft"
          />
        </Card>

        {/* Stats column */}
        <div className="grid gap-4">
          <Card className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sp-xp-soft text-sp-warn">
              <Zap size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="sp-font-head text-lg font-black text-sp-ink">
                {xpInStore.toLocaleString("vi-VN")} XP
              </p>
              <p className="text-xs text-sp-ink2">{mockLearner.rank}</p>
            </div>
            <Chip tone="xp">+{mockLearner.todayXp} hôm nay</Chip>
          </Card>

          <Card className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sp-accent-soft text-sp-accent-strong">
              <Flame size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="sp-font-head text-lg font-black text-sp-ink">
                {mockLearner.streakDays} ngày liên tiếp
              </p>
              <p className="text-xs text-sp-ink2">Kỷ lục: {mockLearner.bestStreak} ngày</p>
            </div>
            <Medal size={20} aria-hidden="true" className="text-sp-accent" />
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="sp-font-head text-sm font-extrabold text-sp-ink">Mục tiêu hôm nay</p>
              <p className="text-xs text-sp-ink2">
                {mockLearner.todayXp}/{mockLearner.dailyGoalXp} XP
              </p>
            </div>
            <ProgressBar value={goalPct} tone="xp" label="Mục tiêu XP hàng ngày" />
            <p className="mt-2 text-xs text-sp-ink2">
              Còn {Math.max(0, mockLearner.dailyGoalXp - mockLearner.todayXp)} XP nữa để giữ chuỗi
              ngày học.
            </p>
          </Card>
        </div>
      </div>

      {/* HSK level progress */}
      <section className="mt-8" aria-labelledby="hsk-progress-title">
        <SectionHead
          icon={Map}
          title="Tiến độ HSK 1–9"
          desc="Chọn một cấp để xem chi tiết"
          action={
            <Link
              href="/student/learning-path"
              className="sp-press sp-font-head inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold text-sp-primary hover:bg-sp-primary-soft"
            >
              Lộ trình đầy đủ <ArrowRight size={15} aria-hidden="true" />
            </Link>
          }
        />
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {levelProgress.map((lp) => {
              const pct =
                lp.lessonsTotal > 0 ? (lp.lessonsDone / lp.lessonsTotal) * 100 : 0;
              const isCurrent = lp.state === "current";
              const isDone = lp.state === "completed";
              return (
                <button
                  key={lp.level}
                  type="button"
                  onClick={() => setOpenLevel(lp)}
                  aria-label={`${lp.label} — ${
                    isDone ? "hoàn thành" : isCurrent ? "đang học" : "chưa mở"
                  }, ${Math.round(pct)}%`}
                  className={`sp-press rounded-2xl border p-3 text-left ${
                    isCurrent
                      ? "border-sp-primary bg-sp-primary-soft"
                      : isDone
                        ? "border-sp-ok/30 bg-sp-ok-soft"
                        : "border-sp-line bg-sp-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="sp-font-head text-sm font-black text-sp-ink">
                      {lp.label}
                    </span>
                    {isDone ? (
                      <CheckCircle2 size={15} className="text-sp-ok" aria-hidden="true" />
                    ) : isCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-sp-primary" aria-hidden="true" />
                    ) : null}
                  </div>
                  <ProgressBar
                    value={pct}
                    tone={isDone ? "ok" : isCurrent ? "primary" : "accent"}
                    className="mt-2"
                    label={`Tiến độ ${lp.label}`}
                  />
                  <p className="mt-1.5 text-[11px] text-sp-ink2">
                    {lp.lessonsDone}/{lp.lessonsTotal} bài
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Review queue */}
        <section className="lg:col-span-2" aria-labelledby="review-title">
          <SectionHead
            icon={RotateCcw}
            title="Ôn hôm nay"
            desc={`${todayReview.total} thẻ đến hạn · ${todayReview.newCards} thẻ mới`}
            action={
              <PrimaryButton
                icon={Play}
                className="hidden sm:inline-flex"
                disabled={reviewStarted || demoState !== "ready"}
                onClick={() => {
                  setReviewStarted(true);
                  addXp(20);
                }}
              >
                {reviewStarted ? "Đang ôn…" : "Ôn ngay"}
              </PrimaryButton>
            }
          />
          {demoState === "loading" ? (
            <LoadingState rows={4} />
          ) : demoState === "empty" ? (
            <EmptyState
              icon={CheckCircle2}
              title="Hôm nay không còn thẻ nào đến hạn"
              desc="Tuyệt vời! Bạn đã ôn hết 18 thẻ. Thẻ tiếp theo sẽ xuất hiện vào ngày mai."
              action={<GhostButton>Thêm thẻ mới</GhostButton>}
            />
          ) : demoState === "error" ? (
            <ErrorState onRetry={() => setDemoState("ready")} />
          ) : reviewStarted ? (
            <EmptyState
              icon={CheckCircle2}
              title="Phiên ôn đã bắt đầu"
              desc="Đây là trạng thái demo — bản thật sẽ chuyển sang giao diện lật thẻ SM-2. Bạn nhận +20 XP."
              action={<GhostButton onClick={() => setReviewStarted(false)}>Quay lại</GhostButton>}
            />
          ) : (
            <div className="space-y-3">
              {todayReview.cards.map((c) => (
                <ReviewCardRow key={c.id} card={c} />
              ))}
            </div>
          )}
        </section>

        {/* Activity */}
        <section aria-labelledby="activity-title">
          <SectionHead icon={Star} title="Hoạt động gần đây" />
          <Card className="divide-y divide-sp-line">
            {recentActivity.map((a) => {
              const Icon = activityIcons[a.kind];
              return (
                <div key={a.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sp-primary-soft text-sp-primary">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-sp-ink">{a.text}</p>
                    <p className="mt-0.5 text-xs text-sp-ink2">
                      {a.meta} · {timeAgo(a.minutesAgo)}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
          <div className="mt-4">
            <XpPill xp={xpInStore} />
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section className="mt-8" aria-labelledby="quick-title">
        <SectionHead
          icon={Trophy}
          title="Khám phá thêm"
          desc="Mọi khu vực luyện tập đều cách đây một cú nhấp"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => {
            const Icon = quickLinkIcons[q.icon];
            return (
              <Link
                key={q.href}
                href={q.href}
                className="sp-press group flex flex-col rounded-3xl border border-sp-line bg-sp-card p-5 shadow-sp"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sp-primary-soft text-sp-primary">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="sp-font-head mt-3 text-base font-extrabold text-sp-ink">
                  {q.title}
                </h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-sp-ink2">{q.desc}</p>
                <span className="sp-font-head mt-3 inline-flex items-center gap-1 text-sm font-bold text-sp-primary">
                  {q.cta}
                  <ChevronRight
                    size={15}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Level detail drawer */}
      {openLevel ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Chi tiết ${openLevel.label}`}>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpenLevel(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 right-0 flex w-full flex-col bg-sp-card shadow-sp sm:w-[420px]">
            <div className="flex items-center justify-between border-b border-sp-line px-5 py-4">
              <h2 className="sp-font-head text-base font-extrabold text-sp-ink">
                Chi tiết cấp độ
              </h2>
              <button
                type="button"
                onClick={() => setOpenLevel(null)}
                aria-label="Đóng"
                className="sp-press flex h-9 w-9 items-center justify-center rounded-xl text-sp-ink2 hover:bg-sp-locked-soft"
              >
                <ChevronRight size={18} aria-hidden="true" className="rotate-180" />
              </button>
            </div>
            <div className="sp-scroll flex-1 overflow-y-auto px-5 py-5">
              <LevelDetail level={openLevel} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
