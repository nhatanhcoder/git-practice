/**
 * MOCK(T-SES-*): sessions + attendance in-memory until /api/v1/teacher/sessions
 * exists. State machine per FLOW_SESSION_ATTENDANCE.md §2:
 * scheduled → completed_pending → approved | rejected. start/end record actual
 * times; they are submitted together with attendance via /submit.
 */

export type SessionStatus =
  | "scheduled"
  | "completed_pending"
  | "approved"
  | "rejected";

export const sessionStatusLabels: Record<SessionStatus, string> = {
  scheduled: "Đã lên lịch",
  completed_pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export type AttendanceValue = "present" | "absent_excused" | "absent_unexcused";

export const attendanceLabels: Record<AttendanceValue, string> = {
  present: "Có mặt",
  absent_excused: "Vắng có lý",
  absent_unexcused: "Vắng không lý",
};

export interface AttendanceRecord {
  studentId: string;
  nickname: string;
  attendance: AttendanceValue;
  note: string | null;
}

export interface Session {
  id: string;
  classId: string;
  className: string;
  date: string;
  startTime: string; // "HH:mm"
  endTime: string;
  actualStart: string | null;
  actualEnd: string | null;
  topic: string | null;
  notes: string | null;
  status: SessionStatus;
  rejectionReason: string | null;
  attendance: AttendanceRecord[];
}

const c1Roster = [
  { studentId: "s1", nickname: "Nguyễn Minh Anh" },
  { studentId: "s2", nickname: "Hoàng Văn Nam" },
  { studentId: "s3", nickname: "Lê Quang Dũng" },
  { studentId: "s5", nickname: "Đặng Thu Thảo" },
  { studentId: "s6", nickname: "Phan Hải Đăng" },
  { studentId: "s7", nickname: "Bùi Khánh Linh" },
];

const c3Roster = [
  { studentId: "s9", nickname: "Ngô Thanh Tâm" },
  { studentId: "s10", nickname: "Lý Trường An" },
  { studentId: "s11", nickname: "Đỗ Gia Hân" },
];

export const mockSessions: Session[] = [
  {
    id: "ss1",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    date: "2026-09-02",
    startTime: "19:00",
    endTime: "20:30",
    actualStart: null,
    actualEnd: null,
    topic: null,
    notes: null,
    status: "scheduled",
    rejectionReason: null,
    attendance: c1Roster.map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
  },
  {
    id: "ss2",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    date: "2026-08-31",
    startTime: "19:00",
    endTime: "20:30",
    actualStart: "19:05",
    actualEnd: null,
    topic: "HSK 3 — Chương 5: Du lịch",
    notes: null,
    status: "scheduled",
    rejectionReason: null,
    attendance: [
      ...c1Roster.slice(0, 3).map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
      { ...c1Roster[3], attendance: "absent_excused" as AttendanceValue, note: "Bệnh" },
      { ...c1Roster[4], attendance: "present" as AttendanceValue, note: null },
      { ...c1Roster[5], attendance: "absent_unexcused" as AttendanceValue, note: null },
    ],
  },
  {
    id: "ss3",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    date: "2026-08-29",
    startTime: "19:00",
    endTime: "20:30",
    actualStart: "19:02",
    actualEnd: "20:35",
    topic: "HSK 3 — Chương 4: Mua sắm",
    notes: "Học sinh làm tốt phần nghe, cần luyện thêm viết",
    status: "completed_pending",
    rejectionReason: null,
    attendance: [
      ...c1Roster.slice(0, 5).map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
      { ...c1Roster[5], attendance: "absent_unexcused" as AttendanceValue, note: null },
    ],
  },
  {
    id: "ss4",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    date: "2026-08-26",
    startTime: "19:00",
    endTime: "20:30",
    actualStart: "18:58",
    actualEnd: "20:30",
    topic: "HSK 3 — Chương 4: Mua sắm (bài tập)",
    notes: null,
    status: "approved",
    rejectionReason: null,
    attendance: c1Roster.map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
  },
  {
    id: "ss5",
    classId: "c1",
    className: "Sơ cấp A — Thứ 3/5/7",
    date: "2026-08-22",
    startTime: "19:00",
    endTime: "20:30",
    actualStart: "19:00",
    actualEnd: "20:10",
    topic: "HSK 3 — Chương 3: Hỏi đường",
    notes: null,
    status: "rejected",
    rejectionReason: "Buổi kết thúc sớm 20 phút so với lịch — kiểm tra lại thời lượng trước khi gửi duyệt lại.",
    attendance: c1Roster.slice(0, 4).map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
  },
  {
    id: "ss6",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    date: "2026-08-30",
    startTime: "09:00",
    endTime: "11:30",
    actualStart: "09:00",
    actualEnd: "11:35",
    topic: "Đề luyện số 3 — Nghe hiểu HSK 5",
    notes: null,
    status: "approved",
    rejectionReason: null,
    attendance: [
      { ...c3Roster[0], attendance: "present" as AttendanceValue, note: null },
      { ...c3Roster[1], attendance: "present" as AttendanceValue, note: null },
      { ...c3Roster[2], attendance: "absent_excused" as AttendanceValue, note: "Công tác" },
    ],
  },
  {
    id: "ss7",
    classId: "c3",
    className: "Luyện đề HSK 5 — cuối tuần",
    date: "2026-09-06",
    startTime: "09:00",
    endTime: "11:30",
    actualStart: null,
    actualEnd: null,
    topic: null,
    notes: null,
    status: "scheduled",
    rejectionReason: null,
    attendance: c3Roster.map((s) => ({ ...s, attendance: "present" as AttendanceValue, note: null })),
  },
];

export function attendanceSummary(session: Session) {
  const present = session.attendance.filter((a) => a.attendance === "present").length;
  const excused = session.attendance.filter((a) => a.attendance === "absent_excused").length;
  const unexcused = session.attendance.filter((a) => a.attendance === "absent_unexcused").length;
  return { present, excused, unexcused, total: session.attendance.length };
}
