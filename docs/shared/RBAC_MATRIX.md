# 🔐 RBAC Matrix — Actor × Resource × Action

> **Nguồn sự thật duy nhất** cho toàn bộ phân quyền hệ thống.  
> Mọi route guard, API middleware đều phải tham chiếu tài liệu này.  
> Chi tiết quyền từng actor: xem `docs/actors/<role>/PERMISSIONS_<ROLE>.md`

---

## Legend

| Ký hiệu | Nghĩa |
|---------|-------|
| ✅ | Full access (own + others) |
| 🔒 | Own only (chỉ data của mình) |
| 👁️ | Read-only |
| ❌ | No access |

---

## Ma trận tổng quan

| Resource | Action | Admin | Teacher | Student |
|----------|--------|-------|---------|---------|
| **User** | list all | ✅ | ❌ | ❌ |
| **User** | read own profile | ✅ | 🔒 | 🔒 |
| **User** | update own profile | ✅ | 🔒 | 🔒 |
| **User** | approve / suspend | ✅ | ❌ | ❌ |
| **Class** | create | ❌ | ✅ | ❌ |
| **Class** | read (own classes) | ❌ | 🔒 | 🔒 |
| **Class** | update / archive | ❌ | 🔒 | ❌ |
| **ClassEnrollment** | enroll (via code) | ❌ | ❌ | ✅ |
| **ClassEnrollment** | list (own class) | ❌ | 🔒 | 🔒 |
| **Question** | create / update / delete | ❌ | ✅ | ❌ |
| **Question** | read | ❌ | ✅ | 👁️ (in attempt) |
| **Assignment** | create / update / delete | ❌ | 🔒 | ❌ |
| **Assignment** | list (own class) | ❌ | 🔒 | 🔒 |
| **Attempt** | create / submit | ❌ | ❌ | 🔒 |
| **Attempt** | grade | ❌ | 🔒 | ❌ |
| **Attempt** | read (own) | ❌ | 👁️ | 🔒 |
| **ClassSession** | create / log | ❌ | 🔒 | ❌ |
| **ClassSession** | approve / reject | ✅ | ❌ | ❌ |
| **SessionAttendance** | mark | ❌ | 🔒 | ❌ |
| **SessionAttendance** | read own | ❌ | 🔒 | 🔒 |
| **TeacherPayRate** | set | ✅ | ❌ | ❌ |
| **PayrollPeriod** | create / finalize / pay | ✅ | ❌ | ❌ |
| **PayrollPeriod** | read own | ❌ | 🔒 | ❌ |
| **StudentTuitionRate** | set | ✅ | ❌ | ❌ |
| **StudentInvoice** | create | ✅ | ❌ | ❌ |
| **StudentInvoice** | read own | ❌ | ❌ | 🔒 |
| **TuitionPayment** | record | ✅ | ❌ | ❌ |
| **Flashcard** | read / study | ❌ | ❌ | ✅ |
| **UserFlashcardState** | read / update own | ❌ | ❌ | 🔒 |
| **Notification** | read own | ✅ | 🔒 | 🔒 |
| **Notification** | create (system) | ✅ (system) | ❌ | ❌ |

---

## Route Guard Implementation

```typescript
// NestJS: dùng @Roles() decorator + RolesGuard
@Roles(Role.ADMIN)
@Get('users')
listAllUsers() { ... }

@Roles(Role.TEACHER)
@Post('questions')
createQuestion() { ... }

// Ownership check: dùng custom guard hoặc service-level check
// e.g., assignment.teacherId === req.user.id
```

---

## Liên quan

- [PERMISSIONS_ADMIN.md](../actors/admin/PERMISSIONS_ADMIN.md)
- [PERMISSIONS_TEACHER.md](../actors/teacher/PERMISSIONS_TEACHER.md)
- [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)
- [API_CONVENTIONS.md](../api/API_CONVENTIONS.md) — auth header, error 403
- [diagrams/rbac-matrix.mmd](../diagrams/rbac-matrix.mmd)
