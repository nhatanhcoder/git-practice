"use client";

/**
 * /teacher/grading — the grading queue and per-question scoring drawer.
 *
 * Live against /api/v1/teacher/attempts (04-attempts-grading.md, T-GRADE-1..5):
 * queue, detail, grade commit and AI suggest. No mock data anywhere.
 *
 * WEB-006/A2 is load-bearing here: the AI's suggestion and the teacher's draft
 * are two separate states (`aiSuggestions` vs `scores`/`feedbacks`). A suggestion
 * NEVER writes the draft — the teacher applies it with an explicit click, and
 * that click is the teacher's action, recorded as such. The server enforces the
 * same boundary (grade writes teacherScore/teacherFeedback only).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleCheck, Inbox, Sparkles, X } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { StatusPill, Toast } from "@/components/teacher/teacher-widgets";
import {
  fetchGradingDetail,
  fetchGradingQueue,
  gradeAttempt,
  suggestScores,
  type GradingAnswer,
  type GradingDetail,
  type GradingQueueRow,
} from "@/lib/teacher/teacher-attempts-service";
import { useOverlay } from "@/hooks/use-overlay";
import { formatDateTime } from "@/lib/formatters";
import styles from "./grading.module.css";

interface GradingDraft {
  scores: Record<string, number | null>;
  feedbacks: Record<string, string>;
}

type QueueStatus = "submitted" | "graded";

const attemptStatusLabels: Record<string, string> = {
  submitted: "Chờ chấm",
  graded: "Đã chấm",
  in_progress: "Đang làm",
};

export default function TeacherGradingPage() {
  const [rows, setRows] = useState<GradingQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<QueueStatus>("submitted");

  const [open, setOpen] = useState<GradingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draft, setDraft] = useState<GradingDraft>({ scores: {}, feedbacks: {} });
  // A2: the AI's suggestions, kept apart from the draft and never edited.
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, { score: number; feedback: string | null }>
  >({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [toast, setToast] = useState("");
  const drawerRef = useOverlay<HTMLDivElement>(() => setOpen(null), open !== null);

  function flash(message: string) {
    setToast(message);
  }

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchGradingQueue({ status: statusFilter });
      setRows(res.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const classOptions = useMemo(() => {
    const ids = new Map<string, string>();
    rows.forEach((a) => ids.set(a.classId, a.className ?? "Lớp"));
    return Array.from(ids.entries());
  }, [rows]);

  const display = useMemo(
    () => rows.filter((a) => classFilter === "all" || a.classId === classFilter),
    [rows, classFilter],
  );
  const pendingCount = useMemo(() => rows.filter((a) => a.status === "submitted").length, [rows]);

  async function openAttempt(id: string) {
    setDetailLoading(true);
    try {
      const detail = await fetchGradingDetail(id);
      const scores: Record<string, number | null> = {};
      const feedbacks: Record<string, string> = {};
      const suggestions: Record<string, { score: number; feedback: string | null }> = {};
      for (const a of detail.answers) {
        scores[a.questionId] = a.teacherScore;
        feedbacks[a.questionId] = a.teacherFeedback ?? "";
        // Server truth, read-only: what the AI said vs what the teacher saves.
        if (a.aiSuggestedScore !== null && a.aiSuggestedScore !== undefined) {
          suggestions[a.questionId] = { score: a.aiSuggestedScore, feedback: a.aiFeedback };
        }
      }
      setDraft({ scores, feedbacks });
      setAiSuggestions(suggestions);
      setOpen(detail);
    } catch {
      flash("Không tải được bài làm — thử lại.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAiSuggest(questionId?: string) {
    if (!open || aiBusy) return;
    setAiBusy(questionId ?? "all");
    try {
      const res = await suggestScores(open.attempt.id, questionId ? [questionId] : undefined);
      setAiSuggestions((prev) => {
        const next = { ...prev };
        for (const s of res.answers) {
          if (s.aiSuggestedScore !== null) {
            next[s.questionId] = { score: s.aiSuggestedScore, feedback: s.aiFeedback };
          }
        }
        return next;
      });
      flash("Đã nhận gợi ý AI — xem và áp dụng từng câu nếu đồng ý");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      flash(
        code === "AI_KEY_INVALID"
          ? "Chưa cấu hình khóa Gemini — liên hệ admin."
          : code === "AI_QUOTA_EXCEEDED"
            ? "Đã hết quota Gemini — thử lại sau."
            : "Gợi ý AI thất bại — thử lại sau.",
      );
    } finally {
      setAiBusy(null);
    }
  }

  function applySuggestion(questionId: string) {
    const s = aiSuggestions[questionId];
    if (!s) return;
    // Explicit teacher action: copying the suggestion into the draft is the
    // teacher adopting it, and the original above stays intact for comparison.
    setDraft((d) => ({
      scores: { ...d.scores, [questionId]: s.score },
      feedbacks: { ...d.feedbacks, [questionId]: s.feedback ?? d.feedbacks[questionId] ?? "" },
    }));
  }

  function draftScoreValid(value: number | null | undefined): value is number {
    return typeof value === "number" && !Number.isNaN(value) && value >= 0;
  }

  const questions: GradingAnswer[] = open?.answers ?? [];
  const allScored =
    open !== null &&
    open.attempt.status === "submitted" &&
    questions.length > 0 &&
    questions.every((q) => draftScoreValid(draft.scores[q.questionId]));
  const draftTotal = questions.reduce(
    (s, q) => s + (draftScoreValid(draft.scores[q.questionId]) ? (draft.scores[q.questionId] as number) : 0),
    0,
  );

  async function finishGrading() {
    if (!open || !allScored || finishing) return;
    // Re-check the range here, not just via the disabled button — a disabled
    // attribute is a UI affordance, not a guard (A2 follow-up).
    const grades = questions.map((q) => ({
      questionId: q.questionId,
      teacherScore: draft.scores[q.questionId] as number,
      teacherFeedback: draft.feedbacks[q.questionId] ?? "",
    }));
    setFinishing(true);
    try {
      await gradeAttempt(open.attempt.id, grades);
      flash("Đã hoàn thành chấm — học sinh sẽ nhận thông báo");
      setOpen(null);
      loadQueue();
    } catch {
      flash("Chấm bài thất bại — thử lại.");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Chấm bài" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>CHẤM BÀI</p>
          <h1>Bài chờ chấm</h1>
          <p className={styles.subtitle}>{pendingCount} bài đang chờ — chấm xong học sinh nhận thông báo ngay.</p>
        </div>
      </header>

      <section className={styles.filterCard} aria-label="Bộ lọc bài chấm">
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Lớp học</span>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">Tất cả các lớp</option>
            {classOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Trạng thái</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as QueueStatus)}>
            <option value="submitted">Chờ chấm</option>
            <option value="graded">Đã chấm</option>
          </select>
        </label>
        <div className={styles.filterMeta}>
          <span>{display.length} bài nộp</span>
        </div>
      </section>

      {loadError && (
        <div className={styles.errorBanner} role="alert">
          <strong>Không tải được hàng chờ chấm bài.</strong>
          <button onClick={loadQueue}>Thử lại</button>
        </div>
      )}

      <section className={styles.tableCard} aria-label="Hàng chờ chấm bài">
        {loading ? (
          <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4].map((r) => <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>)}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            {pendingCount === 0 ? (
              <>
                <CircleCheck size={38} className={styles.emptyOk} />
                <h2>Không có bài chờ chấm</h2>
                <p>Tuyệt — hàng chờ trống. Bài nộp mới sẽ xuất hiện ở đây.</p>
              </>
            ) : (
              <>
                <Inbox size={38} />
                <h2>Không có bài phù hợp bộ lọc</h2>
                <p>Thử bỏ lọc lớp hoặc trạng thái.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Bài tập</th>
                    <th>Lớp</th>
                    <th>Nộp lúc</th>
                    <th>Trạng thái</th>
                    <th>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((a) => (
                    <tr key={a.id} tabIndex={0} onClick={() => openAttempt(a.id)} onKeyDown={(e) => e.key === "Enter" && openAttempt(a.id)}>
                      <td><strong className={styles.studentName}>{a.studentName ?? "—"}</strong></td>
                      <td><div className={styles.nameCell}><strong>{a.assignmentTitle}</strong></div></td>
                      <td className={styles.classCol}>{a.className ?? "—"}</td>
                      <td className={styles.numeric}>{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</td>
                      <td><StatusPill status={a.status} label={attemptStatusLabels[a.status]} /></td>
                      <td className={styles.numeric}>
                        {a.status === "graded" ? `${a.totalScore ?? "—"}/${a.maxScore ?? "—"}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((a) => (
                <article key={a.id} className={styles.mobileCard} onClick={() => openAttempt(a.id)}>
                  <div className={styles.mobileCardHead}>
                    <StatusPill status={a.status} label={attemptStatusLabels[a.status]} />
                    <span className={styles.numeric}>
                      {a.status === "graded" ? `${a.totalScore ?? "—"}/${a.maxScore ?? "—"}` : ""}
                    </span>
                  </div>
                  <p className={styles.mobileStudent}>{a.studentName ?? "—"}</p>
                  <p className={styles.mobileMeta}>{a.assignmentTitle} · nộp {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {detailLoading && (
        <div className={styles.errorBanner} role="status">
          <strong>Đang tải bài làm…</strong>
        </div>
      )}
      {toast && <Toast message={toast} />}

      {open && (
        <div className={styles.drawerBackdrop} role="dialog" aria-modal="true" aria-label={"Chấm bài của " + (open.attempt.studentName ?? "")}>
          <button className={styles.drawerScrim} onClick={() => setOpen(null)} aria-label="Đóng" />
          <div ref={drawerRef} className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div>
                <h2>{open.attempt.studentName ?? "—"}</h2>
                <p>{open.attempt.assignmentTitle} · nộp {open.attempt.submittedAt ? formatDateTime(open.attempt.submittedAt) : "—"}</p>
              </div>
              <button className={styles.drawerClose} onClick={() => setOpen(null)} aria-label="Đóng"><X size={18} /></button>
            </div>

            <div className={styles.drawerBody}>
              {open.attempt.status === "graded" && (
                <div className={styles.gradedNote}>
                  <Check size={15} /> Bài này đã chấm — chỉ xem lại.
                </div>
              )}
              {questions.map((q, i) => {
                const score = draft.scores[q.questionId] ?? null;
                const feedback = draft.feedbacks[q.questionId] ?? "";
                const readOnly = open.attempt.status !== "submitted";
                const suggestion = aiSuggestions[q.questionId];
                const answerText =
                  q.skill === "writing"
                    ? (q.writtenAnswer ?? "(trống)")
                    : (q.selectedOptions ?? []).join(", ") || "(trống)";
                return (
                  <fieldset key={q.questionId} className={styles.qCard}>
                    <legend className={styles.qLegend}>
                      <span className={styles.qIndex}>Câu {i + 1}</span>
                      <span className={styles.qMax}>{q.subType ?? q.skill ?? ""}</span>
                    </legend>
                    <p className={styles.qContent}>{q.prompt ?? ""}</p>
                    <div className={styles.answerRow}>
                      <div>
                        <small>Bài làm</small>
                        <p>{answerText}</p>
                      </div>
                      <div>
                        <small>Chấm tự động</small>
                        <p>{q.autoScore !== null && q.autoScore !== undefined ? `${q.autoScore} điểm` : "Chờ chấm tay"}</p>
                      </div>
                    </div>
                    {suggestion ? (
                      <div className={styles.gradedNote} role="status">
                        <Sparkles size={15} /> AI gợi ý {suggestion.score} điểm
                        {suggestion.feedback ? ` — ${suggestion.feedback}` : ""} (gợi ý gốc,
                        không chỉnh sửa được)
                      </div>
                    ) : null}
                    {q.skill === "writing" && !readOnly && (
                      <button
                        type="button"
                        className={styles.aiButton}
                        disabled={aiBusy !== null}
                        onClick={() => runAiSuggest(q.questionId)}
                      >
                        <Sparkles size={15} />
                        {aiBusy === q.questionId ? "Đang hỏi AI…" : suggestion ? "Hỏi AI lại" : "AI gợi ý điểm"}
                      </button>
                    )}
                    <div className={styles.scoreRow}>
                      <label className={styles.scoreField}>
                        <span>Điểm (≥ 0)</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={score ?? ""}
                          disabled={readOnly}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            setDraft((d) => ({
                              ...d,
                              scores: {
                                ...d.scores,
                                [q.questionId]: v === null || Number.isNaN(v) || v < 0 ? null : v,
                              },
                            }));
                          }}
                        />
                      </label>
                      <label className={styles.feedbackField}>
                        <span>Nhận xét</span>
                        <textarea
                          rows={2}
                          value={feedback}
                          disabled={readOnly}
                          placeholder="Phản hồi cho học sinh…"
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              feedbacks: { ...d.feedbacks, [q.questionId]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                    {!readOnly && suggestion ? (
                      <button
                        type="button"
                        className={styles.aiButton}
                        onClick={() => applySuggestion(q.questionId)}
                      >
                        <Check size={15} /> Dùng điểm gợi ý ({suggestion.score})
                      </button>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>

            <div className={styles.drawerFoot}>
              <div className={styles.totalBox}>
                <span>Tổng</span>
                <strong>{draftTotal} / {open.attempt.maxScore ?? "—"}</strong>
              </div>
              {open.attempt.status === "submitted" ? (
                <button className={styles.finishButton} onClick={finishGrading} disabled={!allScored || finishing}>
                  <Check size={16} />
                  {allScored ? "Hoàn thành chấm" : "Nhập đủ điểm từng câu"}
                </button>
              ) : (
                <span className={styles.gradedTag}>Đã chấm</span>
              )}
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
