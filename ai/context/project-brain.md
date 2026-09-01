# Project Brain — HSK Learning Platform

> 1-page context summary for AI tools. Do NOT copy content here — link to docs/.
> Keep this file < 100 lines.

---

## What is this?

HSK Learning Platform — web app for Chinese language learning (HSK 1–9).
Stack: Next.js 14 (App Router) + NestJS monolith + PostgreSQL (Supabase) + MongoDB Atlas.
Three actors: Admin, Teacher, Student.

⚠️ **SCOPE-02 is open**: every doc in the repo describes a multi-role LMS, while
`PROJECT_KNOWLEDGE.md` §8 (F9–F16) describes single-user self-study. Its source files
(`backend/data/content/`) are **not in this repo** (`DOC-011`) — find them before planning
either way.

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
| **Whole-project reference** (schema, flows, roadmap) | PROJECT_KNOWLEDGE.md |
| **Open conflicts register** — read before trusting a fact | PROJECT_KNOWLEDGE.md §9 |
| **Built-in learning content (F9–F16)** ⚠️ unverified, see DOC-011 | PROJECT_KNOWLEDGE.md §8 |
| **Starting a Cowork/chat session** | COWORK_BOOTSTRAP.md |
| **AI coding rules** (read before touching routes/DB/API) | ai/rules/working-rules.md |
| **Known bugs / technical debt** | ai/known-issues/KNOWN_ISSUES.md |
| **Most recent session notes** | ai/context/HANDOFF.md |

> ⚠️ `archive/` (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) contains old, outdated documents — DO NOT use as a reference.

## Architecture Summary

- NestJS monolith, 5 layers: Controller → Guard → Service → Repository → DB
- PostgreSQL: relational data (users, classes, payroll, invoices)
- MongoDB: flexible schema (questions with multiple types, flashcards, SRS states)
- Auth: JWT Access (15min, memory) + Refresh (7d, httpOnly cookie)
- AI: Gemini for writing score suggestions
- Storage: ⚠️ **CR-3 unresolved** — Supabase Storage (audio, avatar) here, in `BACKEND_PLAN.md`,
  the architecture diagram, all `FEATURES_*.md` and the accepted `01-auth.md` spec; **Cloudinary**
  in `TECH_STACK.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` and the entity specs. Evidence
  favours Supabase; the owner still has to pick. Both agree on Cloudflare R2 for video
- Payment: VietQR + manual reconciliation by admin

## Current Status

- Docs are **far ahead of code**. 8 backend module specs (168 invariants) exist; only
  `01-auth.md` is accepted. `apps/api` is scaffolded (PR #12: NestJS, Prisma, migration
  `20260820000000_init_users`, health module) but implements no feature. `apps/web` has many
  **fully-mocked** admin and student screens — see `ai/PROGRESS.md` § Off-sprint
- `turbo.json` now tracked (`BUILD-001` resolved, PR #13, pending merge to `main`); `packages/` does not exist
- HSK level range: **1–9** (confirmed 2026-08-11, matches the HSK 3.0 standard and every spec in `docs/`: entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md` — do not use HSK 1–6, that came from a mistaken revert in this file on 2026-07-27)
- **10-sprint plan (S0–S9)** in docs/roadmap/SPRINT_PLAN.md — that is the authority.
  `ai/PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 still use an 8-sprint shape (`DOC-012`)
