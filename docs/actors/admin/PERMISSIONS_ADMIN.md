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

---

## NestJS Guard

```typescript
@Roles(Role.ADMIN)
// applied to: /admin/* routes
```

## Related

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md) — the full matrix
- [FEATURES_ADMIN.md](./FEATURES_ADMIN.md) — feature list
