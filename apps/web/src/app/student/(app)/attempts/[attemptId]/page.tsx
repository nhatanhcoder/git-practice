"use client";

/**
 * /student/attempts/[attemptId] — answering an assignment under the timer.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-attempt-take.md
 * Features: S-ASGN-2..S-ASGN-6, live against the attempt endpoints
 * (03-attempt-lifecycle.md). Attempt rules live in `lib/student/attempt-session.ts`.
 *
 * Two invariants the code must keep:
 * - The countdown is display only, derived from the server's `startedAt` — the
 *   server decides expiry, and a reload recomputes rather than extending time.
 * - A failed autosave never discards local text (S-ASGN-3 exists to prevent
 *   exactly that loss); a failed submit refetches state instead of replaying
 *   blindly (the endpoint has no idempotency key).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Flag, Loader2, Send, Timer } from "lucide-react";
import { EmptyState, ErrorState, PageHead, Panel, SkeletonPanel } from "@/components/student/primitives";
import { Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import {
  canSubmitAttempt,
  formatClock,
  isMultiAnswer,
  isQuestionAnswered,
  remainingMs,
  resolveTakeOutcome,
  shouldRefetchAfterSubmitFailure,
} from "@/lib/student/attempt-session";
import { formatStat } from "@/lib/student/srs-session";
import {
  fetchAttemptState,
  isValidUuid,
  saveAnswer,
  submitAttempt,
  type TakePayload,
} from "@/lib/student/attempts-service";

/** S-ASGN-3: answers auto-save every 2 seconds. */
const SAVE_DEBOUNCE_MS = 2000;

interface LocalAnswer {
  selectedOptions: string[];
  writtenAnswer: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = decodeURIComponent(params?.attemptId ?? "");
  const router = useRouter();
  const pushToast = useToast();

  const validId = isValidUuid(attemptId);
  const [payload, setPayload] = useState<TakePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const saveTimer = useRef<number | null>(null);
  const saveSeq = useRef(0);
  const submitLock = useRef(false);
  const submitted = useRef(false);
  // Live mirror of `answers` for the debounce callback: reading state inside
  // setTimeout's closure would see the render it was created in, not the
  // learner's latest keystroke.
  const answersRef = useRef<Record<string, LocalAnswer>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  // Last server-confirmed answers per question. Submit flushes everything not
  // in here first — otherwise a fast clicker submits before the 2s debounce
  // fires and the server grades stale (empty) answers.
  const lastSaved = useRef<Record<string, LocalAnswer>>({});

