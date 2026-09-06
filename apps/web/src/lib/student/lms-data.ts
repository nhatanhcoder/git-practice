/**
 * MOCK(student LMS): fixtures for the class / lesson / assignment / attempt half of the
 * Student area. No API call anywhere — `API_STUDENT.md` defines the endpoints for
 * classes, assignments and attempts, but `apps/api` implements none of them yet, and it
 * defines no Student Lessons endpoint at all. Remove this file when those land.
 *
 * Fixtures deliberately spread across every axis the screens branch on: all four
 * assignment statuses, both assignment types, classes at different HSK levels, a lesson
 * with no attachment, and an attempt that is graded only in part. A fixture set drawn
 * from one happy value is how `WEB-007` survived a smoke test for weeks.
 *
 * Dates are stored as UTC ISO 8601 and formatted only at render — `working-rules.md`
 * § API Rules, and the mistake `WEB-003` records on the Admin side.
 */

export type ClassStatus = "active" | "archived";

export type StudentClass = {
  id: string;
  name: string;
  teacherName: string;
  hskLevel: number;
  enrollmentCode: string;
  schedule: string;
  status: ClassStatus;
  joinedAt: string;
};

export type Lesson = {
  id: string;
  classId: string;
  order: number;
  title: string;
  titleHanzi: string | null;
  summary: string;
  /** Body copy. Null when the teacher published only a title and an attachment. */
  content: string | null;
  videoUrl: string | null;
  documentName: string | null;
  /** Assignment ids attached to this lesson. M:N per ENTITY_LESSON_ASSIGNMENT. */
  assignmentIds: string[];
};

export type AssignmentType = "homework" | "mock_test";

/** The learner's own status, not the assignment's — S-ASGN-1. */
export type AssignmentStatus = "not_started" | "in_progress" | "submitted" | "graded";

export type Assignment = {
  id: string;
  classId: string;
  title: string;
  type: AssignmentType;
  dueAt: string;
  /** Required for mock_test, null for homework — ENTITY_ASSIGNMENT. */
  timeLimitMinutes: number | null;
  questionCount: number;
  maxScore: number;
  status: AssignmentStatus;
  /** Set once an attempt exists. */
  attemptId: string | null;
};

export type QuestionKind = "mcq" | "writing";

export type AttemptQuestion = {
  id: string;
  order: number;
  kind: QuestionKind;
  prompt: string;
  /** MCQ only. Stable ids, never bare strings — the shape `WEB-006` B2 settled on. */
  options: { id: string; text: string }[] | null;
  maxScore: number;
};

export type Attempt = {
  id: string;
  assignmentId: string;
  status: "in_progress" | "submitted" | "graded";
  startedAt: string;
  submittedAt: string | null;
  questions: AttemptQuestion[];
};

export type QuestionResult = {
  questionId: string;
  /** Null while the teacher has not graded this question yet. */
  score: number | null;
  answer: string;
  correctAnswer: string | null;
  feedback: string | null;
};

export type AttemptResult = {
  attemptId: string;
  assignmentId: string;
  submittedAt: string;
  gradedAt: string | null;
  /** Sum of the graded questions only. Provisional while any score is null. */
  score: number;
  maxScore: number;
  teacherFeedback: string | null;
  questions: QuestionResult[];
};

export const studentClasses: StudentClass[] = [
  {
    id: "c-hsk3-a",
    name: "HSK 3 — Lớp tối thứ 3/5",
    teacherName: "Cô Phạm Thu Hà",
    hskLevel: 3,
    enrollmentCode: "H3TT2645",
    schedule: "Thứ 3 & Thứ 5 · 19:30–21:00",
    status: "active",
    joinedAt: "2026-07-02T02:00:00.000Z",
  },
  {
    id: "c-hsk5-b",
    name: "HSK 5 — Luyện thi cấp tốc",
    teacherName: "Thầy Nguyễn Minh Quân",
    hskLevel: 5,
    enrollmentCode: "H5LT9082",
    schedule: "Thứ 7 · 08:30–11:30",
    status: "active",
    joinedAt: "2026-08-15T01:30:00.000Z",
  },
];

