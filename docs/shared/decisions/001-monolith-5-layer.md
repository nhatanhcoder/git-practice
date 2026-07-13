# ADR-001: Monolith 5-Layer Architecture

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

Cần chọn kiến trúc phù hợp với team nhỏ (1-3 người), thời gian phát triển ngắn, và yêu cầu deploy lên free-tier. Các lựa chọn: microservices, monolith, monorepo.

## Decision

Dùng **NestJS monolith** chia 5 layer rõ ràng:
1. **Controller** — nhận HTTP request, validate DTO
2. **Service** — business logic
3. **Repository / Prisma** — database access
4. **Guard / Middleware** — auth, RBAC
5. **Module** — dependency injection boundary

## Consequences

**Positive:**
- Deploy đơn giản (1 instance trên Railway/Render free tier)
- Không cần service discovery, message broker
- Dễ refactor sang microservices sau này (module boundaries rõ)

**Negative:**
- Không scale horizontally theo từng feature
- Mọi feature cùng chung memory / process

## Alternatives Considered

| Option | Lý do không chọn |
|--------|-----------------|
| Microservices | Quá phức tạp cho team nhỏ, overhead ops lớn |
| Serverless functions | Khó maintain state, cold start cho NestJS |
