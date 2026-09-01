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

export interface Question {
  id: string;
  skill: Skill;
  subType: string;
  hskLevel: number;
  difficulty: Difficulty;
  content: string;
  options: string[] | null; // MCQ only
  answer: string;
  explanation: string;
  usageCount: number; // times used in assignments — gates delete (F3.6)
  createdAt: string;
}

export const mockQuestions: Question[] = [
  {
    id: "q1",
    skill: "listening",
    subType: "multiple_choice_single",
    hskLevel: 3,
    difficulty: "easy",
    content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
    options: ["一件衣服", "一双鞋", "一个书包", "一本书"],
    answer: "一双鞋",
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
    answer: "Sai",
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
    answer: "两点 (2 giờ)",
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
    options: ["Quần áo này rất đắt", "Quần áo này rất rẻ", "Quần áo này rất đẹp", "Quần áo này rất cũ"],
    answer: "Quần áo này rất rẻ",
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
    options: ["Tăng giá vé xe buýt", "Phát triển tàu điện", "Hạn chế ô tô vào trung tâm", "Xây thêm đường cao tốc"],
    answer: "Phát triển tàu điện + Hạn chế ô tô vào trung tâm",
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
    answer: "热",
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
    answer: "我把作业做完了",
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
    answer: "rẻ / giảm giá / chất lượng / thử",
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
    answer: "Không đề cập",
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
    answer: "VD: 我一边听音乐一边做作业。",
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
    answer: "(chấm tay theo rubric: nội dung 40% · ngữ pháp 30% · từ vựng 20% · trình bày 10%)",
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
    answer: "(chấm tay theo rubric: luận điểm 40% · lập luận 30% · từ vựng 20% · ngữ pháp 10%)",
    explanation: "Cần dùng关联词: 虽然…但是…, 与其…不如…, 一方面…一方面….",
    usageCount: 0,
    createdAt: "2026-08-15",
  },
];