export const lessons: Lesson[] = [
  {
    id: "l-h3-01",
    classId: "c-hsk3-a",
    order: 1,
    title: "Bài 1 — Đi mua sắm",
    titleHanzi: "去商场买东西",
    summary: "Từ vựng mua sắm, mặc cả và cấu trúc so sánh cơ bản.",
    content:
      "Buổi này tập trung vào tình huống mua sắm: hỏi giá, mặc cả, và so sánh hai món hàng. Học viên cần thuộc 24 từ vựng trong danh sách trước khi vào lớp.",
    videoUrl: null,
    documentName: "HSK3-Bai01-TuVung.pdf",
    assignmentIds: ["a-h3-01", "a-h3-02"],
  },
  {
    id: "l-h3-02",
    classId: "c-hsk3-a",
    order: 2,
    title: "Bài 2 — Hỏi đường",
    titleHanzi: "问路",
    summary: "Phương hướng, phương tiện và cách hỏi đường lịch sự.",
    content:
      "Mở rộng từ bài 1 sang tình huống di chuyển. Chú ý cấu trúc 先…然后… và cách dùng 离 khi nói khoảng cách.",
    videoUrl: "https://example.invalid/hsk3-bai02",
    documentName: null,
    assignmentIds: ["a-h3-03"],
  },
  {
    id: "l-h3-03",
    classId: "c-hsk3-a",
    order: 3,
    title: "Bài 3 — Ôn tập giữa kỳ",
    titleHanzi: null,
    // A lesson with no body and no attachment: the Empty state of the lesson screen is
    // a real case, not a hypothetical one.
    summary: "Buổi ôn, giáo viên chưa đăng tài liệu.",
    content: null,
    videoUrl: null,
    documentName: null,
    assignmentIds: [],
  },
  {
    id: "l-h5-01",
    classId: "c-hsk5-b",
    order: 1,
    title: "Bài 1 — Đọc hiểu báo chí",
    titleHanzi: "新闻阅读",
    summary: "Chiến lược đọc lướt và xử lý từ mới trong bài đọc dài.",
    content:
      "Luyện kỹ năng đọc dưới áp lực thời gian. Không tra từ điển trong lần đọc đầu tiên.",
    videoUrl: null,
    documentName: "HSK5-DocHieu-Buoi01.pdf",
    assignmentIds: ["a-h5-01"],
  },
];

export const assignments: Assignment[] = [
  {
    id: "a-h3-01",
    classId: "c-hsk3-a",
    title: "Bài tập từ vựng — Đi mua sắm",
    type: "homework",
    dueAt: "2026-09-06T16:00:00.000Z",
    timeLimitMinutes: null,
    questionCount: 10,
    maxScore: 10,
    status: "not_started",
    attemptId: null,
  },
  {
    id: "a-h3-02",
    classId: "c-hsk3-a",
    title: "Viết đoạn văn — Một lần đi chợ",
    type: "homework",
    dueAt: "2026-09-08T16:00:00.000Z",
    timeLimitMinutes: null,
    questionCount: 3,
    maxScore: 15,
    status: "in_progress",
    attemptId: "at-h3-02",
  },
  {
    id: "a-h3-03",
    classId: "c-hsk3-a",
    title: "Kiểm tra giữa kỳ HSK 3",
    type: "mock_test",
    dueAt: "2026-09-02T16:00:00.000Z",
    timeLimitMinutes: 45,
    questionCount: 4,
    maxScore: 20,
    // Submitted but not yet graded — the gap between the two is normal, because the
    // Writing half waits for the teacher while MCQ grades itself.
    status: "submitted",
    attemptId: "at-h3-03",
  },
  {
    id: "a-h5-01",
    classId: "c-hsk5-b",
    title: "Đọc hiểu — Bài báo về giao thông đô thị",
    type: "homework",
    dueAt: "2026-08-30T16:00:00.000Z",
    timeLimitMinutes: null,
    questionCount: 4,
    maxScore: 20,
    status: "graded",
    attemptId: "at-h5-01",
  },
];

export const attempts: Attempt[] = [
  {
    id: "at-h3-02",
    assignmentId: "a-h3-02",
    status: "in_progress",
    startedAt: "2026-09-03T12:10:00.000Z",
    submittedAt: null,
    questions: [
      {
        id: "q-1",
        order: 1,
        kind: "mcq",
        prompt: "「这件衣服 ___ 那件贵。」 Chọn từ đúng.",
        options: [
          { id: "o-a", text: "比" },
          { id: "o-b", text: "跟" },
          { id: "o-c", text: "从" },
          { id: "o-d", text: "离" },
        ],
        maxScore: 5,
      },
      {
        id: "q-2",
        order: 2,
        kind: "mcq",
        prompt: "「便宜一点儿」 nghĩa là gì?",
        options: [
          { id: "o-a", text: "Đắt hơn một chút" },
          { id: "o-b", text: "Rẻ hơn một chút" },
          { id: "o-c", text: "Mới hơn một chút" },
          { id: "o-d", text: "Xa hơn một chút" },
        ],
        maxScore: 5,
      },
      {
        id: "q-3",
        order: 3,
        kind: "writing",
        prompt: "Viết 5 câu kể về một lần bạn đi chợ, dùng ít nhất 2 lần cấu trúc so sánh.",
        options: null,
        maxScore: 5,
      },
    ],
  },
  {
    id: "at-h3-03",
    assignmentId: "a-h3-03",
    status: "submitted",
    startedAt: "2026-09-01T13:00:00.000Z",
    submittedAt: "2026-09-01T13:41:00.000Z",
    // A submitted attempt keeps its questions. They were an empty array here at first,
    // and the result screen rendered "10/0" — the graded denominator is derived from
    // these, so dropping them makes the score meaningless.
    questions: [
      { id: "q-1", order: 1, kind: "mcq", prompt: "Nghe và chọn đáp án đúng.", options: [{ id: "o-a", text: "A" }, { id: "o-b", text: "B" }], maxScore: 5 },
      { id: "q-2", order: 2, kind: "mcq", prompt: "Chọn từ điền vào chỗ trống.", options: [{ id: "o-a", text: "A" }, { id: "o-c", text: "C" }], maxScore: 5 },
      { id: "q-3", order: 3, kind: "writing", prompt: "Viết 5 câu về một lần đi mua sắm.", options: null, maxScore: 5 },
      { id: "q-4", order: 4, kind: "writing", prompt: "Nêu ý kiến về mua sắm trực tuyến.", options: null, maxScore: 5 },
    ],
  },
  {
    id: "at-h5-01",
    assignmentId: "a-h5-01",
    status: "graded",
    startedAt: "2026-08-29T09:00:00.000Z",
    submittedAt: "2026-08-29T09:52:00.000Z",
    questions: [
      { id: "q-1", order: 1, kind: "mcq", prompt: "Ý chính của đoạn 1 là gì?", options: [{ id: "o-a", text: "A" }, { id: "o-b", text: "B" }], maxScore: 5 },
      { id: "q-2", order: 2, kind: "mcq", prompt: "Tác giả cho rằng nguyên nhân chính là gì?", options: [{ id: "o-a", text: "A" }, { id: "o-b", text: "B" }], maxScore: 5 },
      { id: "q-3", order: 3, kind: "mcq", prompt: "Từ 拥堵 trong bài nghĩa là gì?", options: [{ id: "o-c", text: "C" }, { id: "o-d", text: "D" }], maxScore: 5 },
      { id: "q-4", order: 4, kind: "mcq", prompt: "Giải pháp nào KHÔNG được nhắc tới?", options: [{ id: "o-b", text: "B" }, { id: "o-d", text: "D" }], maxScore: 5 },
    ],
  },
];

