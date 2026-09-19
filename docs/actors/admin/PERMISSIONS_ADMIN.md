# 👨‍💼 Admin — Permissions

> Specific Admin permissions. Full source of truth: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Summary

Admins hold the **highest privileges** on the platform, with two exceptions: an Admin does not author academic content (questions, assignments) and does not take exams.

---

## Permissions by Resource

### Users
- ✅ List all users (every role)
- ✅ Read any user's profile
- ✅ Approve / suspend a user (`status` change)
- ✅ Update their own profile

### Finance
- ✅ Set a `TeacherPayRate` for any teacher
- ✅ Set a `StudentTuitionRate` for any student
- ✅ Create / void a `StudentInvoice`
- ✅ Record a `TuitionPayment`
- ✅ Create / finalize / pay a `PayrollPeriod`

### Sessions
- ✅ Approve / reject a `ClassSession` (any class)
- 👁️ Read all sessions (read-only)

### Notifications
- ✅ Receive notifications: session pending, new user pending

### Classes / Questions / Assignments
- ❌ Cannot create, edit, or delete (these are Teacher permissions)
- 👁️ Read classes and student rosters (read-only audit, for session review and payroll calculation)

### Learning Catalog (moderation only)
- ✅ Approve / reject a submitted `LearningPath` (any teacher), suspend / restore an approved one
- ✅ Unpublish **any** published lesson on **any** path — including one published after its path was approved
- 👁️ Read every path and its lessons, including `draft` ones
- ❌ Cannot create, edit or delete a path or a lesson, and cannot change a lesson's words
- ❌ Cannot edit a published lesson's content — only remove it from view

---

## NestJS Guard

```typescript
@Roles(Role.ADMIN)
// applied to: /admin/* routes
```

## Related

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md) — the full matrix
- [FEATURES_ADMIN.md](./FEATURES_ADMIN.md) — feature list
