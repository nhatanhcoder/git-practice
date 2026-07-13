# 📅 SESSION_ATTENDANCE.md — Buổi học & Điểm danh

> **Sprint**: S6 — Payroll + Invoicing + Notifications  
> **Module**: ClassSessionsModule (NestJS)  
> **Entities**: ClassSession, SessionAttendance (PostgreSQL)

---

## 1. Tổng quan

ClassSession là bản ghi cho mỗi buổi dạy thực tế. Teacher log buổi học sau khi dạy xong, bao gồm:
- Chủ đề bài học (lesson topic)
- Thời gian thực tế (actual start/end)
- Điểm danh học sinh
- Status flow để admin duyệt → tính lương

---

## 2. Session State Machine

```
Teacher tạo session (scheduled)
          │
          │ Teacher dạy xong, ghi topic + attendance
          ▼
    COMPLETED_PENDING ──────────────────────► Admin review
          │
          │                                       │
          │                          ┌────────────┤
          │                          │            │
          │                       APPROVED     REJECTED
          │                          │            │
          │                          │            └── Teacher chỉnh sửa và resubmit
          │                          │
          │                          ▼ (khi tạo PayrollPeriod và finalize)
          │                        PAID
          │
          └── Admin reject: session về REJECTED state
```

---

## 3. Teacher Flow

### 3.1 Tạo Buổi học (Pre-schedule)

```typescript
// POST /api/v1/classes/:classId/sessions
// Thường pre-schedule trước khi dạy
{
  sessionDate: "2026-07-15",
  startTime: "2026-07-15T14:00:00Z",
  endTime: "2026-07-15T15:30:00Z"
}
// → status: "scheduled"
```

### 3.2 Submit Buổi học Sau Khi Dạy

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
// → Tạo Notification cho admin: "Teacher X đã submit buổi học"
```

### 3.3 Xem Sessions của Mình

```
GET /api/v1/classes/:classId/sessions    → Sessions của lớp
GET /api/v1/sessions/:sessionId          → Chi tiết session
GET /api/v1/sessions/my                  → Tất cả sessions của teacher (filter theo month)
```

---

## 4. Admin Flow

### 4.1 Duyệt Session

```typescript
// PATCH /api/v1/admin/sessions/:sessionId/approve
// → status: "approved"
// → Tạo Notification cho teacher: "Buổi học ngày X đã được duyệt"
```

### 4.2 Từ chối Session

```typescript
// PATCH /api/v1/admin/sessions/:sessionId/reject
{
  rejectionReason: "Thời gian thực tế không khớp với lịch. Vui lòng kiểm tra lại."
}
// → status: "rejected"
// → Tạo Notification cho teacher với rejectionReason
```

### 4.3 Xem Sessions Pending

```
GET /api/v1/admin/sessions?status=completed_pending  → Sessions chờ duyệt
GET /api/v1/admin/sessions?teacherId=...&month=2026-07  → Sessions của teacher trong tháng
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

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/classes/:classId/sessions` | Teacher | Tạo/lên lịch buổi học |
| `GET` | `/classes/:classId/sessions` | Teacher, Admin | Danh sách sessions |
| `GET` | `/sessions/:id` | Teacher, Admin | Chi tiết session |
| `PATCH` | `/sessions/:id/submit` | Teacher | Submit sau khi dạy |
| `PATCH` | `/sessions/:id` | Teacher | Cập nhật session (khi bị reject) |
| `PATCH` | `/admin/sessions/:id/approve` | Admin | Duyệt session |
| `PATCH` | `/admin/sessions/:id/reject` | Admin | Từ chối session |
| `GET` | `/admin/sessions` | Admin | Tất cả sessions (filter) |
| `GET` | `/classes/:classId/attendance-summary` | Teacher | Tổng hợp điểm danh |
