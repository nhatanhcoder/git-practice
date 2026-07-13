# 🏫 CLASS_MANAGEMENT.md — Quản lý Lớp học

> **Sprint**: S2 — Classes + Enrollment  
> **Module**: ClassesModule (NestJS)  
> **Entities**: Class, ClassEnrollment (PostgreSQL)

---

## 1. Tổng quan

Class Management bao gồm:
- Teacher tạo và quản lý lớp học
- Hệ thống enrollment code (8 ký tự) để student tham gia
- Student xem lớp, bài tập, và rời lớp
- Admin xem tất cả lớp (monitoring)

---

## 2. Teacher Flows

### 2.1 Tạo Lớp

```
Teacher vào /teacher/classes/create
       │
       ▼
POST /api/v1/classes
{
  name: "HSK 3 — Nhóm A",
  description: "Lớp HSK 3 buổi chiều",
  hskLevel: 3
}
       │
       ▼
ClassesService.create():
  ① Validate teacher role
  ② Generate enrollment code (8 chars, unique)
  ③ Create class (status: "active")
       │
       ▼
Response: { class, enrollmentCode: "ABC1DE2F" }
       │
       ▼
Teacher copy và gửi code cho học sinh
```

### 2.2 Generate Enrollment Code

```typescript
// classes.service.ts
async generateEnrollmentCode(): Promise<string> {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // Exclude 0,O,1,I (ambiguous)
  const LENGTH = 8;
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = Array.from(
      { length: LENGTH },
      () => CHARSET[crypto.randomInt(CHARSET.length)]
    ).join('');

    const existing = await this.prisma.class.findUnique({
      where: { enrollmentCode: code }
    });

    if (!existing) return code;
  }

  throw new BusinessException('CLASS_CODE_GENERATION_FAILED', 'Không thể tạo mã lớp', 500);
}
```

### 2.3 Xem và Quản lý Lớp

```
GET  /api/v1/classes              → Danh sách lớp của teacher
GET  /api/v1/classes/:classId     → Chi tiết lớp
PATCH /api/v1/classes/:classId    → Cập nhật tên, mô tả
POST /api/v1/classes/:classId/archive   → Archive lớp
GET  /api/v1/classes/:classId/students  → Danh sách học sinh
GET  /api/v1/classes/:classId/dashboard → Class stats (avg score, completion)
```

### 2.4 Class Dashboard (Teacher)

```typescript
// GET /api/v1/classes/:classId/dashboard
async getClassDashboard(classId: string, teacherId: string) {
  const cls = await this.findByIdOrThrow(classId, teacherId);

  const [enrollmentCount, assignments, recentAttempts] = await Promise.all([
    this.prisma.classEnrollment.count({ where: { classId, status: 'active' } }),
    this.prisma.assignment.findMany({ where: { classId, status: 'published' } }),
    this.prisma.attempt.findMany({
      where: { assignment: { classId }, status: 'graded' },
      orderBy: { gradedAt: 'desc' },
      take: 50,
      include: { assignment: true }
    })
  ]);

  const avgScore = recentAttempts.length > 0
    ? recentAttempts.reduce((sum, a) => sum + (a.totalScore / a.assignment.maxScore), 0) / recentAttempts.length * 100
    : 0;

  return {
    class: cls,
    stats: {
      studentCount: enrollmentCount,
      assignmentCount: assignments.length,
      avgScore: Math.round(avgScore),
      completionRate: /* calculateCompletionRate */,
    }
  };
}
```

---

## 3. Student Flows

### 3.1 Tham gia Lớp bằng Enrollment Code

```
Student vào /student/classes → "Tham gia lớp"
       │
       ▼
POST /api/v1/classes/enroll
{ enrollmentCode: "ABC1DE2F" }
       │
       ▼
ClassesService.enroll():
  ① Tìm class theo enrollmentCode
  ② Kiểm tra class.status === 'active'  → nếu không: CLASS_ALREADY_ARCHIVED
  ③ Kiểm tra enrollment tồn tại         → nếu có: CLASS_ALREADY_ENROLLED
  ④ Create ClassEnrollment (status: 'active')
  ⑤ Tạo Notification cho teacher
       │
       ▼
201 Created — Student redirect sang class page
```

### 3.2 Xem Lớp của Student

```
GET /api/v1/users/me/classes         → Danh sách lớp đã tham gia
GET /api/v1/classes/:classId          → Chi tiết lớp (nếu enrolled)
GET /api/v1/classes/:classId/assignments → Bài tập trong lớp
```

### 3.3 Rời Lớp

```
PATCH /api/v1/classes/:classId/leave
       │
       ▼
ClassesService.leaveClass():
  ① Tìm enrollment của student
  ② Cập nhật status → 'dropped', droppedAt = now()
  ③ Không xóa: giữ lịch sử enrollment
```

> ⚠️ Khi student drop, các **attempt đang in_progress** vẫn còn. Không tự động submit.

---

## 4. Admin Flow

```
GET /api/v1/admin/classes              → Tất cả classes (filter, search)
GET /api/v1/admin/classes/:classId     → Chi tiết bất kỳ class
```

Admin không tạo/xóa class — chỉ monitor.

---

## 5. Frontend Components

| Component | Route | Mô tả |
|-----------|-------|-------|
| `ClassList` | `/teacher/classes` | Grid lớp học của teacher |
| `CreateClassForm` | `/teacher/classes/create` | Form tạo lớp + hiển thị enrollment code |
| `ClassDetail` | `/teacher/classes/:id` | Dashboard + tabs (students, assignments) |
| `EditClassForm` | `/teacher/classes/:id/edit` | Cập nhật thông tin lớp |
| `StudentTable` | `/teacher/classes/:id/students` | Danh sách học sinh + điểm trung bình |
| `EnrollDialog` | `/student/classes` | Dialog nhập enrollment code |
| `ClassCard` | `/student/classes` | Card hiển thị lớp đã tham gia |

---

## 6. Business Rules

| Rule | Chi tiết |
|------|---------|
| Enrollment code | 8 ký tự, chỉ dùng `A-Z` và `2-9` (tránh nhầm 0/O, 1/I) |
| Unique per class | Mỗi class có 1 enrollment code; code không tái sử dụng |
| One enrollment | Student chỉ enroll 1 lần per class (unique constraint) |
| Drop = soft delete | Enrollment status → 'dropped', không xóa record |
| Re-enroll | Student drop rồi có thể enroll lại bằng cùng code |
| Archive class | Teacher archive → class closed, student không thể enroll mới |
| Teacher owns | Chỉ teacher của lớp mới có thể PATCH/archive |

---

## 7. API Reference Quick

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/classes` | Teacher | Tạo lớp |
| `GET` | `/classes` | Teacher | Danh sách lớp của mình |
| `GET` | `/classes/:id` | All | Chi tiết lớp |
| `PATCH` | `/classes/:id` | Teacher | Cập nhật |
| `POST` | `/classes/:id/archive` | Teacher | Archive |
| `GET` | `/classes/:id/students` | Teacher | Danh sách học sinh |
| `GET` | `/classes/:id/dashboard` | Teacher | Dashboard stats |
| `GET` | `/classes/:id/assignments` | All | Assignments của lớp |
| `POST` | `/classes/enroll` | Student | Tham gia lớp |
| `PATCH` | `/classes/:id/leave` | Student | Rời lớp |
| `GET` | `/users/me/classes` | Student | Lớp đã tham gia |
