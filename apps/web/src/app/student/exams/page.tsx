"use client";

/**
 * /student/exams — the exam room lobby.
 *
 * Lists full papers and single-skill drills, plus the learner's own history.
 * Exam status is the learner's, not the exam's, so it is derived here rather
 * than stored on the fixture.
 *
 * MOCK(student): content from `lib/student/content.ts`; no API call.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, GraduationCap, ListChecks, Lock, Play, Target } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, LevelSelector, type DemoState } from "@/components/student/controls";
import { Modal } from "@/components/student/overlay";
import { useStudentProfile, useStudentStore } from "@/lib/student/store";
import { SECTION_LABEL, exams } from "@/lib/student/content";
import { examStatus } from "@/lib/student/student-rules";
import type { Exam } from "@/lib/student/types";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function ExamsPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [level, setLevel] = useState<number | "all">("all");
  const [kind, setKind] = useState<"all" | "full" | "drill">("all");
  const [gate, setGate] = useState<Exam | null>(null);

  const profile = useStudentProfile();
  const attempts = useStudentStore((s) => s.attempts);
  const storedStatus = useStudentStore((s) => s.examStatus);
  const router = useRouter();

  const withStatus = useMemo(
    () =>
      exams.map((e) => ({
        exam: e,
        status: examStatus(e, {
          examStatus: storedStatus,
          currentLevel: profile.currentLevel,
        }),
      })),
    [storedStatus, profile.currentLevel],
  );

  const results = useMemo(
    () =>
      withStatus.filter(({ exam }) => {
        if (level !== "all" && exam.level !== level) return false;
        if (kind !== "all" && exam.kind !== kind) return false;
        return true;
      }),
    [withStatus, level, kind],
  );

  const passedCount = withStatus.filter((x) => x.status === "passed").length;
  const bestScore = attempts.reduce(
    (best, a) => Math.max(best, Math.round((a.score / Math.max(a.maxScore, 1)) * 100)),
    0,
  );

  return (
    <>
      <PageHead
        title={
          <>
            Phòng thi <em>HSK</em>
          </>
        }
        sub="Đề bấm giờ, nộp bài rồi xem phiếu điểm theo từng kỹ năng."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={5} height={200} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được danh mục đề thi" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Overview ---------- */}
          <Panel className="panel--pad">
            <div className="grid grid--4">
              <Metric label="Đề có sẵn" value={exams.length} icon={<ListChecks size={14} />} />
              <Metric label="Đã qua" value={passedCount} icon={<Check size={14} />} />
              <Metric label="Lần thi" value={attempts.length} />
              <Metric label="Điểm cao nhất" value={bestScore ? `${bestScore}%` : "—"} />
            </div>
          </Panel>

          {/* ---------- Filters ---------- */}
          <Panel className="panel--pad">
            <div className="stack gap-4">
              <div className="row gap-2 wrap">
                {(
                  [
                    ["all", "Tất cả"],
                    ["full", "Đề đầy đủ"],
                    ["drill", "Luyện từng kỹ năng"],
                  ] as ["all" | "full" | "drill", string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`pill ${kind === key ? "is-active" : ""}`}
                    aria-pressed={kind === key}
                    onClick={() => setKind(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="row gap-3 wrap">
                <button
                  type="button"
                  className={`pill ${level === "all" ? "is-active" : ""}`}
                  aria-pressed={level === "all"}
                  onClick={() => setLevel("all")}
                >
                  Mọi cấp
                </button>
                <LevelSelector
                  levels={LEVELS.map((id) => ({ id }))}
                  value={typeof level === "number" ? level : -1}
                  onChange={setLevel}
                />
              </div>
            </div>
          </Panel>

          {/* ---------- Exam list ---------- */}
          <section>
            <SectionHeader
              title="Đề thi thử"
              sub={`${results.length} đề khớp bộ lọc`}
            />
            {demo === "empty" || results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState
                  icon={<GraduationCap size={26} />}
                  title="Không có đề nào khớp bộ lọc"
                  text="Bỏ bớt bộ lọc để xem toàn bộ danh mục."
                  action={
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => {
                        setKind("all");
                        setLevel("all");
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  }
                />
              </Panel>
            ) : (
              <div className="grid grid--3">
                {results.map(({ exam, status }) => (
                  <button
                    key={exam.id}
                    type="button"
                    className={`examcard ${status === "locked" ? "is-locked" : ""}`}
                    disabled={status === "locked"}
                    onClick={() => setGate(exam)}
                  >
                    <div className="row gap-2 wrap">
                      <Chip tone="accent">HSK {exam.level}</Chip>
                      {exam.kind === "drill" && exam.section ? (
                        <Chip tone="info">{SECTION_LABEL[exam.section]}</Chip>
                      ) : (
                        <Chip>Đề đầy đủ</Chip>
                      )}
                      {status === "passed" ? <Chip tone="success">Đã qua</Chip> : null}
                      {status === "locked" ? (
                        <Chip icon={<Lock size={12} />}>Khoá</Chip>
                      ) : null}
                    </div>
                    <span className="examcard__title">{exam.title}</span>
                    <span className="examcard__sub">{exam.blurb}</span>
                    <div className="examcard__stats">
                      <span>
                        <Clock size={13} /> <span className="num">{exam.durationMin}</span> phút
                      </span>
                      <span>
                        <ListChecks size={13} /> <span className="num">{exam.questionCount}</span> câu
                      </span>
                      <span>
                        <Target size={13} /> qua ở <span className="num">{exam.passScore}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ---------- History ---------- */}
          {attempts.length > 0 ? (
            <Panel>
              <div className="panel__head">
                <div>
                  <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                    Lần thi gần đây
                  </h2>
                  <p className="section-sub">Bấm để xem lại phiếu điểm</p>
                </div>
              </div>
              <div className="panel__body panel__body--flush">
                {attempts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/student/exams/${a.examId}/result`}
                    className="rowitem"
                  >
                    <span
                      className="rowitem__icon"
                      style={{
                        color: a.passed ? "var(--success)" : "var(--danger)",
                        borderColor: a.passed ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {a.passed ? <Check size={16} /> : <Target size={16} />}
                    </span>
                    <span className="grow stack gap-1">
                      <span style={{ fontWeight: 600 }}>{a.title}</span>
                      <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                        {new Date(a.at).toLocaleString("vi-VN")}
                      </span>
                    </span>
                    <Chip tone={a.passed ? "success" : "danger"}>
                      <span className="num">
                        {a.score}/{a.maxScore}
                      </span>
                    </Chip>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      )}

      {/* ---------- Start gate ---------- */}
      <Modal
        open={gate !== null}
        onClose={() => setGate(null)}
        title="Vào phòng thi?"
        subtitle={gate ? `${gate.title} · ${gate.durationMin} phút` : undefined}
        footer={
          <>
            <button type="button" className="btn btn--outline grow" onClick={() => setGate(null)}>
              Để sau
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={() => {
                if (gate) router.push(`/student/exams/${gate.id}`);
              }}
            >
              <Play size={16} /> Bắt đầu ngay
            </button>
          </>
        }
      >
        {gate ? (
          <div className="stack gap-4">
            <p style={{ color: "var(--text-2)" }}>
              Đồng hồ chạy ngay khi bạn bấm bắt đầu. Hết giờ, bài tự nộp — giống phòng thi CBT thật.
            </p>
            <div className="grid grid--3">
              <Metric label="Thời gian" value={gate.durationMin} unit="phút" />
              <Metric label="Số câu" value={gate.questionCount} />
              <Metric label="Điểm qua" value={gate.passScore} />
            </div>
            <div className="notice">
              <Target size={16} />
              <span>
                <strong>MOCK:</strong> bản mockup chấm điểm ngay trên trình duyệt. Bản thật sẽ chấm ở
                máy chủ và lấy hạn nộp từ server (ADR-005).
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
