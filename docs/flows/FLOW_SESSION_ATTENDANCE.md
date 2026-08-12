# 📅 SESSION_ATTENDANCE.md — Class Sessions & Attendance

> **Sprint**: S6 — Payroll + Invoicing + Notifications  
> **Module**: ClassSessionsModule (NestJS)  
> **Entities**: ClassSession, SessionAttendance (PostgreSQL)

---

## 1. Overview

A ClassSession is the record of one actual teaching session. The teacher logs it after teaching, capturing:
- The lesson topic
- The actual times (actual start/end)
- Student attendance
- A status flow for admin approval → salary calculation

---

## 2. Session State Machine

```
Teacher creates a session (scheduled)
          │
          │ Teacher finishes teaching, records topic + attendance
          ▼
    COMPLETED_PENDING ──────────────────────► Admin review
          │
          │                                       │
          │                          ┌────────────┤
          │                          │            │
          │                       APPROVED     REJECTED
          │                          │            │
          │                          │            └── Teacher edits and resubmits
          │                          │
          │                          ▼ (when a PayrollPeriod is created and finalized)
          │                        PAID
          │
          └── Admin rejects: the session moves to the REJECTED state
```

---

## 3. Teacher Flow

### 3.1 Create a Session (Pre-schedule)

```typescript
// POST /api/v1/classes/:classId/sessions
// Usually pre-scheduled before teaching
{
  sessionDate: "2026-07-15",
  startTime: "2026-07-15T14:00:00Z",
  endTime: "2026-07-15T15:30:00Z"
}
// → status: "scheduled"
```

### 3.2 Submit the Session After Teaching

> Payload strings below are Vietnamese — they are content the teacher types in the Vietnamese UI.

```typescript
// PATCH /api/v1/sessions/:sessionId/submit
{
  lessonTopic: "HSK 3 — Chương 5: Du lịch",
  notes: "Học sinh làm tốt phần nghe, cần luyện thêm viết",
  actualStartTime: "2026-07-15T14:05:00Z",
  actualEndTime: "2026-07-15T15:35:00Z",
  attendance: [
    { studentId: "uuid-1", status: "present" },
    { studentId: "uuid-2", status: "absent_excused", notes: "Bệnh" },
    { studentId: "uuid-3", status: "absent_unexcused" }
  ]
}
// → status: "completed_pending"
// → Creates a Notification for the admin: "Teacher X submitted a session"
```

### 3.3 View Their Own Sessions

```
GET /api/v1/classes/:classId/sessions    → The class's sessions
GET /api/v1/sessions/:sessionId          → Session detail
GET /api/v1/sessions/my                  → All of the teacher's sessions (filterable by month)
```

---

## 4. Admin Flow

### 4.1 Approve a Session

```typescript
// PATCH /api/v1/admin/sessions/:sessionId/approve
// → status: "approved"
// → Creates a Notification for the teacher: "Your session on X was approved"
```

### 4.2 Reject a Session

```typescript
// PATCH /api/v1/admin/sessions/:sessionId/reject
{
  rejectionReason: "Thời gian thực tế không khớp với lịch. Vui lòng kiểm tra lại."
}
// → status: "rejected"
// → Creates a Notification for the teacher carrying the rejectionReason
```

### 4.3 View Pending Sessions

```
GET /api/v1/admin/sessions?status=completed_pending  → Sessions awaiting approval
GET /api/v1/admin/sessions?teacherId=...&month=2026-07  → A teacher's sessions for the month
```

---

## 5. Service Implementation

