"use client";

// MOCK(T-GRADE-*): grading queue + per-question scoring in-memory until
// /api/v1/teacher/attempts exists. AI suggest is the Gemini mock from
// grading-data.ts — a suggestion the teacher may override (FLOW_GRADING.md).

import { useMemo, useState } from "react";
import {
  Check,
  CircleCheck,
  Inbox,
  Sparkles,
  X,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  attemptStatusLabels,
  mockAiSuggest,
  mockAttempts,
  type Attempt,
} from "@/lib/teacher/grading-data";
import { skillLabels } from "@/lib/teacher/question-data";
import { useOverlay } from "@/hooks/use-overlay";
import { clampScore, finalizeGradedQuestion, isValidScore } from "@/lib/teacher/teacher-rules.js";
import { formatDateTime } from "@/lib/formatters";
import styles from "./grading.module.css";

interface GradingDraft {
  // What the teacher will actually save.
  scores: Record<string, number | null>;
  feedbacks: Record<string, string>;
  // A2: the AI's ORIGINAL suggestion, kept verbatim and never written by the teacher's edits.
  // Overwriting this with the edited score destroys the audit trail — the whole point of
  // storing aiSuggestion alongside the final score is to compare the two later.
  aiOriginal: Record<string, { score: number; reasoning: string } | null>;
}


