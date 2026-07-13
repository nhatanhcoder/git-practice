# 🏦 Assignment Bank

> Phân biệt **Assignment gốc** (template có thể tái sử dụng) vs **Assignment instance** (đã giao cho 1 lớp cụ thể).

---

## Khái niệm

| Concept | Mô tả |
|---------|-------|
| **Assignment gốc** | Template do teacher tạo từ Question Bank. Chứa danh sách questionIds, skillType, type, timeLimitMinutes. Chưa gắn với lớp cụ thể. |
| **Assignment instance** | Assignment gốc được giao cho 1 lớp, có dueDate. Thực ra trong schema hiện tại, `Assignment` đã chứa cả `classId` — nên gốc và instance là cùng 1 record. |

---

## Hiện trạng Schema

```
Assignment {
  id, title, classId, teacherId,
  skillType: listening | reading | writing | mixed,
  type: homework | mock_test,
  timeLimitMinutes?: number,
  questionIds: string[],   // MongoDB Question._id[]
  dueDate?: DateTime,
  status: draft | published | archived
}
```

---

## Flows liên quan

- [FLOW_ASSIGNMENT_LIFECYCLE.md](../flows/FLOW_ASSIGNMENT_LIFECYCLE.md) — toàn bộ lifecycle
- [ENTITY_ASSIGNMENT.md](../entities/postgres/ENTITY_ASSIGNMENT.md) — schema chi tiết

---

## TODO

- [ ] Xem xét tách "Assignment template" (không có classId) vs "Assignment instance" (có classId) nếu cần tái sử dụng
- [ ] Versioning câu hỏi: nếu teacher sửa question sau khi assignment đã published → ảnh hưởng gì?
