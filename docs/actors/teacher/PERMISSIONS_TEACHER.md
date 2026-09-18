# 👩‍🏫 Teacher — Permissions

> Specific Teacher permissions. Full source of truth: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Summary

Teachers can **create and manage content** (classes, lessons, questions, assignments) and **view data for their own classes**. They have no permissions over finances or other teachers' class data.

---

## Permissions by Resource

### Classes (own only)
- ✅ Create / update / archive a class
- 🔒 Read the class and its student list (only classes they teach)
- 🔒 Regenerate the enrollmentCode

### Lessons (own class only)
- 🔒 Create / update / delete / reorder a lesson (only in classes they teach)
- 🔒 Link / unlink an assignment to a lesson
- 🔒 Read lessons of their own classes

> Added 2026-09-03 with the Teacher module specs (`docs/api/modules/teacher/01-classes-lessons.md`).
> Ownership is inherited from the parent class — the same predicate as Classes, per
> `ENTITY_LESSON.md`.

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

### Learning Catalog (own paths only)
- 🔒 Create / edit / delete their own `LearningPath` and its lessons
- 🔒 Submit an own path for review; publish / unpublish an own lesson once the path is `approved`
- 🔒 Reference a published catalog unit — no edit right over it
- ❌ Cannot read or write another teacher's path or lessons (`LEARNING_PATH_ACCESS_DENIED`)
- ❌ Cannot approve, reject, suspend or restore a path — those are admin-only
- ❌ Cannot edit or delete a **published** lesson's words (`LEARNING_UNIT_PUBLISHED_IMMUTABLE`)
- ❌ Cannot write into a path while it is `pending_review` or `suspended` (`LEARNING_PATH_FROZEN`)
- ❌ No write to any student progress, SRS, Flashcard or Attempt row

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
