"use client";

// MOCK(T-QB-*): question bank CRUD is in-memory until /api/v1/teacher/questions exists.
// Delete is gated by usageCount (F3.6: soft delete if already used).

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  Overlay,
  ConfirmModal,
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  difficultyLabels,
  expectedResultOf,
  mockQuestions,
  skillLabels,
  subTypeLabels,
  subTypesBySkill,
  type Difficulty,
  type Question,
  type Skill,
} from "@/lib/teacher/question-data";
import { useDismissMenu } from "@/hooks/use-overlay";
import { formatDate } from "@/lib/formatters";
import styles from "./questions.module.css";

type Draft = {
  skill: Skill;
  subType: string;
  hskLevel: number;
  difficulty: Difficulty;
  content: string;
  options: string;
  // B2: the two are separate fields, not one overloaded "answer".
  correctAnswer: string;
  rubric: string;
  explanation: string;
};

const emptyDraft = (): Draft => ({
  skill: "listening",
  subType: "multiple_choice_single",
  hskLevel: 3,
  difficulty: "easy",
  content: "",
  options: "",
  correctAnswer: "",
  rubric: "",
  explanation: "",
});

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<Skill | "all">("all");
  const [level, setLevel] = useState<number | "all">("all");
  const [subType, setSubType] = useState<string | "all">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [editing, setEditing] = useState<Question | null | undefined>(undefined); // undefined = closed, null = create
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [preview, setPreview] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // C3: outside-click / Escape dismissal for the open row menu.
  const menuRef = useDismissMenu<HTMLTableCellElement>(activeMenu !== null, () => setActiveMenu(null));
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return questions
      .filter((x) => skill === "all" || x.skill === skill)
      .filter((x) => level === "all" || x.hskLevel === level)
      .filter((x) => subType === "all" || x.subType === subType)
      .filter((x) => !q || x.content.toLocaleLowerCase("vi").includes(q));
  }, [questions, query, skill, level, subType]);

  const hasFilters = Boolean(query) || skill !== "all" || level !== "all" || subType !== "all";
  const display = reviewState === "empty" ? [] : filtered;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openCreate() {
    setDraft(emptyDraft());
    setEditing(null);
  }

  function openEdit(question: Question) {
    setActiveMenu(null);
    setDraft({
      skill: question.skill,
      subType: question.subType,
      hskLevel: question.hskLevel,
      difficulty: question.difficulty,
      content: question.content,
      options: question.options ? question.options.join("\n") : "",
      correctAnswer: Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : (question.correctAnswer ?? ""),
      rubric: question.rubric ?? "",
      explanation: question.explanation,
    });
    setEditing(question);
  }

  function submitDraft() {
    // B2: writing needs a rubric and stores correctAnswer = null; the rest need an answer.
    if (!valid) return;
    const isWriting = draft.skill === "writing";
    const correctAnswer = isWriting ? null : draft.correctAnswer.trim();
    const rubric = isWriting ? draft.rubric.trim() : null;
    const options =
      draft.subType === "multiple_choice_single" || draft.subType === "multiple_choice_multi"
        ? draft.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : null;
    // MOCK: POST/PATCH /api/v1/teacher/questions — error codes TODO(error-code) per contract
    if (editing) {
      setQuestions((current) =>
        current.map((x) =>
          x.id === editing.id
            ? { ...x, ...draft, content: draft.content.trim(), correctAnswer, rubric, explanation: draft.explanation.trim(), options }
            : x,
        ),
      );
      flash("Đã lưu câu hỏi");
    } else {
      setQuestions((current) => [
        {
          id: "q-" + Date.now(),
          ...draft,
          content: draft.content.trim(),
          correctAnswer,
          rubric,
          explanation: draft.explanation.trim(),
          options,
          usageCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...current,
      ]);
      flash("Đã tạo câu hỏi mới");
    }
    setEditing(undefined);
  }

  function handleDelete() {
    if (!deleting) return;
    // MOCK: DELETE /api/v1/teacher/questions/:id
    setQuestions((current) => current.filter((x) => x.id !== deleting.id));
    flash("Đã xoá câu hỏi");
    setDeleting(null);
  }

  // B2: writing is valid on prompt + rubric (no answer); non-writing needs correctAnswer.
  const valid =
    draft.content.trim().length >= 5 &&
    (draft.skill === "writing"
      ? draft.rubric.trim().length > 0
      : draft.correctAnswer.trim().length > 0);
  const subTypeOptions = subTypesBySkill[draft.skill];

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Ngân hàng câu hỏi" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>NGÂN HÀNG CÂU HỎI</p>
          <h1>Câu hỏi của tôi</h1>
          <p className={styles.subtitle}>
            {questions.length} câu hỏi · 3 kỹ năng · {Object.keys(subTypeLabels).length} dạng bài
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>
          <Plus size={16} />
          <span>Tạo câu hỏi</span>
        </button>
      </header>

      <section className={styles.filterCard} aria-label="Bộ lọc câu hỏi">
        <label className={styles.searchBox}>
          <span className={styles.fieldLabel}>Tìm kiếm</span>
          <span className={styles.inputControl}>
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nội dung câu hỏi" />
          </span>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Kỹ năng</span>
          <select value={skill} onChange={(e) => { setSkill(e.target.value as Skill | "all"); setSubType("all"); }}>
            <option value="all">Tất cả</option>
            <option value="listening">Nghe</option>
            <option value="reading">Đọc</option>
            <option value="writing">Viết</option>
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Cấp HSK</span>
          <select value={String(level)} onChange={(e) => setLevel(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">Tất cả</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>HSK {l}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Dạng bài</span>
          <select value={subType} onChange={(e) => setSubType(e.target.value)}>
            <option value="all">Tất cả</option>
            {(skill === "all" ? Object.keys(subTypeLabels) : subTypesBySkill[skill]).map((st) => (
              <option key={st} value={st}>{subTypeLabels[st]}</option>
            ))}
          </select>
        </label>
        <div className={styles.filterMeta}>
          {hasFilters && (
            <button
              className={styles.clearButton}
              onClick={() => { setQuery(""); setSkill("all"); setLevel("all"); setSubType("all"); setReviewState("ready"); }}
            >
              Xóa lọc
            </button>
          )}
          <span>{display.length} câu hỏi</span>
        </div>
      </section>

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được ngân hàng câu hỏi.</strong>
            <span>Vui lòng kiểm tra kết nối và thử lại.</span>
          </div>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
        </div>
      )}

      <section className={styles.tableCard} aria-label="Danh sách câu hỏi">
        {reviewState === "loading" ? (
          <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4, 5].map((r) => (
              <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={38} />
            <h2>{hasFilters ? "Không tìm thấy câu hỏi phù hợp" : "Chưa có câu hỏi nào"}</h2>
            <p>{hasFilters ? "Thử thay đổi từ khóa hoặc bộ lọc hiện tại." : "Tạo câu hỏi đầu tiên để dùng cho bài tập."}</p>
            {!hasFilters && (
              <button className={styles.primaryButton} onClick={openCreate}>
                <Plus size={16} />
                <span>Tạo câu hỏi đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nội dung</th>
                    <th>Kỹ năng</th>
                    <th>Dạng bài</th>
                    <th>HSK</th>
                    <th>Độ khó</th>
                    <th>Đã dùng</th>
                    <th><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((q) => (
                    <tr
                      key={q.id}
                      tabIndex={0}
                      onClick={() => setPreview(q)}
                      onKeyDown={(e) => e.key === "Enter" && setPreview(q)}
                    >
                      <td><div className={styles.contentCell}><strong>{q.content}</strong><small>{expectedResultOf(q).label}: {expectedResultOf(q).value}</small></div></td>
                      <td><StatusPill status={q.skill === "writing" ? "info" : q.skill === "listening" ? "warning" : "neutral"} label={skillLabels[q.skill]} /></td>
                      <td className={styles.subTypeCol}>{subTypeLabels[q.subType]}</td>
                      <td><span className={styles.levelBadge}>HSK {q.hskLevel}</span></td>
                      <td>{difficultyLabels[q.difficulty]}</td>
                      <td className={styles.numeric}>{q.usageCount} lần</td>
                      <td className={styles.actionCell} onClick={(e) => e.stopPropagation()} ref={activeMenu === q.id ? menuRef : undefined}>
                        <button
                          className={styles.moreButton}
                          onClick={() => setActiveMenu(activeMenu === q.id ? null : q.id)}
                          aria-label={"Thao tác cho câu hỏi " + q.id}
                          aria-haspopup="menu"
                          aria-expanded={activeMenu === q.id}
                          aria-controls={"qmenu-" + q.id}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                        {activeMenu === q.id && (
                          <div className={styles.actionMenu} id={"qmenu-" + q.id} role="menu">
                            <button onClick={() => { setActiveMenu(null); setPreview(q); }}><Eye size={14} />Xem trước</button>
                            <button onClick={() => openEdit(q)}><Pencil size={14} />Sửa</button>
                            <button
                              className={styles.dangerAction}
                              disabled={q.usageCount > 0}
                              title={q.usageCount > 0 ? "Câu hỏi đã nằm trong bài tập — chỉ ẩn (soft delete), không xoá" : undefined}
                              onClick={() => { setActiveMenu(null); setDeleting(q); }}
                            >
                              <Trash2 size={14} />Xoá
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((q) => (
                <article key={q.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHead}>
                    <StatusPill status={q.skill === "writing" ? "info" : q.skill === "listening" ? "warning" : "neutral"} label={skillLabels[q.skill]} />
                    <span className={styles.levelBadge}>HSK {q.hskLevel}</span>
                  </div>
                  <p className={styles.mobileContent}>{q.content}</p>
                  <p className={styles.mobileMeta}>{subTypeLabels[q.subType]} · {difficultyLabels[q.difficulty]} · dùng {q.usageCount} lần</p>
                  <div className={styles.mobileCardActions}>
                    <button onClick={() => setPreview(q)}>Xem trước</button>
                    <button onClick={() => openEdit(q)}>Sửa</button>
                    <button disabled={q.usageCount > 0} onClick={() => setDeleting(q)}>Xoá</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}

      {editing !== undefined && (
        <Overlay
          label={editing ? "Sửa câu hỏi" : "Tạo câu hỏi"}
          onClose={() => setEditing(undefined)}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modalWide}
        >
            <h2>{editing ? "Sửa câu hỏi" : "Tạo câu hỏi"}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitDraft(); }}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Kỹ năng *</span>
                  <select value={draft.skill} onChange={(e) => {
                    const nextSkill = e.target.value as Skill;
                    setDraft({ ...draft, skill: nextSkill, subType: subTypesBySkill[nextSkill][0] });
                  }}>
                    <option value="listening">Nghe</option>
                    <option value="reading">Đọc</option>
                    <option value="writing">Viết</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Dạng bài *</span>
                  <select value={draft.subType} onChange={(e) => setDraft({ ...draft, subType: e.target.value })}>
                    {subTypeOptions.map((st) => <option key={st} value={st}>{subTypeLabels[st]}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Cấp HSK *</span>
                  <select value={draft.hskLevel} onChange={(e) => setDraft({ ...draft, hskLevel: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => <option key={l} value={l}>HSK {l}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Độ khó *</span>
                  <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>Nội dung câu hỏi *</span>
                <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={3} required minLength={5} placeholder="Nội dung câu hỏi / đoạn văn / yêu cầu…" />
              </label>
              {(draft.subType === "multiple_choice_single" || draft.subType === "multiple_choice_multi") && (
                <label className={styles.field}>
                  <span>Phương án (mỗi dòng 1 phương án)</span>
                  <textarea value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} rows={4} placeholder={"一件衣服\n一双鞋\n一个书包"} />
                </label>
              )}
              {draft.skill === "writing" ? (
                <label className={styles.field}>
                  <span>Rubric chấm điểm *</span>
                  <textarea
                    value={draft.rubric}
                    onChange={(e) => setDraft({ ...draft, rubric: e.target.value })}
                    rows={3}
                    required
                    placeholder="VD: Nội dung đủ ý 40% · ngữ pháp 30% · từ vựng 20% · trình bày 10%"
                  />
                  <small className={styles.fieldHint}>
                    Bài Viết chấm tay kèm gợi ý AI — không lưu đáp án đúng (ENTITY_QUESTION: correctAnswer = null).
                  </small>
                </label>
              ) : (
                <label className={styles.field}>
                  <span>Đáp án *</span>
                  <input value={draft.correctAnswer} onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })} required placeholder="Đáp án đúng" />
                </label>
              )}
              <label className={styles.field}>
                <span>Giải thích</span>
                <textarea value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} rows={2} placeholder="Giải thích cho học sinh sau khi nộp bài" />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setEditing(undefined)}>Hủy</button>
                <button type="submit" className={styles.primaryButton} disabled={!valid}>
                  {editing ? "Lưu thay đổi" : "Tạo câu hỏi"}
                </button>
              </div>
            </form>
          </Overlay>
      )}

      {preview && (
        <Overlay
          label={"Xem trước câu hỏi"}
          onClose={() => setPreview(null)}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modal}
        >
            <div className={styles.previewHead}>
              <div className={styles.previewBadges}>
                <StatusPill status={preview.skill === "writing" ? "info" : preview.skill === "listening" ? "warning" : "neutral"} label={skillLabels[preview.skill]} />
                <span className={styles.levelBadge}>HSK {preview.hskLevel}</span>
                <span>{subTypeLabels[preview.subType]}</span>
                <span>{difficultyLabels[preview.difficulty]}</span>
              </div>
              <button className={styles.modalClose} onClick={() => setPreview(null)} aria-label="Đóng">Đóng</button>
            </div>
            <p className={styles.previewContent}>{preview.content}</p>
            {preview.options && (
              <div className={styles.previewOptions}>
                {preview.options.map((o) => <span key={o} className={o === preview.correctAnswer ? styles.previewOptionCorrect : styles.previewOption}>{o}</span>)}
              </div>
            )}
            <dl className={styles.previewMeta}>
              <div><dt>{expectedResultOf(preview).label}</dt><dd>{expectedResultOf(preview).value}</dd></div>
              <div><dt>Giải thích</dt><dd>{preview.explanation || "—"}</dd></div>
              <div><dt>Đã dùng trong</dt><dd>{preview.usageCount} bài tập · tạo {formatDate(preview.createdAt)}</dd></div>
            </dl>
          </Overlay>
      )}

      {deleting && (
        <ConfirmModal
          title="Xoá câu hỏi"
          description={"Câu hỏi «" + deleting.content.slice(0, 60) + (deleting.content.length > 60 ? "…" : "") + "» sẽ bị xoá khỏi ngân hàng. Hành động này không thể hoàn tác."}
          confirmLabel="Xoá câu hỏi"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </TeacherShell>
  );
}
