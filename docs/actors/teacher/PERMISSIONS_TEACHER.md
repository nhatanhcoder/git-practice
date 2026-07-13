# 👩‍🏫 Teacher — Permissions

> Quyền cụ thể của Teacher. Nguồn sự thật đầy đủ: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Tóm tắt

Teacher có quyền **tạo và quản lý nội dung** (lớp, câu hỏi, assignment) và **xem dữ liệu của lớp mình**. Không có quyền trên tài chính hoặc dữ liệu lớp người khác.

---

## Quyền theo Resource

### Classes (own only)
- ✅ Create / Update / Archive class
- 🔒 Read class + student list (chỉ class mình dạy)
- 🔒 Regenerate enrollmentCode

### Questions
- ✅ Create / Update / Delete question (bất kỳ question mình tạo)
- ✅ Read question bank

### Assignments (own class only)
- 🔒 Create / Update / Delete assignment
- 🔒 Read submissions của class mình

### Grading
- 🔒 Grade attempt (chỉ class mình)
- 🔒 Read attempt + answers

### Sessions (own class only)
- 🔒 Create / Log / Submit session
- 🔒 Mark attendance

### Income
- 🔒 Read own PayrollPeriod
- 🔒 Read own TeacherPayRate

### Users
- ❌ Không đọc được profile user khác
- 🔒 Own profile chỉ

---

## Ownership Check

```typescript
// Service-level check (ngoài @Roles guard)
if (assignment.teacherId !== req.user.id) {
  throw new ForbiddenException();
}
```

## Liên quan

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)
- [FEATURES_TEACHER.md](./FEATURES_TEACHER.md)
