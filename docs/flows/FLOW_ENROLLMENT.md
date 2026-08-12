# 🏫 CLASS_MANAGEMENT.md — Class Management

> **Sprint**: S2 — Classes + Enrollment  
> **Module**: ClassesModule (NestJS)  
> **Entities**: Class, ClassEnrollment (PostgreSQL)

---

## 1. Overview

Class Management covers:
- Teachers creating and managing classes
- The enrollment code system (8 characters) students use to join
- Students viewing classes and assignments, and leaving a class
- Admins viewing every class (monitoring)

---

## 2. Teacher Flows

### 2.1 Create a Class

```
Teacher goes to /teacher/classes/create
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
Teacher copies the code and sends it to students
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

  // Message string stays Vietnamese — it surfaces in the Vietnamese-language UI
  throw new BusinessException('CLASS_CODE_GENERATION_FAILED', 'Không thể tạo mã lớp', 500);
}
```

### 2.3 View and Manage Classes

```
GET  /api/v1/classes              → The teacher's class list
GET  /api/v1/classes/:classId     → Class detail
PATCH /api/v1/classes/:classId    → Update name, description
POST /api/v1/classes/:classId/archive   → Archive the class
GET  /api/v1/classes/:classId/students  → Student list
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

### 3.1 Join a Class with an Enrollment Code

```
Student goes to /student/classes → "Join class"
       │
       ▼
POST /api/v1/classes/enroll
{ enrollmentCode: "ABC1DE2F" }
       │
       ▼
ClassesService.enroll():
  ① Find the class by enrollmentCode
  ② Check class.status === 'active'   → if not: CLASS_ALREADY_ARCHIVED
  ③ Check whether an enrollment exists → if so: CLASS_ALREADY_ENROLLED
  ④ Create ClassEnrollment (status: 'active')
  ⑤ Create a Notification for the teacher
       │
       ▼
201 Created — Student is redirected to the class page
```

### 3.2 A Student's Class List

```
GET /api/v1/users/me/classes         → Classes the student has joined
GET /api/v1/classes/:classId          → Class detail (if enrolled)
GET /api/v1/classes/:classId/assignments → Assignments in the class
```

### 3.3 Leave a Class

```
PATCH /api/v1/classes/:classId/leave
       │
       ▼
ClassesService.leaveClass():
  ① Find the student's enrollment
  ② Set status → 'dropped', droppedAt = now()
  ③ Do not delete: the enrollment history is kept
```

> ⚠️ When a student drops, any **in_progress attempts** remain. They are not auto-submitted.

---

## 4. Admin Flow

```
GET /api/v1/admin/classes              → All classes (filter, search)
GET /api/v1/admin/classes/:classId     → Detail for any class
```

Admins do not create or delete classes — they only monitor.

---

## 5. Frontend Components

| Component | Route | Description |
|-----------|-------|-------|
| `ClassList` | `/teacher/classes` | Grid of the teacher's classes |
| `CreateClassForm` | `/teacher/classes/create` | Class creation form + enrollment code display |
| `ClassDetail` | `/teacher/classes/:id` | Dashboard + tabs (students, assignments) |
| `EditClassForm` | `/teacher/classes/:id/edit` | Update class details |
| `StudentTable` | `/teacher/classes/:id/students` | Student list + average score |
| `EnrollDialog` | `/student/classes` | Dialog for entering an enrollment code |
| `ClassCard` | `/student/classes` | Card showing a joined class |

---

## 6. Business Rules

| Rule | Details |
|------|---------|
| Enrollment code | 8 characters, using only `A-Z` and `2-9` (avoids 0/O and 1/I confusion) |
| Unique per class | Each class has one enrollment code; codes are never reused |
| One enrollment | A student can only enroll once per class (unique constraint) |
| Drop = soft delete | Enrollment status → 'dropped'; the record is not deleted |
| Re-enroll | A student who dropped can re-enroll with the same code |
| Archive class | Teacher archives → the class closes and no new students can enroll |
| Teacher owns | Only the class's own teacher can PATCH or archive it |

---

## 7. Quick API Reference

| Method | Endpoint | Role | Description |
|--------|----------|------|-------|
| `POST` | `/classes` | Teacher | Create a class |
| `GET` | `/classes` | Teacher | List their own classes |
| `GET` | `/classes/:id` | All | Class detail |
| `PATCH` | `/classes/:id` | Teacher | Update |
| `POST` | `/classes/:id/archive` | Teacher | Archive |
| `GET` | `/classes/:id/students` | Teacher | Student list |
| `GET` | `/classes/:id/dashboard` | Teacher | Dashboard stats |
| `GET` | `/classes/:id/assignments` | All | The class's assignments |
| `POST` | `/classes/enroll` | Student | Join a class |
| `PATCH` | `/classes/:id/leave` | Student | Leave a class |
| `GET` | `/users/me/classes` | Student | Classes they have joined |
