"use client";

/**
 * /student/attempts/[attemptId] — answering an assignment under the timer.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-attempt-take.md
 * Features: S-ASGN-2..S-ASGN-6.
 *
 * MOCK(S-ASGN-2..6): every endpoint the contract names exists in `API_STUDENT.md` and
 * none is implemented, so answers live in component state and submitting only navigates.
 * The 2-second auto-save debounce is wired for real against a stub, so the save indicator
 * tells the truth about the debounce even though nothing leaves the browser.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Flag, Loader2, Send, Timer } from "lucide-react";
import { EmptyState, PageHead, Panel } from "@/components/student/primitives";
import { Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { assignmentById, attemptById } from "@/lib/student/lms-data";
import { isAnswered, questionMark, remainingSeconds } from "@/lib/student/lms-rules";

/** S-ASGN-3: answers auto-save every 2 seconds. */
const SAVE_DEBOUNCE_MS = 2000;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = decodeURIComponent(params?.attemptId ?? "");
  const router = useRouter();
  const pushToast = useToast();

  const attempt = useMemo(() => attemptById(attemptId), [attemptId]);
  const assignment = useMemo(
    () => (attempt ? assignmentById(attempt.assignmentId) : null),
    [attempt],
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const saveTimer = useRef<number | null>(null);
  const submitted = useRef(false);

  const remaining = attempt
    ? remainingSeconds(attempt.startedAt, assignment?.timeLimitMinutes ?? null, now)
    : null;

  const submit = useCallback(
    (reason: "manual" | "timeout") => {
      if (submitted.current || !attempt) return;
      submitted.current = true;
      setConfirmOpen(false);
      pushToast(
        reason === "timeout" ? "Hết giờ — bài đã được nộp tự động" : "Đã nộp bài",
        reason === "timeout" ? "warn" : "success",
      );
      router.push(`/student/attempts/${attempt.id}/result`);
    },
    [attempt, pushToast, router],
  );

  // One ticking clock for the whole screen. The countdown is derived from `startedAt`
  // rather than counted down in state, so a reload cannot buy extra time — and it is
  // display only: the server decides expiry, because a client clock is editable.
  useEffect(() => {
    if (remaining === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [remaining === null]);

  useEffect(() => {
    if (remaining === 0 && !submitted.current) submit("timeout");
  }, [remaining, submit]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  function recordAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // MOCK: where PATCH /student/attempts/:id/answers goes. The local answer is never
    // discarded on failure — losing typed work to a dropped request is the exact thing
    // S-ASGN-3 exists to prevent.
    saveTimer.current = window.setTimeout(() => setSaveState("saved"), SAVE_DEBOUNCE_MS);
  }

  if (!attempt || !assignment) {
    return (
      <div className="stack gap-6">
        <PageHead title="Không tìm thấy bài làm" sub="Bài làm này không tồn tại hoặc không phải của bạn." />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được bài làm"
            action={
              <Link href="/student/assignments" className="btn btn--primary">
                <ArrowLeft size={16} /> Về danh sách bài tập
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  if (attempt.status !== "in_progress") {
    // Forbidden state: a submitted attempt is closed. Re-opening it would be a second
    // bite at a graded paper, and submit is one-way by contract.
    return (
      <div className="stack gap-6">
        <PageHead title={assignment.title} sub="Bài này đã nộp, không thể sửa nữa." />
        <Panel className="panel--pad">
          <EmptyState
            title="Bài đã được nộp"
            text="Bạn có thể xem lại kết quả khi giáo viên chấm xong."
            action={
              <Link href={`/student/attempts/${attempt.id}/result`} className="btn btn--primary">
                Xem kết quả
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const question = attempt.questions[index];
  const answeredCount = attempt.questions.filter((q) => isAnswered(answers[q.id])).length;

  return (
    <div className="stack gap-5">
      <div className="attempt-bar">
        <span className="grow truncate">
          <span className="eyebrow">
            {assignment.type === "mock_test" ? "Bài kiểm tra" : "Bài tập"}
          </span>
          {/* A real h1, not a styled span: this screen replaces the usual PageHead with a
              sticky bar, and dropping the heading would leave the page with no document
              outline at all. The screen check enforces it, and a screen reader needs it. */}
          <h1 className="attempt-title">{assignment.title}</h1>
        </span>

        {remaining !== null ? (
          <span
            className={`attempt-clock ${remaining <= 60 ? "is-urgent" : ""}`}
            role="timer"
            aria-live={remaining <= 60 ? "assertive" : "off"}
          >
            <Timer size={16} aria-hidden="true" /> {formatClock(remaining)}
          </span>
        ) : null}

        <span className="attempt-save" aria-live="polite">
          {saveState === "saving" ? (
            <>
              <Loader2 size={14} className="spin" aria-hidden="true" /> Đang lưu…
            </>
          ) : saveState === "saved" ? (
            <>
              <Check size={14} aria-hidden="true" /> Đã lưu
            </>
          ) : null}
        </span>

        <button type="button" className="btn btn--primary btn--sm" onClick={() => setConfirmOpen(true)}>
          <Send size={15} /> Nộp bài
        </button>
      </div>

      <div className="attempt-layout">
        <Panel className="panel--pad grow">
          <div className="stack gap-4">
            <div className="row gap-3 wrap">
              <span className="eyebrow">
                Câu {index + 1} / {attempt.questions.length}
              </span>
              <button
                type="button"
                className={`btn btn--sm ${flags[question.id] ? "btn--primary" : "btn--ghost"}`}
                aria-pressed={Boolean(flags[question.id])}
                onClick={() =>
                  setFlags((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
                }
              >
                <Flag size={14} /> {flags[question.id] ? "Bỏ đánh dấu" : "Đánh dấu"}
              </button>
            </div>

            <p className="attempt-prompt">{question.prompt}</p>

            {question.kind === "mcq" && question.options ? (
              <div className="stack gap-2">
                {question.options.map((o) => (
                  <label key={o.id} className="attempt-option">
                    <input
                      type="radio"
                      name={question.id}
                      value={o.id}
                      checked={answers[question.id] === o.id}
                      onChange={() => recordAnswer(question.id, o.id)}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="textarea"
                rows={8}
                value={answers[question.id] ?? ""}
                placeholder="Viết câu trả lời của bạn…"
                onChange={(e) => recordAnswer(question.id, e.target.value)}
              />
            )}

            <div className="row gap-3 wrap">
              <button
                type="button"
                className="btn btn--outline"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft size={16} /> Câu trước
              </button>
              <button
                type="button"
                className="btn btn--outline grow"
                disabled={index === attempt.questions.length - 1}
                onClick={() => setIndex((i) => Math.min(attempt.questions.length - 1, i + 1))}
              >
                Câu sau <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Panel>

        <Panel className="panel--pad attempt-nav">
          <div className="stack gap-3">
            <h2 className="section-title">Danh sách câu</h2>
            <p className="section-sub">
              Đã trả lời {answeredCount}/{attempt.questions.length}
            </p>
            <div className="attempt-chips">
              {attempt.questions.map((q, i) => {
                const mark = questionMark({
                  answered: isAnswered(answers[q.id]),
                  flagged: Boolean(flags[q.id]),
                });
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`attempt-chip is-${mark} ${i === index ? "is-current" : ""}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => setIndex(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Nộp bài?">
        <div className="stack gap-4">
          <p className="section-sub">
            Bạn đã trả lời {answeredCount}/{attempt.questions.length} câu. Sau khi nộp, bài sẽ
            khoá lại và không sửa được nữa.
          </p>
          <div className="row gap-3 wrap">
            <button type="button" className="btn btn--outline" onClick={() => setConfirmOpen(false)}>
              Làm tiếp
            </button>
            <button type="button" className="btn btn--primary grow" onClick={() => submit("manual")}>
              <Send size={16} /> Nộp bài
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
