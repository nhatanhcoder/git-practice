# Project Brain — HSK Learning Platform

> 1-page context summary for AI tools. Do NOT copy content here — link to docs/.
> Keep this file < 100 lines.

---

## What is this?

HSK Learning Platform — web app for Chinese language learning (HSK 1-9).  
Stack: Next.js 14 (App Router) + NestJS monolith + PostgreSQL (Supabase) + MongoDB Atlas.  
Three actors: Admin, Teacher, Student.

## Key Docs

| Need | Read |
|------|------|
| Full feature list by role | docs/actors/{admin,teacher,student}/FEATURES_*.md |
| Permissions / RBAC | docs/shared/RBAC_MATRIX.md |
| Database schema overview | docs/shared/DATABASE_SCHEMA.md |
| Entity field details | docs/entities/_INDEX.md |
| API contracts | docs/api/ |
| Cross-actor flows (sequence) | docs/flows/ |
| Architecture decisions (ADR) | docs/shared/decisions/ |
| Sprint plan + progress | docs/roadmap/SPRINT_PLAN.md |
| Glossary | docs/shared/GLOSSARY.md |
| **AI coding rules** (đọc trước khi sửa route/DB/API) | ai/rules/coding-rules.md |
| **Known bugs / technical debt** | ai/known-issues/KNOWN_ISSUES.md |
| **Ghi chú phiên làm việc gần nhất** | ai/context/HANDOFF.md |

> ⚠️ `archive/` (feature.md, feature-root.md, PROJECT_SUMMARY.md) là tài liệu cũ, lỗi thời — KHÔNG dùng làm nguồn tham khảo.

## Architecture Summary

- NestJS monolith, 5 layers: Controller → Guard → Service → Repository → DB
- PostgreSQL: relational data (users, classes, payroll, invoices)
- MongoDB: flexible schema (questions 8+ types, flashcards, SRS states)
- Auth: JWT Access (15min, memory) + Refresh (7d, httpOnly cookie)
- AI: Gemini for writing score suggestions
- Storage: Supabase Storage (audio, avatar), Cloudflare R2 (video)
- Payment: VietQR + manual reconciliation by admin

## Current Status

- Docs restructured, implementation not started
- HSK level range: **1–9** (confirmed 2026-07-19, matches all entity specs)
- See docs/roadmap/SPRINT_PLAN.md for 10-sprint plan (S0–S9)
