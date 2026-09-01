/**
 * MOCK(T-ASGN-*): assignments + submission stats in-memory until
 * /api/v1/teacher/assignments exists.
 */

export type AssignmentType = "assignment" | "mock_test";

export const assignmentTypeLabels: Record<AssignmentType, string> = {
  assignment: "Bài tập",
  mock_test: "Đề thi thử",
};

export interface Assignment {
  id: string;
  title: string;
  type: AssignmentType;
  classId: string;
  className: string;
  hskLevel: number;
  dueDate: string;
  timeLimitMinutes: number | null; // mock test only
  questionIds: string[];
  submittedCount: number;
  totalStudents: number;
  pendingGradingCount: number;
  createdAt: string;
}

/** Students who have / have not submitted — T-ASGN-4 (per-assignment demo data). */
export const submissionRosters: Record<
  string,
  { submitted: string[]; notSubmitted: string[] }
> = {
  a1: {
    submitted: ["Nguyễn Minh Anh", "Hoàng Văn Nam", "Bùi Khánh Linh", "Đặng Thu Thảo"],
    notSubmitted: ["Lê Quang Dũng", "Phan Hải Đăng", "Trịnh Quốc Bảo"],
  },
  a2: {
    submitted: ["Ngô Thanh Tâm", "Lý Trường An"],
    notSubmitted: ["Đỗ Gia Hân"],
  },
};

export const mockAssignments: Assignment[] = [
  {
    id: "a1",
    title: "Bài tập 4 · Mua sắm — từ vựng",
    type: "assignment",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    hskLevel: 3,
    dueDate: "2026-08-30",
    timeLimitMinutes: null,
    questionIds: ["q1", "q4", "q8"],
    submittedCount: 4,
    totalStudents: 7,
    pendingGradingCount: 2,
    createdAt: "2026-08-20",
  },
  {
    id: "a2",
    title: "Đề thi thử HSK 5 — Nghe hiểu",
    type: "mock_test",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    hskLevel: 5,
    dueDate: "2026-09-06",
    timeLimitMinutes: 40,
    questionIds: ["q3", "q9", "q12"],
    submittedCount: 2,
    totalStudents: 3,
    pendingGradingCount: 0,
    createdAt: "2026-08-28",
  },
  {
    id: "a3",
    title: "Bài tập 3 · Hỏi đường — điền chỗ trống",
    type: "assignment",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    hskLevel: 3,
    dueDate: "2026-08-15",
    timeLimitMinutes: null,
    questionIds: ["q6", "q7"],
    submittedCount: 7,
    totalStudents: 7,
    pendingGradingCount: 0,
    createdAt: "2026-08-08",
  },
  {
    id: "a4",
    title: "Luyện viết — mô tả cuối tuần",
    type: "assignment",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    hskLevel: 4,
    dueDate: "2026-09-10",
    timeLimitMinutes: null,
    questionIds: ["q11"],
    submittedCount: 0,
    totalStudents: 3,
    pendingGradingCount: 0,
    createdAt: "2026-09-01",
  },
  {
    id: "a5",
    title: "Đề thi thử HSK 4 — Đọc hiểu",
    type: "mock_test",
    classId: "c2",
    className: "Trung cấp B — Thứ 4/6",
    hskLevel: 4,
    dueDate: "2026-09-15",
    timeLimitMinutes: 60,
    questionIds: ["q5", "q9"],
    submittedCount: 0,
    totalStudents: 0,
    pendingGradingCount: 0,
    createdAt: "2026-09-01",
  },
];
