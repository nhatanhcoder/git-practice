/**
 * MOCK(T-QB-*): question bank data in-memory until /api/v1/teacher/questions exists.
 * Sub-types follow FEATURES_TEACHER.md's table (8+ sub-types).
 */

export type Skill = "listening" | "reading" | "writing";
export type Difficulty = "easy" | "medium" | "hard";

export const subTypesBySkill: Record<Skill, string[]> = {
  listening: ["multiple_choice_single", "true_false_not_given", "short_answer"],
  reading: [
    "multiple_choice_single",
    "multiple_choice_multi",
    "true_false_not_given",
    "fill_in_blank",
    "sentence_ordering",
    "matching",
  ],
  writing: ["sentence_construction", "essay"],
};

export const subTypeLabels: Record<string, string> = {
  multiple_choice_single: "Trắc nghiệm 1 đáp án",
  multiple_choice_multi: "Trắc nghiệm nhiều đáp án",
  true_false_not_given: "Đúng / Sai / Không đề cập",
  short_answer: "Trả lời ngắn",
  fill_in_blank: "Điền chỗ trống",
  sentence_ordering: "Sắp xếp câu",
  matching: "Nối cặp",
  sentence_construction: "Viết câu",
  essay: "Viết đoạn văn",
};

export const skillLabels: Record<Skill, string> = {
  listening: "Nghe",
  reading: "Đọc",
  writing: "Viết",
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

export interface QuestionOption {
  id: string;   // 'A' | 'B' | 'C' | 'D' — what correctAnswer references for MCQ
  text: string;
}

export interface Question {
  id: string;
  skill: Skill;
  subType: string;
  hskLevel: number;
  difficulty: Difficulty;
  /** ENTITY_QUESTION `content`: the passage / prompt shown to the student. */
  content: string;
  /** ENTITY_QUESTION `options`: MCQ only, each with a stable id ('A','B',…). */
  options: QuestionOption[] | null;
  /**
   * ENTITY_QUESTION `correctAnswer`: string | string[] | null.
   * **null for Writing** — writing is graded manually plus an AI suggestion, so there is no
   * correct answer to store. A rubric is NOT an answer; it lives in `rubric` below.
   */
  correctAnswer: string | string[] | null;
  /**
   * ENTITY_QUESTION `content.rubric` — Writing only, the grading rubric for teacher/AI.
   * null for listening/reading.
   */
  rubric: string | null;
  explanation: string;
  usageCount: number; // times used in assignments — gates delete (F3.6)
  createdAt: string;
}

/** Writing has no correct answer (ENTITY_QUESTION); everything else must have one. */
export function requiresCorrectAnswer(skill: Skill): boolean {
  return skill !== "writing";
}

/**
 * What to show in a "the expected result" slot: the answer for listening/reading, the rubric
 * for writing. Keeps render code short WITHOUT calling a rubric an answer.
 */
export function expectedResultOf(q: Question): { label: string; value: string } {
  if (q.skill === "writing") return { label: "Rubric chấm điểm", value: q.rubric ?? "—" };
  const a = q.correctAnswer;
  if (a === null) return { label: "Đáp án", value: "—" };
  const ids = Array.isArray(a) ? a : [a];
  // For MCQ, correctAnswer holds option ids ('A','B'). Showing the raw id tells a teacher
  // nothing, so resolve it back to the option text; non-MCQ answers are already free text.
  const shown = ids.map((id) => {
    const opt = q.options?.find((o) => o.id === id);
    return opt ? opt.id + ". " + opt.text : id;
  });
  return { label: "Đáp án", value: shown.join(" · ") };
}

export const mockQuestions: Question[] = [
  {
    id: "q1",
    skill: "listening",
    subType: "multiple_choice_single",
    hskLevel: 3,
    difficulty: "easy",
    content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
    options: [{ id: "A", text: "一件衣服" }, { id: "B", text: "一双鞋" }, { id: "C", text: "一个书包" }, { id: "D", text: "一本书" }],
    correctAnswer: "B",
    rubric: null,
    explanation: "Trong hội thoại, người nữ nói 「我想买这双鞋」.",
    usageCount: 3,
    createdAt: "2026-07-02",
  },
  {
    id: "q2",
    skill: "listening",
    subType: "true_false_not_given",
    hskLevel: 3,
    difficulty: "medium",
    content: "Nghe đoạn văn: chủ cửa hàng đồng ý giảm giá 20%.",
    options: null,
    correctAnswer: "Sai",
    rubric: null,
    explanation: "Chỉ giảm 10%, không phải 20%.",
    usageCount: 1,
    createdAt: "2026-07-05",
  },
  {
    id: "q3",
    skill: "listening",
    subType: "short_answer",
    hskLevel: 4,
    difficulty: "medium",
    content: "Nghe và trả lời: buổi họp bắt đầu lúc mấy giờ?",
    options: null,
    correctAnswer: "两点 (2 giờ)",
    rubric: null,
    explanation: "「会议两点开始」.",
    usageCount: 0,
    createdAt: "2026-08-01",
  },
  {
    id: "q4",
    skill: "reading",
    subType: "multiple_choice_single",
    hskLevel: 3,
    difficulty: "easy",
    content: "「这件衣服很便宜」— câu này nghĩa là gì?",
    options: [{ id: "A", text: "Quần áo này rất đắt" }, { id: "B", text: "Quần áo này rất rẻ" }, { id: "C", text: "Quần áo này rất đẹp" }, { id: "D", text: "Quần áo này rất cũ" }],
    correctAnswer: "B",
    rubric: null,
    explanation: "便宜 = rẻ.",
    usageCount: 2,
    createdAt: "2026-07-10",
  },
  {
    id: "q5",
    skill: "reading",
    subType: "multiple_choice_multi",
    hskLevel: 4,
    difficulty: "hard",
    content: "Đọc đoạn văn về giao thông đô thị. Chọn TẤT CẢ phương án đúng: tác giả đề xuất giải pháp nào?",
    options: [{ id: "A", text: "Tăng giá vé xe buýt" }, { id: "B", text: "Phát triển tàu điện" }, { id: "C", text: "Hạn chế ô tô vào trung tâm" }, { id: "D", text: "Xây thêm đường cao tốc" }],
    correctAnswer: ["B", "C"],
    rubric: null,
    explanation: "Đoạn 2 và 3 nêu 2 giải pháp này.",
    usageCount: 1,
    createdAt: "2026-08-05",
  },
  {
    id: "q6",
    skill: "reading",
    subType: "fill_in_blank",
    hskLevel: 2,
    difficulty: "easy",
    content: "Điền vào chỗ trống: 今天比昨天_____。(nóng hơn)",
    options: null,
    correctAnswer: "热",
    rubric: null,
    explanation: "So sánh dùng 比 + tính từ, không dùng 很.",
    usageCount: 4,
    createdAt: "2026-06-20",
  },
  {
    id: "q7",
    skill: "reading",
    subType: "sentence_ordering",
    hskLevel: 3,
    difficulty: "medium",
    content: "Sắp xếp thành câu đúng: 把 / 作业 / 我 / 做完了",
    options: null,
    correctAnswer: "我把作业做完了",
    rubric: null,
    explanation: "Trật tự câu 把: S + 把 + O + V + bổ ngữ.",
    usageCount: 2,
    createdAt: "2026-07-18",
  },
  {
    id: "q8",
    skill: "reading",
    subType: "matching",
    hskLevel: 3,
    difficulty: "easy",
    content: "Nối từ với nghĩa: 便宜 / 打折 / 质量 / 试",
    options: null,
    correctAnswer: "rẻ / giảm giá / chất lượng / thử",
    rubric: null,
    explanation: "Từ vựng bài 8 HSK 3.",
    usageCount: 1,
    createdAt: "2026-07-22",
  },
  {
    id: "q9",
    skill: "reading",
    subType: "true_false_not_given",
    hskLevel: 5,
    difficulty: "hard",
    content: "Đọc đoạn văn về bảo tồn văn hoá. Xác định: «Năm 2010, cả nước có 40 di sản được quốc gia công nhận.»",
    options: null,
    correctAnswer: "Không đề cập",
    rubric: null,
    explanation: "Đoạn văn không nêu con số năm 2010.",
    usageCount: 0,
    createdAt: "2026-08-12",
  },
  {
    id: "q10",
    skill: "writing",
    subType: "sentence_construction",
    hskLevel: 3,
    difficulty: "medium",
    content: "Dùng 「一边…一边…」 viết 1 câu về việc bạn làm lúc nghe nhạc.",
    options: null,
    correctAnswer: null,
    rubric: "Đúng cấu trúc 一边…一边… 40% · hai hành động đồng thời, hợp logic 30% · từ vựng HSK 3 20% · chữ viết đúng nét 10%. Câu mẫu: 我一边听音乐一边做作业。",
    explanation: "一边…一边… = vừa… vừa…, hai hành động đồng thời.",
    usageCount: 2,
    createdAt: "2026-07-25",
  },
  {
    id: "q11",
    skill: "writing",
    subType: "essay",
    hskLevel: 4,
    difficulty: "hard",
    content: "Viết đoạn văn 120–150 chữ: mô tả một ngày cuối tuần tiêu biểu của bạn.",
    options: null,
    correctAnswer: null,
    rubric: "Nội dung đủ ý 40% · ngữ pháp 已经/又/再 30% · từ vựng HSK 4 20% · trình bày 10%.",
    explanation: "Rubric chấm: đủ ý, đúng ngữ pháp 已经/又/再, từ vựng HSK 4.",
    usageCount: 1,
    createdAt: "2026-08-08",
  },
  {
    id: "q12",
    skill: "writing",
    subType: "essay",
    hskLevel: 5,
    difficulty: "hard",
    content: "Viết đoạn văn 200 chữ: «Quan điểm của bạn về việc học online so với học trực tiếp».",
    options: null,
    correctAnswer: null,
    rubric: "Luận điểm rõ 40% · lập luận có dẫn chứng 30% · từ vựng 20% · ngữ pháp, dùng 关联词 虽然…但是…, 与其…不如… 10%.",
    explanation: "Cần dùng关联词: 虽然…但是…, 与其…不如…, 一方面…一方面….",
    usageCount: 0,
    createdAt: "2026-08-15",
  },
];

/**
 * The wire shape from `docs/entities/mongodb/ENTITY_QUESTION.md`.
 *
 * The editor above is a flat ViewModel because that is what a form is comfortable with. The
 * entity is nested. Keeping both and mapping between them means the form stays simple while
 * nothing flat is ever posted to the API — the model on its own is NOT a valid payload.
 */
export interface QuestionDto {
  skill: Skill;
  subType: string;
  hskLevel: number;
  difficulty: Difficulty;
  content: {
    audioUrl?: string;
    transcript?: string;
    passage?: string;
    prompt?: string;
    rubric?: string;
  };
  options?: QuestionOption[];
  correctAnswer: string | string[] | null;
  explanation: string | null;
}

/**
 * ViewModel → DTO. The flat `content` string means different things per skill, which is exactly
 * what the entity's nested `content` object encodes:
 *   listening → `transcript`   ·   reading → `passage`   ·   writing → `prompt` (+ `rubric`)
 *
 * ⛔ `content.audioUrl` is never set: audio upload is not implemented, and the storage provider
 * is still undecided (`CR-3`). Do not invent a URL here.
 */
export function toQuestionDto(q: Question): QuestionDto {
  const content: QuestionDto["content"] = {};
  if (q.skill === "listening") content.transcript = q.content;
  else if (q.skill === "reading") content.passage = q.content;
  else content.prompt = q.content;
  if (q.skill === "writing" && q.rubric) content.rubric = q.rubric;

  return {
    skill: q.skill,
    subType: q.subType,
    hskLevel: q.hskLevel,
    difficulty: q.difficulty,
    content,
    ...(q.options ? { options: q.options } : {}),
    // Writing is always null (graded manually + AI suggestion).
    correctAnswer: q.skill === "writing" ? null : q.correctAnswer,
    explanation: q.explanation || null,
  };
}