export const attemptResults: AttemptResult[] = [
  {
    attemptId: "at-h5-01",
    assignmentId: "a-h5-01",
    submittedAt: "2026-08-29T09:52:00.000Z",
    gradedAt: "2026-08-31T02:15:00.000Z",
    score: 17,
    maxScore: 20,
    teacherFeedback:
      "Đọc hiểu tốt, tốc độ ổn. Câu 4 cần chú ý phân biệt ý chính và ví dụ minh hoạ.",
    questions: [
      {
        questionId: "q-1",
        score: 5,
        answer: "B",
        correctAnswer: "B",
        feedback: null,
      },
      {
        questionId: "q-2",
        score: 5,
        answer: "A",
        correctAnswer: "A",
        feedback: null,
      },
      {
        questionId: "q-3",
        score: 5,
        answer: "C",
        correctAnswer: "C",
        feedback: null,
      },
      {
        questionId: "q-4",
        score: 2,
        answer: "D",
        correctAnswer: "B",
        feedback: "Đoạn 3 nói về nguyên nhân, không phải giải pháp.",
      },
    ],
  },
  {
    // Half-graded on purpose: MCQ scored, Writing still null. The result screen must
    // show this as provisional rather than presenting 10/20 as a final mark.
    attemptId: "at-h3-03",
    assignmentId: "a-h3-03",
    submittedAt: "2026-09-01T13:41:00.000Z",
    gradedAt: null,
    score: 10,
    maxScore: 20,
    teacherFeedback: null,
    questions: [
      { questionId: "q-1", score: 5, answer: "A", correctAnswer: "A", feedback: null },
      { questionId: "q-2", score: 5, answer: "C", correctAnswer: "C", feedback: null },
      {
        questionId: "q-3",
        score: null,
        answer: "我上个星期去了商场…",
        correctAnswer: null,
        feedback: null,
      },
      {
        questionId: "q-4",
        score: null,
        answer: "我觉得网上买东西比较方便…",
        correctAnswer: null,
        feedback: null,
      },
    ],
  },
];

/* ---------- lookups ---------- */

export function classById(id: string): StudentClass | null {
  return studentClasses.find((c) => c.id === id) ?? null;
}

export function lessonsForClass(classId: string): Lesson[] {
  return lessons.filter((l) => l.classId === classId).sort((a, b) => a.order - b.order);
}

export function lessonById(classId: string, lessonId: string): Lesson | null {
  // Both ids are checked, not just the lesson's: a lesson reached through the wrong
  // class is the ownership hole the Page Contract calls out.
  return lessons.find((l) => l.id === lessonId && l.classId === classId) ?? null;
}

export function assignmentById(id: string): Assignment | null {
  return assignments.find((a) => a.id === id) ?? null;
}

export function assignmentsForClass(classId: string): Assignment[] {
  return assignments.filter((a) => a.classId === classId);
}

export function attemptById(id: string): Attempt | null {
  return attempts.find((a) => a.id === id) ?? null;
}

export function resultByAttemptId(id: string): AttemptResult | null {
  return attemptResults.find((r) => r.attemptId === id) ?? null;
}

/** Open work, for the dashboard and the assignments header. */
export function dueCount(): number {
  return assignments.filter((a) => a.status === "not_started" || a.status === "in_progress").length;
}
