# Project Brain — HSK Learning Platform

> 1-page context summary for AI tools. Do NOT copy content here — link to docs/.
> Keep this file < 100 lines.

---

## What is this?

HSK Learning Platform — web app for Chinese language learning (HSK 1–9).
Stack: Next.js 14 (App Router) + NestJS monolith + PostgreSQL (Supabase) + MongoDB Atlas.
Three actors: Admin, Teacher, Student.

✅ **SCOPE-02 resolved by ADR-016**: this is one product with two connected learning lanes —
class learning/Assignments and personal self-study. Teachers may assign platform catalog units
as supplemental practice; only an Assignment produces an official graded result. The source
content corpus remains external to this repo (`DOC-011`), so import/seed work is still blocked.

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
| **Combined LMS + self-study decision** | docs/shared/decisions/016-combined-student-learning-domain.md |
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

> Corrected 2026-09-08 from `docs/api/modules/_INDEX.md`, `apps/api/src/app.module.ts` and the
> recorded test runs — the previous text (written 2026-08-31) predated most of the backend.

- **Backend is real and broad** (not "scaffolded, no feature"): `apps/api` implements Auth (+refresh
  rotation & login rate limiting), Users admin-approval, Classes/Enrollment (teacher + student
  join/leave), Lessons, Sessions+Attendance, Payroll, Billing (invoices+payments), Dashboard/
  Monitoring, Question Bank (MongoDB), Flashcards/SRS (MongoDB). Teacher module specs
  (`docs/api/modules/teacher/`, 6 files) exist; Attempts/Grading and Notifications are not coded.
- **Spec status** (per `docs/api/modules/_INDEX.md`): accepted — 01, 02, 03, 04, 05, 06, 08
  (7 of 8); proposed — 07 Notifications. Teacher specs all `proposed`. Last recorded suite:
  170/170 across 27 suites (2026-09-06).
- `turbo.json` tracked and `main` verified green (PR #13 merged 2026-09-01; `BUILD-001` closed).
  `packages/` still does not exist — `packages/types` is the open shared-contract gap (`API-015`-adjacent; see PROGRESS § Needs from the other lane)
- HSK level range: **1–9** (confirmed 2026-08-11, matches the HSK 3.0 standard and every spec in `docs/`: entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md` — do not use HSK 1–6, that came from a mistaken revert in this file on 2026-07-27)
- **10-sprint plan (S0–S9)** in docs/roadmap/SPRINT_PLAN.md — that is the authority.
  `ai/PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 still use an 8-sprint shape (`DOC-012`)
- FE: admin + teacher areas wired to real endpoints; student area mid-migration (Hán Lộ UI,
  A01–A08 slice work); several student screens still mocked — trust `ai/PROGRESS.md` per-item notes
  over any blanket claim
