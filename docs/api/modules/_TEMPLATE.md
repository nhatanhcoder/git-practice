# MODULE SPEC TEMPLATE — bắt buộc theo đúng thứ tự mục này

---
module: <tên>
status: accepted | proposed | deferred
blocked_by: <ADR/quyết định, hoặc ->
owner: <->
last_updated: 2026-08-19
---

## 0. Tóm tắt
2-3 câu: module này chịu trách nhiệm gì, ranh giới ở đâu.

## 1. Bảng chạm tới
Bảng | Đọc/Ghi | Ghi chú

## 2. Endpoints
Method | Path | Role | Mô tả | Trạng thái (defined/proposed)
Path đầy đủ, có prefix /api/v1.

## 3. DTO
### Request
Từng field: tên · kiểu · bắt buộc · ràng buộc validate
### Response
Bọc trong { "data": ... }. List thì có "meta".

## 4. Rule nghiệp vụ (invariant)
Đánh số INV-<MODULE>-01... Mỗi invariant là một câu khẳng định luôn đúng.
Đây là danh sách mà mục 15 (test matrix) phải phủ hết.

## 5. Ownership / RBAC
Kiểm ở service layer, không chỉ role guard. Ghi rõ câu điều kiện.

## 6. State machine
Trạng thái, chuyển đổi hợp lệ, cổng một chiều. Vẽ dạng text.

## 7. Transaction boundary
Thao tác nào phải nằm trong CÙNG một transaction. Ghi rõ mức isolation nếu cần.

## 8. Idempotency & concurrency
Request lặp thì sao. Hai request đồng thời thì sao. Khoá nào, unique constraint nào.

## 9. Error → mã lỗi
Nhánh lỗi | HTTP | code | Trạng thái code (có trong API_ERROR_CODES.md / proposed)
KHÔNG được bịa mã mới.

## 10. Side effect & notification
Hành động nào sinh Notification type nào, gửi cho ai.

## 11. Index & query
Index cần cho filter/sort/phân trang. Query nào có nguy cơ N+1.

## 12. Migration & seed
Migration này thêm/sửa gì. Seed cần gì để test.

## 13. Security & rate limit
Giới hạn, dữ liệu nhạy cảm KHÔNG được trả ra, audit.

## 14. Observability
Log gì, đo gì.

## 15. Test matrix
INV | Loại test (service/integration/DB thật) | Mô tả
Mọi INV ở mục 4 phải xuất hiện ở đây. Đây là invariant gate.

## 16. Chưa chốt
Câu hỏi | Chặn gì | Owner | Cần quyết trước ngày
