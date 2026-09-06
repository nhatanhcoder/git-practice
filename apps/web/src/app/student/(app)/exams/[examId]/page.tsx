"use client";

/**
 * /student/exams/[examId] — the exam room.
 *
 * Sticky bar with the clock, one question at a time, and a question grid that
 * shows answered / flagged / current at a glance. Running out of time submits
 * automatically, the way a real CBT room does.
 *
 * ⚠️ MOCK(student): the clock is client-side and the paper is scored in the
 * browser. **ADR-005 forbids both for the real product** — the attempt must be
 * scored server-side against a `questionSnapshot`, and the deadline must come
 * from a server `expiresAt`. Recorded in
 * docs/front-end-design-docs/HANLU_PROTOTYPE_DISTILLED.md §9. Replace
 * `scorePaper` and this timer when the Attempt API lands; do not build on them.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, Flag, Send } from "lucide-react";
import { EmptyState, PageHead, Panel, SectionHeader } from "@/components/student/primitives";
import { AudioButton } from "@/components/student/controls";
import { Modal } from "@/components/student/overlay";
import { useStudentStore } from "@/lib/student/store";
import { SECTION_HANZI, SECTION_LABEL, exams, getPaper } from "@/lib/student/content";
import { scorePaper } from "@/lib/student/student-rules";

function mmss(total: number) {
  const m = Math.floor(Math.max(0, total) / 60);
  const s = Math.max(0, total) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamRoomPage() {
  const params = useParams<{ examId: string }>();
  const examId = decodeURIComponent(params?.examId ?? "");
  const router = useRouter();
  const saveAttempt = useStudentStore((s) => s.saveAttempt);
  const awardXp = useStudentStore((s) => s.awardXp);

  const exam = exams.find((e) => e.id === examId) ?? null;
  const paper = useMemo(() => getPaper(examId), [examId]);
  const flat = useMemo(() => paper.flatMap((s) => s.questions), [paper]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [left, setLeft] = useState((exam?.durationMin ?? 30) * 60);
  const [confirming, setConfirming] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // One interval for the whole room; `left` hitting zero triggers the auto-submit
  // in the effect below rather than inside the tick, so submit runs exactly once.
  useEffect(() => {
    if (!exam || timedOut) return;
    const t = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [exam, timedOut]);

  useEffect(() => {
    if (left === 0 && exam && !timedOut) setTimedOut(true);
  }, [left, exam, timedOut]);

  if (!exam || flat.length === 0) {
    return (
      <>
        <PageHead title="Không tìm thấy đề thi" />
        <Panel className="panel--pad">
          <EmptyState
            title="Đề này không tồn tại"
            text="Đường dẫn có thể đã cũ. Quay lại phòng thi để chọn đề khác."
            action={
              <Link href="/student/exams" className="btn btn--primary">
                Về phòng thi
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  const q = flat[idx];
  const answered = Object.keys(answers).length;

  function submit() {
    const result = scorePaper(paper, answers, exam!.passScore);
    const attempt = {
      id: `att-${Date.now()}`,
      examId: exam!.id,
      title: exam!.title,
      level: exam!.level,
      score: result.score,
      maxScore: result.max,
      passed: result.passed,
      at: new Date().toISOString(),
      sections: result.sections,
      answers,
    };
    saveAttempt(attempt);
    awardXp(result.passed ? 300 : 80, exam!.durationMin);
    router.push(`/student/exams/${exam!.id}/result`);
  }

  return (
    <>
      <PageHead
        title={exam.title}
        sub={`${SECTION_LABEL[q.section]} · câu ${idx + 1}/${flat.length}`}
      />

      {/* ---------- Sticky exam bar ---------- */}
      <div className="examtop">
        <span className={`examclock ${left <= 60 ? "is-low" : ""}`} role="timer" aria-live="off">
          <Clock size={16} /> {mmss(left)}
        </span>
        <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
          Đã trả lời <span className="num">{answered}</span>/
          <span className="num">{flat.length}</span>
        </span>
        <div className="grow" />
        {/* Review affordance: jump the clock so the timeout state is reachable. */}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setLeft(10)}
          title="Rút thời gian còn 10 giây để xem trạng thái hết giờ"
        >
          Còn 10 giây
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setConfirming(true)}>
          <Send size={16} /> Nộp bài
        </button>
      </div>

      <div className="exam-layout">
        {/* ---------- Question ---------- */}
        <Panel className="panel--pad">
          <SectionHeader
            title={`Câu ${idx + 1}`}
            sub={`${SECTION_LABEL[q.section]} ${SECTION_HANZI[q.section]}`}
            action={
              <button
                type="button"
                className={`btn btn--outline btn--sm ${flagged.includes(q.id) ? "is-active" : ""}`}
                aria-pressed={flagged.includes(q.id)}
                onClick={() =>
                  setFlagged((f) =>
                    f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id],
                  )
                }
              >
                <Flag size={14} /> {flagged.includes(q.id) ? "Bỏ cờ" : "Gắn cờ"}
              </button>
            }
          />

          <div className="stack gap-5">
            {q.passage ? (
              <div className={q.section === "listening" ? "script" : "passage"}>
                <div className="row gap-3">
                  {q.section === "listening" ? (
                    <AudioButton say={q.passage} label="đoạn nghe" />
                  ) : null}
                  <div className="stack gap-1 grow">
                    <span
                      className={q.section === "listening" ? "script__hanzi han" : "passage__hanzi han"}
                    >
                      {q.passage}
                    </span>
                    {q.passagePinyin ? (
                      <span
                        className={`pinyin ${q.section === "listening" ? "script__pinyin" : "passage__pinyin"}`}
                      >
                        {q.passagePinyin}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <p className="ex-prompt">{q.prompt}</p>

            <div className="opt-list">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className={`opt ${answers[q.id] === i ? "is-picked" : ""}`}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                >
                  <span className="opt__key">{String.fromCharCode(65 + i)}</span>
                  <span className="grow han">{opt}</span>
                  {answers[q.id] === i ? <Check size={16} /> : null}
                </button>
              ))}
            </div>

            <div className="row gap-3">
              <button
                type="button"
                className="btn btn--outline"
                disabled={idx === 0}
                onClick={() => setIdx((n) => n - 1)}
              >
                <ArrowLeft size={16} /> Câu trước
              </button>
              <div className="grow" />
              <button
                type="button"
                className="btn btn--primary"
                disabled={idx + 1 >= flat.length}
                onClick={() => setIdx((n) => n + 1)}
              >
                Câu sau <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Panel>

        {/* ---------- Question navigator ---------- */}
        <Panel className="panel--pad">
          <SectionHeader title="Bảng câu hỏi" sub="Bấm số để nhảy tới câu" />
          <div className="stack gap-4">
            <div className="qgrid">
              {flat.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={`qdot ${i === idx ? "is-now" : ""} ${
                    flagged.includes(item.id) ? "is-flag" : answers[item.id] !== undefined ? "is-done" : ""
                  }`}
                  onClick={() => setIdx(i)}
                  aria-label={`Tới câu ${i + 1}`}
                  aria-current={i === idx ? "true" : undefined}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="qlegend">
              <span>
                <span className="qlegend__dot qlegend__dot--now" /> Đang làm
              </span>
              <span>
                <span className="qlegend__dot qlegend__dot--done" /> Đã trả lời
              </span>
              <span>
                <span className="qlegend__dot qlegend__dot--flag" /> Gắn cờ
              </span>
              <span>
                <span className="qlegend__dot" /> Chưa làm
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ---------- Confirm submit ---------- */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Nộp bài thi?"
        subtitle={`Đã trả lời ${answered}/${flat.length} câu`}
        footer={
          <>
            <button
              type="button"
              className="btn btn--outline grow"
              onClick={() => setConfirming(false)}
            >
              Quay lại làm tiếp
            </button>
            <button type="button" className="btn btn--primary grow" onClick={submit}>
              <Send size={16} /> Nộp bài
            </button>
          </>
        }
      >
        <p style={{ color: "var(--text-2)" }}>
          {answered < flat.length
            ? `Còn ${flat.length - answered} câu chưa trả lời — những câu này sẽ tính là sai.`
            : "Bạn đã trả lời hết. Nộp bài để xem phiếu điểm."}
        </p>
      </Modal>

      {/* ---------- Timeout ---------- */}
      <Modal
        open={timedOut}
        onClose={submit}
        title="Đã hết giờ làm bài"
        subtitle="Bài được nộp tự động, giống phòng thi CBT thật"
        footer={
          <button type="button" className="btn btn--primary btn--block" onClick={submit}>
            Xem phiếu điểm
          </button>
        }
      >
        <p style={{ color: "var(--text-2)" }}>
          Bạn đã trả lời <span className="num">{answered}</span>/
          <span className="num">{flat.length}</span> câu trước khi hết giờ.
        </p>
      </Modal>
    </>
  );
}
