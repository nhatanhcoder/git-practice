/**
 * MOCK(T-GRADE-*): grading queue + attempt details in-memory until
 * /api/v1/teacher/attempts exists. Attempt states per FLOW_GRADING.md:
 * in_progress → submitted → graded. "graded" is not in the design system's
 * enum→colour map, so it renders via the neutral fallback in status.ts —
 * that mapping decision stays with status.ts, not this screen.
 */

import type { Skill } from "./question-data";

export type AttemptStatus = "submitted" | "graded";

export interface AttemptQuestion {
  id: string;
  skill: Skill;
  content: string;
  studentAnswer: string;
  referenceAnswer: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
  aiSuggestion: { score: number; reasoning: string } | null;
}

export interface Attempt {
  id: string;
  studentNickname: string;
  classId: string;
  className: string;
  assignmentTitle: string;
  hskLevel: number;
  submittedAt: string;
  status: AttemptStatus;
  questions: AttemptQuestion[];
}

export const attemptStatusLabels: Record<AttemptStatus, string> = {
  submitted: "Chờ chấm",
  graded: "Đã chấm",
};

export const mockAttempts: Attempt[] = [
  {
    id: "at1",
    studentNickname: "Nguyễn Minh Anh",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    assignmentTitle: "Bài tập 4 · Mua sắm — từ vựng",
    hskLevel: 3,
    submittedAt: "2026-08-29 20:15",
    status: "submitted",
    questions: [
      {
        id: "at1-q1",
        skill: "listening",
        content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
        studentAnswer: "一双鞋",
        referenceAnswer: "一双鞋",
        maxScore: 10,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
      {
        id: "at1-q2",
        skill: "writing",
        content: "Dùng 「一边…一边…」 viết 1 câu về việc bạn làm lúc nghe nhạc.",
        studentAnswer: "我一边听音乐一边写作业。"
        ,
        referenceAnswer: "VD: 我一边听音乐一边做作业。",
        maxScore: 10,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
    ],
  },
  {
    id: "at2",
    studentNickname: "Bùi Khánh Linh",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    assignmentTitle: "Bài tập 4 · Mua sắm — từ vựng",
    hskLevel: 3,
    submittedAt: "2026-08-30 08:42",
    status: "submitted",
    questions: [
      {
        id: "at2-q1",
        skill: "listening",
        content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
        studentAnswer: "一个书包",
        referenceAnswer: "一双鞋",
        maxScore: 10,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
      {
        id: "at2-q2",
        skill: "writing",
        content: "Dùng 「一边…一边…」 viết 1 câu về việc bạn làm lúc nghe nhạc.",
        studentAnswer: "我一边听音乐一边跑步。",
        referenceAnswer: "VD: 我一边听音乐一边做作业。",
        maxScore: 10,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
    ],
  },
  {
    id: "at3",
    studentNickname: "Hoàng Văn Nam",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    assignmentTitle: "Bài tập 4 · Mua sắm — từ vựng",
    hskLevel: 3,
    submittedAt: "2026-08-29 21:03",
    status: "submitted",
    questions: [
      {
        id: "at3-q1",
        skill: "listening",
        content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
        studentAnswer: "一双鞋",
        referenceAnswer: "一双鞋",
        maxScore: 10,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
      {
        id: "at3-q2",
        skill: "reading",
        content: "「这件衣服很便宜」— câu này nghĩa là gì?",
        studentAnswer: "Quần áo này rất rẻ",
        referenceAnswer: "Quần áo này rất rẻ",
        maxScore: 5,
        score: null,
        feedback: null,
        aiSuggestion: null,
      },
    ],
  },
  {
    id: "at4",
    studentNickname: "Đặng Thu Thảo",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    assignmentTitle: "Bài tập 4 · Mua sắm — từ vựng",
    hskLevel: 3,
    submittedAt: "2026-08-30 09:10",
    status: "graded",
    questions: [
      {
        id: "at4-q1",
        skill: "listening",
        content: "Nghe đoạn hội thoại: người nữ muốn mua cái gì?",
        studentAnswer: "一双鞋",
        referenceAnswer: "一双鞋",
        maxScore: 10,
        score: 10,
        feedback: "Chính xác!",
        aiSuggestion: null,
      },
      {
        id: "at4-q2",
        skill: "writing",
        content: "Dùng 「一边…一边…」 viết 1 câu về việc bạn làm lúc nghe nhạc.",
        studentAnswer: "我一边听音乐一边看书。",
        referenceAnswer: "VD: 我一边听音乐一边做作业。",
        maxScore: 10,
        score: 9,
        feedback: "Ngữ pháp đúng, dùng từ phong phú. Chú ý 笔画 của 书.",
        aiSuggestion: { score: 9, reasoning: "Câu đúng cấu trúc 一边…一边…, từ vựng phù hợp HSK 3. Trừ 1 điểm nhỏ vì 书 viết thiếu nét." },
      },
    ],
  },
  {
    id: "at5",
    studentNickname: "Ngô Thanh Tâm",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    assignmentTitle: "Đề thi thử HSK 5 — Nghe hiểu",
    hskLevel: 5,
    submittedAt: "2026-09-01 10:05",
    status: "graded",
    questions: [
      {
        id: "at5-q1",
        skill: "listening",
        content: "Nghe và trả lời: buổi họp bắt đầu lúc mấy giờ?",
        studentAnswer: "两点",
        referenceAnswer: "两点 (2 giờ)",
        maxScore: 10,
        score: 10,
        feedback: null,
        aiSuggestion: null,
      },
    ],
  },
  {
    id: "at6",
    studentNickname: "Lý Trường An",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    assignmentTitle: "Đề thi thử HSK 5 — Nghe hiểu",
    hskLevel: 5,
    submittedAt: "2026-09-01 10:11",
    status: "graded",
    questions: [
      {
        id: "at6-q1",
        skill: "listening",
        content: "Nghe và trả lời: buổi họp bắt đầu lúc mấy giờ?",
        studentAnswer: "三点",
        referenceAnswer: "两点 (2 giờ)",
        maxScore: 10,
        score: 4,
        feedback: "Nghe nhầm 两 (2) thành 三 (3) — luyện phân biệt thanh điệu.",
        aiSuggestion: null,
      },
    ],
  },
];

/** MOCK: the AI suggestion the Gemini endpoint would return (AI_FEATURES.md). */
export function mockAiSuggest(question: AttemptQuestion): { score: number; reasoning: string } {
  const good = question.studentAnswer.trim() === question.referenceAnswer.trim();
  return {
    score: good ? question.maxScore : Math.max(0, Math.round(question.maxScore * 0.5)),
    reasoning: good
      ? "Câu trả lời khớp đáp án tham chiếu, cấu trúc đúng. Có thể cho điểm tối đa."
      : "Câu trả lời lệch đáp án tham chiếu nhưng cấu trúc vẫn đúng — gợi ý chấm nửa điểm, giáo viên quyết định.",
  };
}
