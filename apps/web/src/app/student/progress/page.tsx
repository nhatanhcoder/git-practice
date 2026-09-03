"use client";

/**
 * /student/progress — the long view.
 *
 * Streak heat grid, XP by month, the four skills against last month, and the
 * HSK 1–9 ladder. Nothing here is actionable on its own; it exists to answer
 * "am I actually getting anywhere".
 *
 * MOCK(student): series from `lib/student/content.ts`; counts from the store.
 */

import { useMemo, useState } from "react";
import { Flame, Shield, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  Chip,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  Ring,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import { useStudentProfile, useStudentStore } from "@/lib/student/store";
import { skills, streakHistory, streakMilestones, xpMonths } from "@/lib/student/content";
import { progressSummary, rankProgress } from "@/lib/student/student-rules";
import { levelProgress } from "@/lib/student/mock-user";

/** Four bands for the heat grid, in minutes. */
function heatLevel(minutes: number) {
  if (minutes === 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 45) return 3;
  return 4;
}

export default function ProgressPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const profile = useStudentProfile();

  const completedLessons = useStudentStore((s) => s.completedLessons);
  const earnedBadges = useStudentStore((s) => s.earnedBadges);
  const attempts = useStudentStore((s) => s.attempts);
  const grammarMastery = useStudentStore((s) => s.grammarMastery);

  const summary = useMemo(
    () => progressSummary({ completedLessons, earnedBadges, attempts, grammarMastery }),
    [completedLessons, earnedBadges, attempts, grammarMastery],
  );

  const maxMonthXp = Math.max(...xpMonths.map((m) => m.xp), 1);
  const studiedDays = streakHistory.filter((d) => d.minutes > 0).length;
  const totalMinutes = streakHistory.reduce((n, d) => n + d.minutes, 0);
  const rankPct = rankProgress(profile.xpIntoRank, profile.xpForNextRank);

  return (
    <>
      <PageHead
        eyebrow="Cộng đồng"
        title="Tiến độ học tập"
        sub="Toàn cảnh hành trình HSK 1–9: chuỗi ngày học, XP theo tháng, điểm mạnh yếu bốn kỹ năng và các mốc đã đạt."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={6} height={200} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Overview ---------- */}
          <Panel className="panel--pad">
            <div className="row gap-6 wrap">
              <Ring value={rankPct} size={110} label="Tiến tới danh hiệu kế tiếp">
                <div className="stack">
                  <span className="han" style={{ fontSize: "var(--step-2)" }}>
                    {profile.rankHanzi}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>{rankPct}%</span>
                </div>
              </Ring>
              <div className="grow grid grid--4">
                <Metric label="Bài đã xong" value={summary.lessons} />
                <Metric label="Đề đã qua" value={summary.exams} />
                <Metric label="Ngữ pháp thạo" value={summary.grammarMastered} />
                <Metric label="Huy hiệu" value={summary.badges} />
              </div>
            </div>
          </Panel>

          {/* ---------- Streak ---------- */}
          <Panel className="panel--pad">
            <SectionHeader
              title="Chuỗi ngày học"
              sub="13 tuần gần nhất · ô càng đậm càng học nhiều"
              action={
                <Chip tone="accent" icon={<Flame size={12} />}>
                  <span className="num">{profile.streakDays}</span> ngày · kỷ lục{" "}
                  <span className="num">{profile.bestStreak}</span>
                </Chip>
              }
            />
            <div className="heat-grid" role="img" aria-label="Lưới nhiệt số phút học 13 tuần gần nhất">
              {streakHistory.map((d) => (
                <span
                  key={d.offset}
                  className="heat-cell"
                  data-level={heatLevel(d.minutes)}
                  data-shield={d.shielded ? "true" : undefined}
                  title={`${d.offset === 0 ? "Hôm nay" : `${d.offset} ngày trước`}: ${d.minutes} phút${
                    d.shielded ? " (giữ chuỗi bằng khiên)" : ""
                  }`}
                />
              ))}
            </div>
            <div className="row gap-4 wrap" style={{ marginTop: "var(--sp-4)" }}>
              <Metric label="Ngày có học" value={`${studiedDays}/91`} />
              <Metric label="Tổng thời gian" value={Math.round(totalMinutes / 60)} unit="giờ" />
              <span className="row gap-2" style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                <Shield size={13} /> Ô viền đứt là ngày được khiên giữ chuỗi
              </span>
            </div>

            <div className="stack gap-2" style={{ marginTop: "var(--sp-5)" }}>
              <span className="eyebrow">Cột mốc</span>
              <div className="row gap-2 wrap">
                {streakMilestones.map((m) => (
                  <Chip
                    key={m.days}
                    tone={profile.streakDays >= m.days ? "success" : "neutral"}
                  >
                    <span className="num">{m.days}</span> ngày · {m.label}
                  </Chip>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid grid--2">
            {/* ---------- XP by month ---------- */}
            <Panel className="panel--pad">
              <SectionHeader title="XP theo tháng" sub="Sáu tháng gần nhất" />
              <div className="chart">
                {xpMonths.map((m, i) => (
                  <div className="chart__col" key={m.month}>
                    <div
                      className={`chart__bar ${i === xpMonths.length - 1 ? "is-today" : ""}`}
                      style={{ height: `${Math.max(4, (m.xp / maxMonthXp) * 100)}%` }}
                      title={`${m.month}: ${m.xp.toLocaleString("vi-VN")} XP`}
                    />
                    <span className="chart__label">{m.month}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* ---------- Four skills ---------- */}
            <Panel className="panel--pad">
              <SectionHeader title="Bốn kỹ năng" sub="So với tháng trước" />
              <div className="stack">
                {skills.map((s) => {
                  const delta = s.score - s.previous;
                  return (
                    <div key={s.skill} className="skill-row">
                      <span className="skill-row__name">{s.skill}</span>
                      <Bar
                        value={s.score}
                        tone={s.score >= 70 ? "success" : s.score >= 50 ? "accent" : "gold"}
                        label={`${s.skill} ${s.score}%`}
                      />
                      <span className="num" style={{ width: 40, textAlign: "right" }}>
                        {s.score}
                      </span>
                      <span
                        className="row gap-1"
                        style={{
                          width: 52,
                          justifyContent: "flex-end",
                          color: delta >= 0 ? "var(--success)" : "var(--danger)",
                          fontSize: "var(--step--2)",
                        }}
                      >
                        {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span className="num">{Math.abs(delta)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* ---------- HSK ladder ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                  Thang HSK 1 – 9
                </h2>
                <p className="section-sub">Tiến độ bài học ở từng cấp độ</p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {levelProgress.map((l) => (
                <div key={l.level} className="rowitem">
                  <span className="rowitem__icon num" aria-hidden="true">
                    {l.level}
                  </span>
                  <span className="grow stack gap-2">
                    <span className="row gap-2">
                      <span style={{ fontWeight: 600 }}>{l.label}</span>
                      {l.state === "completed" ? <Chip tone="success">Xong</Chip> : null}
                      {l.state === "current" ? <Chip tone="accent">Đang học</Chip> : null}
                      {l.state === "locked" ? <Chip>Khoá</Chip> : null}
                    </span>
                    <Bar
                      value={(l.lessonsDone / l.lessonsTotal) * 100}
                      size="sm"
                      tone={l.state === "completed" ? "success" : "accent"}
                      label={`${l.label} ${l.lessonsDone}/${l.lessonsTotal} bài`}
                    />
                    <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                      Bài <span className="num">{l.lessonsDone}/{l.lessonsTotal}</span> · từ vựng{" "}
                      <span className="num">{l.vocabMastered}/{l.vocabTotal}</span> · ngữ pháp{" "}
                      <span className="num">{l.grammarMastered}/{l.grammarTotal}</span>
                    </span>
                  </span>
                  <span className="num" style={{ width: 56, textAlign: "right" }}>
                    {l.bestExamScore === null ? "—" : `${l.bestExamScore}%`}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
