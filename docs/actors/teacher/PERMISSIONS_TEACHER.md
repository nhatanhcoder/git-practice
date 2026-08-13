# 👩‍🏫 Teacher — Permissions

> Specific Teacher permissions. Full source of truth: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Summary

Teachers can **create and manage content** (classes, questions, assignments) and **view data for their own classes**. They have no permissions over finances or other teachers' class data.

---

## Permissions by Resource

### Classes (own only)
- ✅ Create / update / archive a class
- 🔒 Read the class and its student list (only classes they teach)
- 🔒 Regenerate the enrollmentCode

### Questions
- ✅ Create / update / delete a question (any question they created)
- ✅ Read the question bank

### Assignments (own class only)
- 🔒 Create / update / delete an assignment
- 🔒 Read submissions for their own classes

### Grading
- 🔒 Grade an attempt (own classes only)
- 🔒 Read the attempt and its answers

### Sessions (own class only)
- 🔒 Create / log / submit a session
- 🔒 Mark attendance

### Income
- 🔒 Read their own PayrollPeriod
- 🔒 Read their own TeacherPayRate

### Users
- ❌ Cannot read another user's profile
- 🔒 Own profile only

---

## Ownership Check

```typescript
// Service-level check (in addition to the @Roles guard)
if (assignment.teacherId !== req.user.id) {
  throw new ForbiddenException();
}
```

## Related

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)
- [FEATURES_TEACHER.md](./FEATURES_TEACHER.md)
