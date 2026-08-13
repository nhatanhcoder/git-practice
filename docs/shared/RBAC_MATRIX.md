# 🔐 RBAC Matrix — Actor × Resource × Action

> **The single source of truth** for all permissions in the system.  
> Every route guard and API middleware must reference this document.  
> Per-actor permission details: see `docs/actors/<role>/PERMISSIONS_<ROLE>.md`

---

## Legend

| Symbol | Meaning |
|---------|-------|
| ✅ | Full access (own + others) |
| 🔒 | Own only (only the user's own data) |
| 👁️ | Read-only |
| ❌ | No access |

---

## Matrix overview

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
// NestJS: use the @Roles() decorator + RolesGuard
@Roles(Role.ADMIN)
@Get('users')
listAllUsers() { ... }

@Roles(Role.TEACHER)
@Post('questions')
createQuestion() { ... }

// Ownership check: use a custom guard or a service-level check
// e.g., assignment.teacherId === req.user.id
```

---

## Related

- [PERMISSIONS_ADMIN.md](../actors/admin/PERMISSIONS_ADMIN.md)
- [PERMISSIONS_TEACHER.md](../actors/teacher/PERMISSIONS_TEACHER.md)
- [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)
- [API_CONVENTIONS.md](../api/API_CONVENTIONS.md) — auth header, error 403
- [diagrams/rbac-matrix.mmd](../diagrams/rbac-matrix.mmd)