  const loadState = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAttemptState(attemptId);
      setPayload(res);
      const seeded: Record<string, LocalAnswer> = {};
      for (const q of res.questions) {
        seeded[q.questionId] = {
          selectedOptions: q.answer?.selectedOptions ?? [],
          writtenAnswer: q.answer?.writtenAnswer ?? null,
        };
      }
      setAnswers(seeded);
      lastSaved.current = seeded;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [attemptId, validId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const status = payload?.attempt.status ?? null;
  const outcome = resolveTakeOutcome({ loading, error, validId, status });

  const timeLimit = payload?.assignment.timeLimitMinutes ?? null;
  const startedAt = payload?.attempt.startedAt ?? null;
  const remaining = useMemo(
    () => (startedAt ? remainingMs(startedAt, timeLimit, now) : null),
    [startedAt, timeLimit, now],
  );

  function sameAnswer(a: LocalAnswer, b: LocalAnswer): boolean {
    return (
      a.writtenAnswer === b.writtenAnswer &&
      a.selectedOptions.length === b.selectedOptions.length &&
      a.selectedOptions.every((o) => b.selectedOptions.includes(o))
    );
  }

  async function flushOne(questionId: string, local: LocalAnswer): Promise<boolean> {
    if (!payload) return false;
    try {
      await saveAnswer(payload.attempt.id, { questionId, ...local });
      lastSaved.current[questionId] = { ...local };
      return true;
    } catch {
      return false;
    }
  }

  const submit = useCallback(
    async (reason: "manual" | "timeout") => {
      if (submitLock.current || submitted.current || !payload) return;
      if (!canSubmitAttempt({ hasAttempt: true, submitting })) return;
      submitLock.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      try {
        // Flush unsaved answers first: the debounce may not have fired yet and
        // the server must grade what the learner sees, not what last flushed.
        // A failed flush aborts the submit — submitting stale answers silently
        // is exactly the data loss S-ASGN-3 exists to prevent.
        const dirty = payload.questions.filter(
          (q) =>
            !sameAnswer(
              answers[q.questionId] ?? { selectedOptions: [], writtenAnswer: null },
              lastSaved.current[q.questionId] ?? { selectedOptions: [], writtenAnswer: null },
            ),
        );
        if (saveTimer.current) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        let flushed = true;
        for (const q of dirty) {
          const local = answers[q.questionId] ?? { selectedOptions: [], writtenAnswer: null };
          const seq = ++saveSeq.current;
          const ok = await flushOne(q.questionId, local);
          if (seq === saveSeq.current) setSaveState(ok ? "saved" : "error");
          if (!ok) flushed = false;
        }
        if (!flushed) {
          pushToast("Còn câu chưa lưu được — kiểm tra kết nối rồi nộp lại.", "danger");
          return;
        }
        await submitAttempt(payload.attempt.id);
        submitted.current = true;
        pushToast(
          reason === "timeout" ? "Hết giờ — bài đã được nộp tự động" : "Đã nộp bài",
          reason === "timeout" ? "warn" : "success",
        );
        router.push(`/student/attempts/${payload.attempt.id}/result`);
      } catch {
        // The submit may have landed despite the failure — refetch instead of
        // replaying blindly, then let the closed state route to the result.
        if (shouldRefetchAfterSubmitFailure()) {
          try {
            const res = await fetchAttemptState(payload.attempt.id);
            setPayload(res);
            if (res.attempt.status !== "in_progress") {
              submitted.current = true;
              router.push(`/student/attempts/${payload.attempt.id}/result`);
              return;
            }
          } catch {
            // Fall through to the honest error below.
          }
        }
        pushToast("Nộp bài thất bại — bài làm của bạn vẫn còn, thử lại.", "danger");
      } finally {
        submitLock.current = false;
        setSubmitting(false);
      }
    },
    [payload, answers, pushToast, router, submitting],
  );

  // One ticking clock for the whole screen, derived from `startedAt`.
  useEffect(() => {
    if (remaining === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [remaining === null]);

  useEffect(() => {
    if (remaining === 0 && !submitted.current) void submit("timeout");
  }, [remaining, submit]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  function recordAnswer(questionId: string, patch: Partial<LocalAnswer>) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { selectedOptions: [], writtenAnswer: null };
      return { ...prev, [questionId]: { ...current, ...patch } };
    });
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const seq = ++saveSeq.current;
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        if (!payload) return;
        const local = answersRef.current[questionId] ?? {
          selectedOptions: [],
          writtenAnswer: null,
        };
        const ok = await flushOne(questionId, local);
        // A newer edit supersedes this response — only the newest request may
        // flip the indicator.
        if (seq === saveSeq.current) setSaveState(ok ? "saved" : "error");
      })();
    }, SAVE_DEBOUNCE_MS);
  }

  if (outcome === "loading") {
    return (
      <div className="stack gap-6">
        <PageHead title="Đang tải bài làm..." sub="Vui lòng chờ giây lát" />
        <SkeletonPanel rows={2} height={140} />
      </div>
    );
  }

  if (outcome === "invalid_id" || outcome === "not_found") {
    return (
      <div className="stack gap-6">
        <PageHead
          title="Không tìm thấy bài làm"
          sub="Bài làm này không tồn tại hoặc không phải của bạn."
        />
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

  if (outcome === "forbidden") {
    return (
      <div className="stack gap-6">
        <PageHead title="Không có quyền truy cập" sub="Đây không phải bài làm của bạn." />
        <Panel className="panel--pad">
          <EmptyState
            title="Quyền truy cập bị từ chối"
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

  if (outcome === "error" || !payload) {
    return (
      <div className="stack gap-6">
        <PageHead title="Lỗi kết nối" sub="Không thể tải bài làm." />
        <Panel className="panel--pad">
          <ErrorState
            title="Không tải được bài làm"
            text="Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại."
            onRetry={loadState}
          />
        </Panel>
      </div>
    );
  }

  if (outcome === "closed") {
    return (
      <div className="stack gap-6">
        <PageHead title={payload.assignment.title} sub="Bài này đã nộp, không thể sửa nữa." />
        <Panel className="panel--pad">
          <EmptyState
            title="Bài đã được nộp"
            text="Bạn có thể xem lại kết quả khi giáo viên chấm xong."
            action={
              <Link href={`/student/attempts/${payload.attempt.id}/result`} className="btn btn--primary">
                Xem kết quả
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const questions = payload.questions;
  const question = questions[index];
  if (!question) {
    return (
      <div className="stack gap-6">
        <PageHead title={payload.assignment.title} sub="Bài này chưa có câu hỏi." />
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có câu hỏi nào"
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

  const local = answers[question.questionId] ?? { selectedOptions: [], writtenAnswer: null };
  const answeredCount = questions.filter((q) =>
    isQuestionAnswered(answers[q.questionId] ?? {}),
  ).length;
  const remainingSeconds = remaining === null ? null : Math.ceil(remaining / 1000);

  function toggleOption(optionId: string) {
    if (isMultiAnswer(question.subType)) {
      const has = local.selectedOptions.includes(optionId);
      recordAnswer(question.questionId, {
        selectedOptions: has
          ? local.selectedOptions.filter((o) => o !== optionId)
          : [...local.selectedOptions, optionId],
      });
    } else {
      recordAnswer(question.questionId, { selectedOptions: [optionId] });
    }
  }

  return (
    <div className="stack gap-5">
      <div className="attempt-bar">
        <span className="grow truncate">
          <span className="eyebrow">
            {payload.assignment.type === "mock_test" ? "Bài kiểm tra" : "Bài tập"}
          </span>
          <h1 className="attempt-title">{payload.assignment.title}</h1>
        </span>

        {remainingSeconds !== null ? (
          <span
            className={`attempt-clock ${remainingSeconds <= 60 ? "is-urgent" : ""}`}
            role="timer"
            aria-live={remainingSeconds <= 60 ? "assertive" : "off"}
          >
            <Timer size={16} aria-hidden="true" /> {formatClock(remainingSeconds)}
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
          ) : saveState === "error" ? (
            <>Không lưu được — chữ của bạn vẫn giữ nguyên, sẽ thử lại khi bạn gõ tiếp.</>
          ) : null}
        </span>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={submitting}
          onClick={() => setConfirmOpen(true)}
        >
          <Send size={15} /> Nộp bài
        </button>
      </div>

      <div className="attempt-layout">
        <Panel className="panel--pad grow">
          <div className="stack gap-4">
            <div className="row gap-3 wrap">
              <span className="eyebrow">
                Câu {index + 1} / {questions.length}
              </span>
              <button
                type="button"
                className={`btn btn--sm ${flags[question.questionId] ? "btn--primary" : "btn--ghost"}`}
                aria-pressed={Boolean(flags[question.questionId])}
                onClick={() =>
                  setFlags((prev) => ({ ...prev, [question.questionId]: !prev[question.questionId] }))
                }
              >
                <Flag size={14} /> {flags[question.questionId] ? "Bỏ đánh dấu" : "Đánh dấu"}
              </button>
            </div>

            <p className="attempt-prompt">{question.content?.prompt ?? "Câu hỏi"}</p>

            {question.skill !== "writing" && question.options.length > 0 ? (
              <div className="stack gap-2">
                {question.options.map((o) => (
                  <label key={o.id} className="attempt-option">
                    <input
                      type={isMultiAnswer(question.subType) ? "checkbox" : "radio"}
                      name={question.questionId}
                      value={o.id}
                      checked={local.selectedOptions.includes(o.id)}
                      onChange={() => toggleOption(o.id)}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="textarea"
                rows={8}
                value={local.writtenAnswer ?? ""}
                placeholder="Viết câu trả lời của bạn…"
                onChange={(e) =>
                  recordAnswer(question.questionId, { writtenAnswer: e.target.value })
                }
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
                disabled={index === questions.length - 1}
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
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
              Đã trả lời {formatStat(answeredCount)}/{formatStat(questions.length)}
            </p>
            <div className="attempt-chips">
              {questions.map((q, i) => {
                const answered = isQuestionAnswered(answers[q.questionId] ?? {});
                const flagged = Boolean(flags[q.questionId]);
                const mark = flagged ? "flagged" : answered ? "answered" : "todo";
                return (
                  <button
                    key={q.questionId}
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
            Bạn đã trả lời {answeredCount}/{questions.length} câu. Sau khi nộp, bài sẽ
            khoá lại và không sửa được nữa.
          </p>
          <div className="row gap-3 wrap">
            <button type="button" className="btn btn--outline" onClick={() => setConfirmOpen(false)}>
              Làm tiếp
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              disabled={submitting}
              onClick={() => void submit("manual")}
            >
              <Send size={16} /> Nộp bài
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