export default function TeacherGradingPage() {
  const [attempts, setAttempts] = useState<Attempt[]>(mockAttempts);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "graded">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [open, setOpen] = useState<Attempt | null>(null);
  const [draft, setDraft] = useState<GradingDraft>({ scores: {}, feedbacks: {}, aiOriginal: {} });
  const [toast, setToast] = useState("");
  // C3: Escape / focus trap / focus restore for the grading drawer.
  const drawerRef = useOverlay<HTMLDivElement>(() => setOpen(null), open !== null);

  const classOptions = useMemo(() => {
    const ids = new Map<string, string>();
    attempts.forEach((a) => ids.set(a.classId, a.className));
    return Array.from(ids.entries());
  }, [attempts]);

  const filtered = useMemo(
    () =>
      attempts
        .filter((a) => classFilter === "all" || a.classId === classFilter)
        .filter((a) => statusFilter === "all" || a.status === statusFilter),
    [attempts, classFilter, statusFilter],
  );

  const pendingCount = attempts.filter((a) => a.status === "submitted").length;
  const display = reviewState === "empty" ? [] : filtered;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openAttempt(a: Attempt) {
    setOpen(a);
    const scores: Record<string, number | null> = {};
    const feedbacks: Record<string, string> = {};
    const aiOriginal: Record<string, { score: number; reasoning: string } | null> = {};
    a.questions.forEach((q) => {
      scores[q.id] = q.score;
      feedbacks[q.id] = q.feedback ?? "";
      // Carry any previously stored suggestion through unchanged.
      aiOriginal[q.id] = q.aiSuggestion;
    });
    setDraft({ scores, feedbacks, aiOriginal });
  }

  function runAiSuggest(questionId: string) {
    if (!open) return;
    const question = open.questions.find((q) => q.id === questionId);
    if (!question || question.skill !== "writing") return;
    // MOCK: POST /api/v1/teacher/attempts/:id/ai-suggest — Gemini suggestion
    const suggestion = mockAiSuggest(question);
    setDraft((d) => ({
      // Prefill the teacher's fields so they can accept or override…
      scores: { ...d.scores, [questionId]: suggestion.score },
      feedbacks: { ...d.feedbacks, [questionId]: suggestion.reasoning },
      // …while the original is stored separately and never touched again.
      aiOriginal: { ...d.aiOriginal, [questionId]: { score: suggestion.score, reasoning: suggestion.reasoning } },
    }));
    flash("Đã nhận gợi ý AI — bạn có thể ghi đè trước khi chốt");
  }

  function finishGrading() {
    if (!open) return;
    // A2: re-check the range here, not just via the disabled button — a disabled attribute is
    // a UI affordance, not a guard.
    const allScored = open.questions.every((q) => isValidScore(draft.scores[q.id], q.maxScore));
    if (!allScored) return;
    // MOCK: PATCH /api/v1/teacher/attempts/:id/grade — status -> graded
    setAttempts((current) =>
      current.map((a) =>
        a.id === open.id
          ? {
              ...a,
              status: "graded",
              questions: a.questions.map((q) => ({
                ...q,
                ...finalizeGradedQuestion({
                  draftScore: draft.scores[q.id],
                  draftFeedback: draft.feedbacks[q.id],
                  aiOriginal: draft.aiOriginal[q.id] ?? null,
                  storedScore: q.score,
                  maxScore: q.maxScore,
                }),
              })),
            }
          : a,
      ),
    );
    flash("Đã hoàn thành chấm — học sinh sẽ nhận thông báo");
    setOpen(null);
  }

  const allScored = open
    ? open.questions.every((q) => isValidScore(draft.scores[q.id], q.maxScore))
    : false;
  const totalScore = open
    ? open.questions.reduce((s, q) => s + (isValidScore(draft.scores[q.id], q.maxScore) ? draft.scores[q.id]! : 0), 0)
    : 0;
  const maxTotal = open ? open.questions.reduce((s, q) => s + q.maxScore, 0) : 0;

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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Tất cả</option>
            <option value="submitted">Chờ chấm</option>
            <option value="graded">Đã chấm</option>
          </select>
        </label>
        <div className={styles.filterMeta}>
          <span>{display.length} bài nộp</span>
        </div>
      </section>

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <strong>Không tải được hàng chờ chấm bài.</strong>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
        </div>
      )}

      <section className={styles.tableCard} aria-label="Hàng chờ chấm bài">
        {reviewState === "loading" ? (
          <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4].map((r) => <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>)}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            {reviewState === "empty" || pendingCount === 0 ? (
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
                  {display.map((a) => {
                    const graded = a.status === "graded";
                    const score = a.questions.reduce((s, q) => s + (q.score ?? 0), 0);
                    const max = a.questions.reduce((s, q) => s + q.maxScore, 0);
                    return (
                      <tr key={a.id} tabIndex={0} onClick={() => openAttempt(a)} onKeyDown={(e) => e.key === "Enter" && openAttempt(a)}>
                        <td><strong className={styles.studentName}>{a.studentNickname}</strong></td>
                        <td><div className={styles.nameCell}><strong>{a.assignmentTitle}</strong><small>HSK {a.hskLevel} · {a.questions.length} câu</small></div></td>
                        <td className={styles.classCol}>{a.className}</td>
                        <td className={styles.numeric}>{formatDateTime(a.submittedAt)}</td>
                        <td><StatusPill status={a.status} label={attemptStatusLabels[a.status]} /></td>
                        <td className={styles.numeric}>{graded ? score + "/" + max : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((a) => (
                <article key={a.id} className={styles.mobileCard} onClick={() => openAttempt(a)}>
                  <div className={styles.mobileCardHead}>
                    <StatusPill status={a.status} label={attemptStatusLabels[a.status]} />
                    <span className={styles.numeric}>{a.status === "graded" ? "x/10" : ""}</span>
                  </div>
                  <p className={styles.mobileStudent}>{a.studentNickname}</p>
                  <p className={styles.mobileMeta}>{a.assignmentTitle} · nộp {formatDateTime(a.submittedAt)}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}

      {open && (
        <div className={styles.drawerBackdrop} role="dialog" aria-modal="true" aria-label={"Chấm bài của " + open.studentNickname}>
          {/* The scrim is already a real button, so backdrop-close is covered; the ref below
              adds Escape, focus trap and focus restore (C3). */}
          <button className={styles.drawerScrim} onClick={() => setOpen(null)} aria-label="Đóng" />
          <div ref={drawerRef} className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div>
                <h2>{open.studentNickname}</h2>
                <p>{open.assignmentTitle} · {open.className} · nộp {formatDateTime(open.submittedAt)}</p>
              </div>
              <button className={styles.drawerClose} onClick={() => setOpen(null)} aria-label="Đóng"><X size={18} /></button>
            </div>

            <div className={styles.drawerBody}>
              {open.status === "graded" && (
                <div className={styles.gradedNote}>
                  <Check size={15} /> Bài này đã chấm — chỉ xem lại (chấm lại lần 2 là T-GRADE-6, chưa hợp đồng).
                </div>
              )}
              {open.questions.map((q, i) => {
                const score = draft.scores[q.id];
                const feedback = draft.feedbacks[q.id] ?? "";
                const readOnly = open.status === "graded";
                return (
                  <fieldset key={q.id} className={styles.qCard}>
                    <legend className={styles.qLegend}>
                      <span className={styles.qIndex}>Câu {i + 1}</span>
                      <StatusPill status={q.skill === "writing" ? "info" : q.skill === "listening" ? "warning" : "neutral"} label={skillLabels[q.skill]} />
                      <span className={styles.qMax}>tối đa {q.maxScore} điểm</span>
                    </legend>
                    <p className={styles.qContent}>{q.content}</p>
                    <div className={styles.answerRow}>
                      <div>
                        <small>Bài làm</small>
                        <p>{q.studentAnswer}</p>
                      </div>
                      <div>
                        <small>Đáp án tham chiếu</small>
                        <p>{q.referenceAnswer}</p>
                      </div>
                    </div>
                    {q.skill === "writing" && !readOnly && (
                      <button type="button" className={styles.aiButton} onClick={() => runAiSuggest(q.id)}>
                        <Sparkles size={15} />
                        {draft.aiOriginal[q.id] ? "Gợi ý AI đã áp dụng — ghi đè tự do" : "AI gợi ý điểm"}
                      </button>
                    )}
                    <div className={styles.scoreRow}>
                      <label className={styles.scoreField}>
                        <span>Điểm (0–{q.maxScore})</span>
                        <input
                          type="number" min={0} max={q.maxScore}
                          value={score ?? ""}
                          disabled={readOnly}
                          onChange={(e) => setDraft((d) => ({ ...d, scores: { ...d.scores, [q.id]: clampScore(e.target.value, q.maxScore) } }))}
                        />
                      </label>
                      <label className={styles.feedbackField}>
                        <span>Nhận xét</span>
                        <textarea
                          rows={2}
                          value={feedback}
                          disabled={readOnly}
                          placeholder="Phản hồi cho học sinh…"
                          onChange={(e) => setDraft((d) => ({ ...d, feedbacks: { ...d.feedbacks, [q.id]: e.target.value } }))}
                        />
                      </label>
                    </div>
                  </fieldset>
                );
              })}
            </div>

            <div className={styles.drawerFoot}>
              <div className={styles.totalBox}>
                <span>Tổng</span>
                <strong>{totalScore} / {maxTotal}</strong>
              </div>
              {open.status === "submitted" ? (
                <button className={styles.finishButton} onClick={finishGrading} disabled={!allScored}>
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
