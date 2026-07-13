# 🔔 NOTIFICATION_FLOW.md — Hệ thống Thông báo

> **Sprint**: S6 — Payroll + Invoicing + Notifications  
> **Module**: NotificationsModule (NestJS)  
> **Entity**: Notification (PostgreSQL)  
> **Strategy**: Polling (không dùng WebSocket)

---

## 1. Tổng quan

Notifications là hệ thống thông báo 1 chiều (server → client). Dùng **polling** thay vì WebSocket để đơn giản hóa:
- Frontend poll mỗi 60 giây để fetch unread notifications
- Badge hiển thị số thông báo chưa đọc trên Navbar
- Dropdown panel xem danh sách và đánh dấu đã đọc

---

## 2. Notification Types & Triggers

| Type | Trigger | Recipient |
|------|---------|-----------|
| `new_assignment` | Teacher publish assignment | Tất cả students trong class |
| `deadline_reminder` | 24h trước dueDate (cron job) | Students chưa nộp bài |
| `grading_required` | Student submit bài có writing | Teacher của class |
| `graded` | Teacher/AI grade xong tất cả câu | Student |
| `weak_student_alert` | Analytics detect điểm < 50% | Teacher |
| `account_approved` | Admin approve user | User |
| `account_suspended` | Admin suspend user | User |
| `session_submitted` | Teacher submit session | Admin |
| `session_approved` | Admin approve session | Teacher |
| `session_rejected` | Admin reject session | Teacher |
| `payroll_finalized` | Admin finalize payroll period | Teacher |
| `invoice_created` | Admin tạo hóa đơn | Student |

---

## 3. Data Model

```typescript
// Notification entity (PostgreSQL)
interface Notification {
  id: string;
  recipientId: string;       // Who receives
  senderId?: string;         // Who triggered (null = system)
  type: NotificationType;
  message: string;           // Human-readable message (Vietnamese)
  data?: Record<string, any>; // Extra context (assignmentId, sessionId, etc.)
  readAt?: Date;             // null = unread
  createdAt: Date;
}
```

---

## 4. Backend Implementation

### 4.1 NotificationsService

```typescript
// modules/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {

  async create(dto: CreateNotificationDto): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        senderId: dto.senderId,
        type: dto.type,
        message: dto.message,
        data: dto.data ?? {},
      }
    });
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<void> {
    await this.prisma.notification.createMany({ data: dtos });
  }

  async getForUser(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { recipientId: userId } })
    ]);

    return { notifications, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, readAt: null }
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId, readAt: null },
      data: { readAt: new Date() }
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() }
    });
  }
}
```

### 4.2 Gửi Bulk Notifications (new_assignment)

```typescript
// assignments.service.ts — khi teacher publish assignment
async publishAssignment(assignmentId: string, teacherId: string) {
  const assignment = await this.findByIdOrThrow(assignmentId, teacherId);

  // Cập nhật status
  await this.prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: 'published' }
  });

  // Lấy tất cả active students trong class
  const enrollments = await this.prisma.classEnrollment.findMany({
    where: { classId: assignment.classId, status: 'active' },
    include: { student: true }
  });

  // Gửi notification cho từng student
  await this.notificationsService.createBulk(
    enrollments.map(e => ({
      recipientId: e.studentId,
      senderId: teacherId,
      type: 'new_assignment',
      message: `Bài tập mới: "${assignment.title}" đã được giao`,
      data: { assignmentId: assignment.id, classId: assignment.classId }
    }))
  );
}
```

### 4.3 Deadline Reminder Cron Job

```typescript
// modules/notifications/notification.cron.ts
@Injectable()
export class NotificationCronService {

  @Cron(CronExpression.EVERY_DAY_AT_8AM)  // 8:00 AM hàng ngày
  async sendDeadlineReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Tìm assignments có dueDate trong 24h tới
    const upcomingAssignments = await this.prisma.assignment.findMany({
      where: {
        dueDate: { gte: tomorrow, lt: dayAfter },
        status: 'published'
      },
      include: {
        class: {
          include: {
            enrollments: { where: { status: 'active' } }
          }
        }
      }
    });

    for (const assignment of upcomingAssignments) {
      // Tìm students chưa nộp bài
      const submittedStudentIds = await this.prisma.attempt.findMany({
        where: { assignmentId: assignment.id, status: { not: 'in_progress' } },
        select: { userId: true }
      }).then(a => a.map(x => x.userId));

      const pendingStudents = assignment.class.enrollments
        .filter(e => !submittedStudentIds.includes(e.studentId));

      if (pendingStudents.length > 0) {
        await this.notificationsService.createBulk(
          pendingStudents.map(e => ({
            recipientId: e.studentId,
            type: 'deadline_reminder',
            message: `Bài tập "${assignment.title}" sẽ hết hạn vào ngày mai!`,
            data: { assignmentId: assignment.id }
          }))
        );
      }
    }
  }
}
```

---

## 5. Frontend Implementation

### 5.1 Polling Hook

```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  const { data: unreadCount, refetch } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60_000,  // Poll every 60 seconds
    refetchIntervalInBackground: false,  // Stop when tab not focused
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ page: 1, limit: 20 }),
    enabled: false,  // Only fetch when panel is opened
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => refetch(),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => refetch(),
  });

  return { unreadCount, notifications, markAsRead, markAllAsRead };
}
```

### 5.2 Notification Bell Component

```
Navbar (top right):
┌─────────────────────────────────────────────────────┐
│  🏠 HSK Platform        🔔 [3]    👤 Nguyễn Văn A  │
└─────────────────────────────────────────────────────┘

Khi click vào 🔔:
┌─────────────────────────────────────────┐
│ Thông báo                [Đọc tất cả]  │
├─────────────────────────────────────────┤
│ 🔵 Bài tập mới: "Mock Test HSK3"       │
│    10 phút trước                        │
├─────────────────────────────────────────┤
│ 🔵 Buổi học 08/07 đã được duyệt        │
│    2 giờ trước                          │
├─────────────────────────────────────────┤
│    Bài tập "Assignment 2" đã chấm xong │
│    Hôm qua                              │
├─────────────────────────────────────────┤
│         [Xem tất cả thông báo →]       │
└─────────────────────────────────────────┘
```

---

## 6. API Reference

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/notifications` | All | Danh sách (paginated) |
| `GET` | `/notifications/unread-count` | All | Số chưa đọc |
| `PATCH` | `/notifications/:id/read` | All | Đánh dấu đã đọc |
| `PATCH` | `/notifications/read-all` | All | Đọc tất cả |

---

## 7. Design Decisions

| Quyết định | Lý do |
|-----------|-------|
| **Polling (60s) thay vì WebSocket** | Solo dev — WebSocket cần thêm infrastructure (Redis pub/sub). Polling đủ cho use case hiện tại |
| **Không push email** | MVP scope; có thể thêm email service (Resend, SendGrid) ở Sprint 7+ |
| **Không delete notifications** | Giữ lịch sử; dùng `readAt` để phân biệt đọc/chưa đọc |
| **data JSON field** | Flexible extra context; FE dùng để navigate đến đúng page |
| **createBulk cho class-wide** | Tránh N+1 khi gửi cho nhiều students cùng lúc |

---

## 8. Technical Debt

- [ ] **[DEBT]** Polling tạo DB load khi có nhiều users online đồng thời. Cân nhắc SSE (Server-Sent Events) nếu scale
- [ ] **[FUTURE]** Email notifications cho deadline reminders quan trọng
- [ ] **[FUTURE]** Push notifications (PWA) cho mobile users
