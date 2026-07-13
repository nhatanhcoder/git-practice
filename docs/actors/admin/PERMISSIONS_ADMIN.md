# 👨‍💼 Admin — Permissions

> Quyền cụ thể của Admin. Nguồn sự thật đầy đủ: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Tóm tắt

Admin có **quyền cao nhất** trên platform, ngoại trừ: Admin không tạo nội dung học thuật (câu hỏi, assignment) và không làm bài thi.

---

## Quyền theo Resource

### Users
- ✅ List tất cả users (mọi role)
- ✅ Read profile bất kỳ user
- ✅ Approve / Suspend user (`status` change)
- ✅ Update own profile

### Finance
- ✅ Set `TeacherPayRate` cho bất kỳ teacher
- ✅ Set `StudentTuitionRate` cho bất kỳ student
- ✅ Create / Void `StudentInvoice`
- ✅ Record `TuitionPayment`
- ✅ Create / Finalize / Pay `PayrollPeriod`

### Sessions
- ✅ Approve / Reject `ClassSession` (bất kỳ class)
- 👁️ Read tất cả sessions (read-only)

### Notifications
- ✅ Receive notifications: session pending, new user pending

### Classes / Questions / Assignments
- ❌ Không tạo/sửa/xóa (đây là quyền Teacher)

---

## NestJS Guard

```typescript
@Roles(Role.ADMIN)
// áp dụng cho: /admin/* routes
```

## Liên quan

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md) — ma trận đầy đủ
- [FEATURES_ADMIN.md](./FEATURES_ADMIN.md) — danh sách tính năng
