# 🗺️ SPRINT_PLAN.md — Kế hoạch Sprint Chi tiết

> Tham khảo `implementation_plan.md` để xem kế hoạch đầy đủ.  
> File này là **living document** — cập nhật sau mỗi sprint.

---

## Tổng quan Timeline

| Sprint | Tuần | Focus | Status |
|--------|------|-------|--------|
| **S0** | 1–2 | Foundation: Monorepo, DB, CI/CD | 🔲 Not Started |
| **S1** | 3–4 | Auth + User Management | 🔲 Not Started |
| **S2** | 5–6 | Classes + Enrollment | 🔲 Not Started |
| **S3** | 7–8 | Questions + Assignments | 🔲 Not Started |
| **S4** | 9–10 | Exam Engine + AI Grading | 🔲 Not Started |
| **S5** | 11–12 | SRS Flashcards + Analytics | 🔲 Not Started |
| **S6** | 13–14 | Payroll + Invoicing + Notifications | 🔲 Not Started |
| **S7** | 15–16 | Testing + Polish + Launch | 🔲 Not Started |

---

## Sprint 0 — Foundation (Tuần 1-2)

### Tài liệu cần đọc trước:
- [x] `docs/architecture/ARCHITECTURE.md`
- [x] `docs/setup/ENVIRONMENT_SETUP.md`
- [x] `docs/shared/TECH_STACK.md`
- [x] `docs/shared/CONVENTIONS.md`

### Tasks:

#### Repo & Tooling
- [ ] Tạo GitHub repo `hsk-platform`
- [ ] Setup monorepo: `pnpm-workspace.yaml`
- [ ] Config Turborepo (`turbo.json`)
- [ ] `packages/shared-types`: TypeScript shared interfaces
- [ ] Root ESLint + Prettier config
- [ ] Husky + lint-staged

#### Backend (NestJS)
- [ ] `nest new apps/api --package-manager pnpm`
- [ ] Install dependencies: jwt, passport, prisma, mongoose, swagger, config, throttler, helmet
- [ ] `ConfigModule` setup
- [ ] `PrismaModule` + `PrismaService`
- [ ] `MongooseModule` config
- [ ] Global `ValidationPipe`
- [ ] Global `HttpExceptionFilter`
- [ ] Global `TransformInterceptor` (ApiResponse wrapper)
- [ ] Swagger setup (`/api` route)
- [ ] Health check endpoint (`GET /health`)

#### Frontend (Next.js)
- [ ] `create-next-app apps/web --typescript --tailwind --app`
- [ ] Install: shadcn/ui init, zustand, @tanstack/react-query, axios
- [ ] Axios instance với interceptors
- [ ] Root providers (QueryClientProvider, ThemeProvider)
- [ ] `authStore` (Zustand) skeleton

#### Database
- [ ] Supabase project creation
- [ ] MongoDB Atlas cluster setup
- [ ] Copy + adapt `prisma/schema.prisma`
- [ ] `prisma migrate dev --name init`
- [ ] Mongoose schemas (Question, Flashcard, UserFlashcardState)
- [ ] Seed script skeleton

#### CI/CD
- [ ] `.github/workflows/ci.yml`
- [ ] Vercel project link
- [ ] Railway project setup

### Definition of Done S0:
- `http://localhost:3000` → Next.js renders
- `http://localhost:3001/api` → Swagger UI
- `http://localhost:3001/health` → `{ status: "ok" }`
- GitHub Actions xanh khi push

---

## Sprint 1 — Auth & Users (Tuần 3-4)

### Tài liệu cần đọc:
- [ ] `docs/architecture/AUTH_FLOW.md`
- [ ] `docs/shared/API_ERROR_CODES.md`

### Tasks:

#### Backend
- [ ] `AuthModule`: register, login, refresh, logout
- [ ] `JwtStrategy` + `JwtAuthGuard`
- [ ] `RefreshJwtStrategy` + `RolesGuard`
- [ ] `@CurrentUser()` decorator
- [ ] `@Roles()` decorator
- [ ] `@Public()` decorator (bypass auth)
- [ ] `UsersModule`: GET/PATCH /users/me, POST /users/me/avatar
- [ ] `AdminModule`: GET/PATCH /admin/users/:id/approve|suspend

#### Frontend
- [ ] `/login` page
- [ ] `/register` page (role selector)
- [ ] `middleware.ts` (route protection)
- [ ] `authStore` complete
- [ ] `useAuth` hook
- [ ] Dashboard layout (Sidebar + Navbar)
- [ ] Sidebar menu theo role
- [ ] `/admin/users` page
- [ ] Profile page

### Definition of Done S1:
- Register → Pending → Admin approve → Login → Đúng dashboard

---

## Sprint 2 — Classes (Tuần 5-6)

### Tài liệu cần đọc:
- [ ] `docs/features/CLASS_MANAGEMENT.md`
- [ ] `docs/architecture/DATABASE_SCHEMA.md` (Class, ClassEnrollment sections)

*(Xem implementation_plan.md cho chi tiết đầy đủ)*

---

## Sprint 3 — Questions & Assignments (Tuần 7-8)

### Tài liệu cần đọc:
- [ ] `docs/features/QUESTION_TYPES.md`

*(Xem implementation_plan.md)*

---

## Sprint 4 — Exam Engine (Tuần 9-10)

### Tài liệu cần đọc:
- [ ] `docs/architecture/EXAM_ENGINE.md`
- [ ] `docs/features/AI_FEATURES.md`

*(Xem implementation_plan.md)*

---

## Sprint 5 — SRS & Analytics (Tuần 11-12)

### Tài liệu cần đọc:
- [ ] `docs/architecture/SRS_ALGORITHM.md`
- [ ] `docs/features/ANALYTICS_FLOW.md`

*(Xem implementation_plan.md)*

---

## Sprint 6 — Financial & Notifications (Tuần 13-14)

### Tài liệu cần đọc:
- [ ] `docs/features/PAYROLL_FLOW.md`
- [ ] `docs/features/INVOICE_FLOW.md`
- [ ] `docs/features/NOTIFICATION_FLOW.md`
- [ ] `docs/features/SESSION_ATTENDANCE.md`

*(Xem implementation_plan.md)*

---

## Sprint 7 — Launch (Tuần 15-16)

### Tài liệu cần đọc:
- [ ] `docs/testing/TESTING_STRATEGY.md`
- [ ] `docs/setup/DEPLOYMENT.md`

*(Xem implementation_plan.md)*

---

## Sprint Retrospective Template

```markdown
## Sprint X Retrospective

### ✅ Đã hoàn thành
- ...

### ❌ Chưa hoàn thành / Chuyển sang sprint sau
- ...

### 🐛 Bugs phát hiện
- ...

### 📚 Lessons learned
- ...

### ⏭️ Sprint tiếp theo — Điều chỉnh
- ...
```
