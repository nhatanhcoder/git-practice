# 🔔 NOTIFICATION_FLOW.md — Notification System

> **Sprint**: S6 — Payroll + Invoicing + Notifications  
> **Module**: NotificationsModule (NestJS)  
> **Entity**: Notification (PostgreSQL)  
> **Strategy**: Polling (no WebSocket)

---

## 1. Overview

Notifications are a one-way system (server → client). We use **polling** rather than WebSocket to keep things simple:
- The frontend polls every 60 seconds for unread notifications
- A badge in the Navbar shows the unread count
- A dropdown panel lists them and marks them read

---

## 2. Notification Types & Triggers

| Type | Trigger | Recipient |
|------|---------|-----------|
| `new_assignment` | Teacher publishes an assignment | All students in the class |
| `deadline_reminder` | 24h before dueDate (cron job) | Students who have not submitted |
| `grading_required` | Student submits work containing writing | The class's teacher |
| `graded` | Teacher/AI finishes grading every question | Student |
| `weak_student_alert` | Analytics detects a score < 50% | Teacher |
| `account_approved` | Admin approve user | User |
| `account_suspended` | Admin suspend user | User |
| `session_submitted` | Teacher submit session | Admin |
| `session_approved` | Admin approve session | Teacher |
| `session_rejected` | Admin reject session | Teacher |
| `payroll_finalized` | Admin finalize payroll period | Teacher |
| `invoice_created` | Admin creates an invoice | Student |

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

### 4.2 Sending Bulk Notifications (new_assignment)

```typescript
// assignments.service.ts — when a teacher publishes an assignment
async publishAssignment(assignmentId: string, teacherId: string) {
  const assignment = await this.findByIdOrThrow(assignmentId, teacherId);

  // Update the status
  await this.prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: 'published' }
  });

  // Fetch every active student in the class
  const enrollments = await this.prisma.classEnrollment.findMany({
    where: { classId: assignment.classId, status: 'active' },
    include: { student: true }
  });

  // Send a notification to each student (message copy is Vietnamese UI text)
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

  @Cron(CronExpression.EVERY_DAY_AT_8AM)  // 8:00 AM daily
  async sendDeadlineReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find assignments whose dueDate falls in the next 24h
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
      // Find students who have not submitted
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

Clicking 🔔 opens (mockup shows the Vietnamese UI as built):
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

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------|
| `GET` | `/notifications` | All | List (paginated) |
| `GET` | `/notifications/unread-count` | All | Unread count |
| `PATCH` | `/notifications/:id/read` | All | Mark as read |
| `PATCH` | `/notifications/read-all` | All | Mark all as read |

---

## 7. Design Decisions

| Decision | Reason |
|-----------|-------|
| **Polling (60s) instead of WebSocket** | Solo dev — WebSocket needs extra infrastructure (Redis pub/sub). Polling is sufficient for the current use case |
| **No email push** | MVP scope; an email service (Resend, SendGrid) can be added in Sprint 7+ |
| **Notifications are never deleted** | Preserves history; `readAt` distinguishes read from unread |
| **`data` JSON field** | Flexible extra context; the frontend uses it to navigate to the right page |
| **createBulk for class-wide sends** | Avoids N+1 when notifying many students at once |

---

## 8. Technical Debt

- [ ] **[DEBT]** Polling adds DB load when many users are online at once. Consider SSE (Server-Sent Events) if this scales up
- [ ] **[FUTURE]** Email notifications for important deadline reminders
- [ ] **[FUTURE]** Push notifications (PWA) for mobile users