```typescript
// class-sessions.service.ts
@Injectable()
export class ClassSessionsService {

  async submitSession(
    sessionId: string,
    teacherId: string,
    dto: SubmitSessionDto
  ): Promise<ClassSession> {
    // 1. Validate session belongs to teacher
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { teacherId } },
      include: { class: { include: { enrollments: { where: { status: 'active' } } } } }
    });
    if (!session) throw new BusinessException('SESSION_NOT_FOUND', '...', 404);
    if (session.status !== 'scheduled') {
      throw new BusinessException('SESSION_ALREADY_SUBMITTED', '...', 409);
    }

    // 2. Update session
    const updated = await this.prisma.classSession.update({
      where: { id: sessionId },
      data: {
        lessonTopic: dto.lessonTopic,
        notes: dto.notes,
        actualStartTime: dto.actualStartTime,
        actualEndTime: dto.actualEndTime,
        status: 'completed_pending',
        submittedAt: new Date(),
      }
    });

    // 3. Upsert attendance for each enrolled student
    await Promise.all(dto.attendance.map(a =>
      this.prisma.sessionAttendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: a.studentId } },
        create: { sessionId, studentId: a.studentId, attendanceStatus: a.status, notes: a.notes },
        update: { attendanceStatus: a.status, notes: a.notes }
      })
    ));

    // 4. Notify admin
    const admins = await this.prisma.user.findMany({ where: { role: 'admin' } });
    await Promise.all(admins.map(admin =>
      this.notificationsService.create({
        recipientId: admin.id,
        senderId: teacherId,
        type: 'session_submitted',
        message: `Buổi dạy "${session.lessonTopic || 'Chưa có chủ đề'}" ngày ${formatDate(session.sessionDate)} đang chờ duyệt`,
        data: { sessionId }
      })
    ));

    return updated;
  }
}
```

---

## 6. Attendance Statistics

```typescript
// GET /api/v1/classes/:classId/attendance-summary
async getAttendanceSummary(classId: string) {
  const sessions = await this.prisma.classSession.findMany({
    where: { classId, status: { in: ['approved', 'paid'] } },
    include: { attendances: true }
  });

  const students = await this.prisma.classEnrollment.findMany({
    where: { classId, status: 'active' },
    include: { student: true }
  });

  return students.map(enrollment => {
    const studentAttendances = sessions.flatMap(s =>
      s.attendances.filter(a => a.studentId === enrollment.studentId)
    );

    return {
      student: enrollment.student,
      totalSessions: sessions.length,
      present: studentAttendances.filter(a => a.attendanceStatus === 'present').length,
      absentExcused: studentAttendances.filter(a => a.attendanceStatus === 'absent_excused').length,
      absentUnexcused: studentAttendances.filter(a => a.attendanceStatus === 'absent_unexcused').length,
      attendanceRate: sessions.length > 0
        ? Math.round(studentAttendances.filter(a => a.attendanceStatus === 'present').length / sessions.length * 100)
        : 0
    };
  });
}
```

---

## 7. Frontend View

### Teacher — Session Log UI

> Mockups below show the Vietnamese UI as built.

```
Teacher Dashboard → Classes → [Lớp HSK 3] → Sessions tab
┌──────────────────────────────────────────────────────┐
│ 📅 Buổi học tháng 7/2026                             │
│                                                       │
│ [+ Thêm buổi học]                                     │
│                                                       │
│ 05/07 - HSK 3 Chương 4    ✅ Đã duyệt   90 phút     │
│ 08/07 - HSK 3 Chương 5    ⏳ Chờ duyệt  90 phút     │
│ 12/07 - Chưa có chủ đề    🔲 Lên lịch               │
│                                                       │
│ [Ghi nhận buổi học → ]                               │
└──────────────────────────────────────────────────────┘
```

### Admin — Session Approval Queue

```
Admin Dashboard → Sessions
┌──────────────────────────────────────────────────────┐
│ ⏳ Chờ duyệt (3 buổi)                                │
│                                                       │
│ Nguyễn Thị Hoa - HSK 3 - 08/07  90 phút  [Duyệt] [Từ chối]│
│ Lê Văn Nam     - HSK 2 - 07/07  60 phút  [Duyệt] [Từ chối]│
│ Trần Thị Mai   - HSK 1 - 06/07  60 phút  [Duyệt] [Từ chối]│
└──────────────────────────────────────────────────────┘
```

---

## 8. API Reference

| Method | Endpoint | Role | Description |
|--------|----------|------|-------|
| `POST` | `/classes/:classId/sessions` | Teacher | Create/schedule a session |
| `GET` | `/classes/:classId/sessions` | Teacher, Admin | List sessions |
| `GET` | `/sessions/:id` | Teacher, Admin | Session detail |
| `PATCH` | `/sessions/:id/submit` | Teacher | Submit after teaching |
| `PATCH` | `/sessions/:id` | Teacher | Update a session (after a rejection) |
| `PATCH` | `/admin/sessions/:id/approve` | Admin | Approve a session |
| `PATCH` | `/admin/sessions/:id/reject` | Admin | Reject a session |
| `GET` | `/admin/sessions` | Admin | All sessions (filterable) |
| `GET` | `/classes/:classId/attendance-summary` | Teacher | Attendance summary |
