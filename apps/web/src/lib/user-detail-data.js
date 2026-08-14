const studentDataset = {
  user: {
    id: "1",
    nickname: "Nguyễn Minh Anh",
    email: "minhanh@example.com",
    role: "student",
    status: "pending",
    createdAt: "09/08/2026",
    lastLoginAt: null,
    initials: "MA",
    hskLevelGoal: 4,
  },
  enrollments: [],
  attempts: [],
};

const teacherDataset = {
  user: {
    id: "4",
    nickname: "Phạm Thị Lan",
    email: "lan.pham@example.com",
    role: "teacher",
    status: "active",
    createdAt: "02/03/2026",
    lastLoginAt: "11/08/2026 07:42",
    initials: "PL",
    bio: "Giáo viên HSK 1–4",
  },
  classes: [
    { name: "HSK 2 — Nhóm A", students: 8, status: "active" },
    { name: "HSK 1 — Nhóm C", students: 5, status: "active" },
  ],
  sessions: [
    { date: "08/08/2026", className: "HSK 2 — Nhóm A", duration: "90 phút", status: "completed_pending" },
    { date: "06/08/2026", className: "HSK 2 — Nhóm A", duration: "90 phút", status: "approved" },
    { date: "01/08/2026", className: "HSK 1 — Nhóm C", duration: "60 phút", status: "approved" },
  ],
};

/**
 * Temporary mock adapter for the unimplemented Admin User Detail endpoint.
 * @param {string} userId
 */
export function getUserDetailDataset(userId) {
  if (userId === "1") return structuredClone(studentDataset);
  if (userId === "4") return structuredClone(teacherDataset);
  return null;
}

export function getStudentDataset() {
  return structuredClone(studentDataset);
}

export function getTeacherDataset() {
  return structuredClone(teacherDataset);
}
