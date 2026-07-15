---
name: "Code Review"
description: "Hướng dẫn review code theo team convention: checklist quality gates, naming, architecture compliance, và common pitfalls cho HSK Learning Platform."
---

# Code Review Skill

> Skill này được load tự động khi task liên quan đến review code, PR review, hoặc quality check.

---

## Checklist Review

### 1. Cấu trúc & Naming
- [ ] File đặt tên theo convention: `<feature>.module.ts`, `<feature>.service.ts`, `<feature>.controller.ts`
- [ ] DTOs: `create-<entity>.dto.ts`, `update-<entity>.dto.ts`
- [ ] Mongoose schemas: `<entity>.schema.ts` trong `src/mongodb/schemas/`

### 2. RBAC & Security
- [ ] Đã check `docs/shared/RBAC_MATRIX.md` trước khi thêm/sửa route
- [ ] Guard đúng role + ownership check trong service layer
- [ ] Access token chỉ ở memory (Zustand), refresh token trong httpOnly cookie
- [ ] Không hardcode secret, API key trong code

### 3. Database
- [ ] PostgreSQL dùng Prisma, không raw SQL (trừ khi profiling yêu cầu)
- [ ] MongoDB dùng Mongoose, schema trong `src/mongodb/schemas/`
- [ ] Cross-DB flow có xử lý partial failure (không có cross-DB transaction)
- [ ] `questionIds` = MongoDB ObjectId strings stored as JSON array trong Postgres

### 4. API
- [ ] Response đúng envelope format (`docs/api/API_CONVENTIONS.md`)
- [ ] Error code lấy từ `docs/api/API_ERROR_CODES.md` — không tự tạo code mới
- [ ] DateTime = UTC ISO 8601

### 5. Testing
- [ ] Service method mới → có unit test
- [ ] API route mới → có integration test
- [ ] Test config theo `docs/testing/TEST_STRATEGY.md`

### 6. Docs
- [ ] Feature docs đã update nếu có thay đổi behavior
- [ ] SYSTEM_OVERVIEW.md đã update nếu có feature/API mới
- [ ] KNOWN_ISSUES.md đã update nếu phát hiện limitation mới

---

## Common Pitfalls

1. **Quên ownership check**: Guard chỉ check role, nhưng student A có thể truy cập data của student B nếu thiếu ownership check trong service.
2. **Cross-DB orphan data**: Create ở MongoDB thành công nhưng link ở PostgreSQL fail → có orphan records. Cần cleanup strategy.
3. **Token trong localStorage**: KHÔNG được lưu access token vào localStorage — chỉ Zustand (memory).
4. **Invent error codes**: Luôn dùng code từ `API_ERROR_CODES.md`, không tự nghĩ ra.
