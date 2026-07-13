# ADR-002: Hybrid PostgreSQL + MongoDB

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

Platform cần lưu 2 loại dữ liệu rất khác nhau:
- Dữ liệu quan hệ chặt (users, enrollments, payroll, invoices) — ACID là bắt buộc
- Dữ liệu linh hoạt, schema biến đổi (câu hỏi 8+ sub-type, flashcard, SRS state) — cần document model

## Decision

**PostgreSQL via Supabase** cho relational data (Prisma ORM).  
**MongoDB Atlas** cho document data (Mongoose).

## Consequences

**Positive:**
- PostgreSQL: ACID, free-tier Supabase 500MB đủ dùng
- MongoDB: schema-free cho Question (8+ sub-types không cần migration), tốt cho nested content
- Cả hai đều có free-tier vĩnh viễn

**Negative:**
- Team cần biết 2 query language (Prisma + Mongoose)
- Không có cross-DB transaction
- `questionIds` trong Assignment lưu dạng JSON array → không thể join trực tiếp

## Alternatives Considered

| Option | Lý do không chọn |
|--------|-----------------|
| PostgreSQL only (JSONB) | JSONB query phức tạp, index kém hơn MongoDB cho nested |
| MongoDB only | Khó đảm bảo financial integrity, thiếu foreign key constraint |
| PlanetScale (MySQL) | Không hỗ trợ foreign key trên free tier |
