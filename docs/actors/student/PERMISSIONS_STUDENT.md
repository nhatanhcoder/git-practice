# 🎓 Student — Permissions

> Quyền cụ thể của Student. Nguồn sự thật đầy đủ: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Tóm tắt

Student có quyền **học tập** — xem và làm bài trong class mình tham gia, ôn SRS, xem hóa đơn. Không có quyền tạo nội dung hoặc xem data người khác.

---

## Quyền theo Resource

### Classes
- ✅ Join class bằng enrollmentCode
- 🔒 Read class mình đang tham gia
- ❌ Không tạo / sửa class

### Assignments
- 🔒 Read assignments của class mình
- 🔒 Tạo Attempt (1 attempt / assignment)
- 🔒 Submit own attempt
- 🔒 Read result sau khi graded

### Flashcards
- ✅ Read tất cả flashcards (theo HSK level)
- 🔒 Update own UserFlashcardState

### Finance
- 🔒 Read own StudentInvoice
- 🔒 Read own TuitionPayment history
- ❌ Không tạo payment (chỉ admin record)

### Profile
- 🔒 Read / Update own profile
- ❌ Không đọc profile người khác

### Notifications
- 🔒 Read own notifications

---

## Notes

- Student chỉ thấy assignments của class mà họ đang enrolled (status=active)
- Sau khi drop class (status=dropped): mất access assignment mới, giữ attempt cũ
- Attempt chỉ được tạo 1 lần / assignment (trừ khi teacher reset)

## Liên quan

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)
- [FEATURES_STUDENT.md](./FEATURES_STUDENT.md)
