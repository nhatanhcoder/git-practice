/**
 * MOCK(T-CLASS-*, T-LESSON-*): teacher class/lesson data stays in-memory until the
 * teacher API endpoints exist. Remove when wiring /api/v1/teacher/**.
 * Matches the Page Contracts in docs/front-end-design-docs/pages/teacher-pages/.
 */

export type ClassStatus = "active" | "archived";
export type EnrollmentStatus = "active" | "dropped";
export type LessonContentType = "document" | "video";

export interface TeacherClass {
  id: string;
  name: string;
  hskLevel: number;
  enrollmentCode: string;
  studentCount: number;
  status: ClassStatus;
  createdAt: string;
  description: string;
}

export interface ClassStudent {
  id: string;
  nickname: string;
  email: string;
  joinedAt: string;
  enrollmentStatus: EnrollmentStatus;
}

export interface ClassLesson {
  id: string;
  title: string;
  description: string;
  contentType: LessonContentType;
  assignmentCount: number;
}

export const mockTeacherProfile = {
  nickname: "Phạm Thị Lan",
  role: "Giáo viên",
};

export const mockTeacherClasses: TeacherClass[] = [
  {
    id: "c1",
    name: "Sơ cấp A — Thứ 3/5/7",
    hskLevel: 3,
    enrollmentCode: "HSK3XA41",
    studentCount: 8,
    status: "active",
    createdAt: "2026-06-02",
    description: "Lớp HSK 3 buổi tối, luyện 4 kỹ năng.",
  },
  {
    id: "c2",
    name: "Trung cấp B — Thứ 4/6",
    hskLevel: 4,
    enrollmentCode: "HSK4KB72",
    studentCount: 0,
    status: "active",
    createdAt: "2026-08-20",
    description: "Lớp HSK 4 mới mở, đang chờ học sinh nhập mã.",
  },
  {
    id: "c3",
    name: "Luyện đề HSK 5 — cuối tuần",
    hskLevel: 5,
    enrollmentCode: "HSK5LD08",
    studentCount: 3,
    status: "active",
    createdAt: "2026-07-11",
    description: "Luyện đề và ôn ngữ pháp HSK 5.",
  },
  {
    id: "c4",
    name: "Sơ cấp C — Kỳ hè",
    hskLevel: 2,
    enrollmentCode: "HSK2SC93",
    studentCount: 12,
    status: "archived",
    createdAt: "2026-04-06",
    description: "Lớp hè đã kết thúc.",
  },
];

export const mockClassStudents: Record<string, ClassStudent[]> = {
  c1: [
    { id: "s1", nickname: "Nguyễn Minh Anh", email: "minhanh@example.com", joinedAt: "2026-06-03", enrollmentStatus: "active" },
    { id: "s2", nickname: "Hoàng Văn Nam", email: "namhoang@example.com", joinedAt: "2026-06-05", enrollmentStatus: "active" },
    { id: "s3", nickname: "Lê Quang Dũng", email: "quangdung@example.com", joinedAt: "2026-06-10", enrollmentStatus: "active" },
    { id: "s4", nickname: "Vũ Ngọc Bích", email: "bichvu@example.com", joinedAt: "2026-06-18", enrollmentStatus: "dropped" },
    { id: "s5", nickname: "Đặng Thu Thảo", email: "thuthao@example.com", joinedAt: "2026-07-01", enrollmentStatus: "active" },
    { id: "s6", nickname: "Phan Hải Đăng", email: "haidang@example.com", joinedAt: "2026-07-02", enrollmentStatus: "active" },
    { id: "s7", nickname: "Bùi Khánh Linh", email: "khanhlinh@example.com", joinedAt: "2026-07-15", enrollmentStatus: "active" },
    { id: "s8", nickname: "Trịnh Quốc Bảo", email: "quocbao@example.com", joinedAt: "2026-08-01", enrollmentStatus: "active" },
  ],
  c2: [],
  c3: [
    { id: "s9", nickname: "Ngô Thanh Tâm", email: "thanhtam@example.com", joinedAt: "2026-07-12", enrollmentStatus: "active" },
    { id: "s10", nickname: "Lý Trường An", email: "truongan@example.com", joinedAt: "2026-07-20", enrollmentStatus: "active" },
    { id: "s11", nickname: "Đỗ Gia Hân", email: "giahan@example.com", joinedAt: "2026-08-05", enrollmentStatus: "active" },
  ],
  c4: [
    { id: "s12", nickname: "Vương Đức Thịnh", email: "ducthinh@example.com", joinedAt: "2026-04-07", enrollmentStatus: "active" },
    { id: "s13", nickname: "Hà My Chi", email: "mychi@example.com", joinedAt: "2026-04-09", enrollmentStatus: "active" },
  ],
};

export const mockClassLessons: Record<string, ClassLesson[]> = {
  c1: [
    { id: "l1", title: "Bài 1 · Chào hỏi và giới thiệu", description: "Từ vựng chào hỏi, cấu trúc 是", contentType: "document", assignmentCount: 1 },
    { id: "l2", title: "Bài 2 · Gia đình và nghề nghiệp", description: "Từ vựng gia đình, câu 的 sở hữu", contentType: "document", assignmentCount: 0 },
    { id: "l3", title: "Bài 3 · Hỏi đường chỉ đường", description: "Video hội thoại thực tế + bài nghe", contentType: "video", assignmentCount: 2 },
    { id: "l4", title: "Bài 4 · Đi mua sắm", description: "Từ vựng mua sắm, câu 把 cơ bản", contentType: "document", assignmentCount: 1 },
    { id: "l5", title: "Bài 5 · Thời tiết và kế hoạch", description: "Video dự báo thời tiết, 会 muốn/kỹ năng", contentType: "video", assignmentCount: 0 },
  ],
  c2: [],
  c3: [
    { id: "l6", title: "Đề luyện số 1 · Nghe hiểu", description: "Đề nghe HSK 5 chuẩn-format", contentType: "document", assignmentCount: 1 },
    { id: "l7", title: "Đề luyện số 2 · Đọc hiểu", description: "Đọc hiểu + điền từ", contentType: "document", assignmentCount: 0 },
  ],
  c4: [
    { id: "l8", title: "Bài 1 · Phát âm cơ bản", description: "Pinyin và thanh điệu", contentType: "document", assignmentCount: 0 },
  ],
};

export const classStatusLabels: Record<ClassStatus, string> = {
  active: "Đang hoạt động",
  archived: "Đã lưu trữ",
};

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  active: "Đang học",
  dropped: "Đã rời lớp",
};

export const contentTypeLabels: Record<LessonContentType, string> = {
  document: "Tài liệu",
  video: "Video",
};

/** Generates a plausible 8-char code — mirrors the server's format for the mock. */
export function generateEnrollmentCode(hskLevel: number): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = `HSK${hskLevel}`;
  for (let i = 0; i < 5; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code.slice(0, 8);
}
