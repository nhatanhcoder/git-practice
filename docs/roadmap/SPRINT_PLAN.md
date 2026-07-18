# 🗺️ SPRINT_PLAN.md — Kế hoạch Sprint Chi tiết

> **Living document** — cập nhật sau mỗi sprint.  
> Source of truth features: [FEATURES_STUDENT.md](../actors/student/FEATURES_STUDENT.md) | [FEATURES_TEACHER.md](../actors/teacher/FEATURES_TEACHER.md) | [FEATURES_ADMIN.md](../actors/admin/FEATURES_ADMIN.md)  
> Entity specs: [entities/_INDEX.md](../entities/_INDEX.md)

---

## Tổng quan Timeline

| Sprint | Tuần | Focus | Entities mới | Status |
|--------|------|-------|--------------|--------|
| **S0** | 1–2 | Foundation: Monorepo, DB, CI/CD | — | 🔲 Not Started |
| **S1** | 3–4 | Auth + User Management (Admin) | `User`, `Notification` | 🔲 Not Started |
| **S2** | 5–6 | Classes + Enrollment + Lesson Management | `Class`, `ClassEnrollment`, `Lesson`, `LessonAssignment` | 🔲 Not Started |
| **S3** | 7–8 | Question Bank + Assignment Creation | `Question`, `Assignment` | 🔲 Not Started |
| **S4** | 9–10 | Exam Engine + AI Grading | `Attempt`, `AttemptAnswer` | 🔲 Not Started |
| **S5** | 11–12 | SRS Flashcards + Word Bank + Analytics | `Flashcard`, `UserFlashcardState`, `UserSavedWord` | 🔲 Not Started |
| **S6** | 13–14 | Sessions + Attendance + Payroll | `ClassSession`, `SessionAttendance`, `TeacherPayRate`, `PayrollPeriod` | 🔲 Not Started |
| **S7** | 15–16 | Invoicing + Notifications full | `StudentTuitionRate`, `StudentInvoice`, `TuitionPayment` | 🔲 Not Started |
| **S8** | 17–18 | Skill Drill + Quiz Room + Leaderboard | `QuizRoom`, `QuizParticipant` | 🔲 Not Started |
| **S9** | 19–20 | Testing + Polish + Launch | — | 🔲 Not Started |

---

## Sprint 0 — Foundation (Tuần 1–2)

### Tài liệu cần đọc trước:
- [ ] `docs/shared/TECH_STACK.md`
- [ ] `docs/shared/CONVENTIONS.md`

### Tasks:

#### Repo & Tooling
- [ ] Tạo GitHub repo
- [ ] Setup monorepo: `pnpm-workspace.yaml` + Turborepo `turbo.json`
- [ ] `packages/shared-types`: TypeScript shared interfaces
- [ ] Root ESLint + Prettier + Husky + lint-staged

#### Backend (NestJS)
- [ ] `nest new apps/api --package-manager pnpm`
- [ ] Dependencies: `@nestjs/jwt`, `passport`, `@prisma/client`, `mongoose`, `@nestjs/swagger`, `class-validator`, `helmet`, `throttler`
- [ ] `ConfigModule`, `PrismaModule`, `MongooseModule`
- [ ] Global: `ValidationPipe`, `HttpExceptionFilter`, `TransformInterceptor`
- [ ] Swagger at `/api`, health check at `GET /health`

#### Frontend (Next.js)
- [ ] `create-next-app apps/web --typescript --tailwind --app`
- [ ] shadcn/ui, zustand, @tanstack/react-query, axios
- [ ] Axios instance với interceptors (token attach + refresh)
- [ ] Root providers, `authStore` skeleton

#### Database
- [ ] Supabase project + `prisma/schema.prisma` scaffold (all PG entities from `_INDEX.md`)
- [ ] `prisma migrate dev --name init`
- [ ] MongoDB Atlas cluster + Mongoose schemas (Question, Flashcard, UserFlashcardState, UserSavedWord)
- [ ] Seed script skeleton

#### CI/CD
- [ ] `.github/workflows/ci.yml` (lint + type-check + test)
- [ ] Vercel + Railway project setup

### Definition of Done S0:
- `localhost:3000` → Next.js renders
- `localhost:3001/api` → Swagger UI
- `localhost:3001/health` → `{ status: "ok" }`
- GitHub Actions green on push

---

## Sprint 1 — Auth + User Management (Tuần 3–4)

### Features: S-AUTH-1–6, T-AUTH-1–6, A-AUTH-1–6, A-USER-1–4

### Tasks:

#### Backend
- [ ] `AuthModule`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [ ] `JwtStrategy` + `JwtAuthGuard`, `RefreshJwtStrategy`, `RolesGuard`
- [ ] `@CurrentUser()`, `@Roles()`, `@Public()` decorators
- [ ] `UsersModule`: `GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`
- [ ] `AdminModule`: `GET /admin/users` (all + filter), `GET /admin/users/:id`, `PATCH /admin/users/:id/approve`, `PATCH /admin/users/:id/suspend`
- [ ] Update `User.lastLoginAt` on successful login
- [ ] Notification triggers: `account_approved`, `account_suspended`, `new_teacher_registration`, `new_student_registration`

#### Frontend
- [ ] `/login`, `/register` (role selector: teacher / student)
- [ ] `middleware.ts` route protection
- [ ] `authStore` (Zustand) complete
- [ ] Dashboard layout (Sidebar by role + Navbar with notification bell)
- [ ] `/admin/users` — list + filter + approve/suspend
- [ ] `/admin/users/:id` — chi tiết hồ sơ (enrollment history, attempt history, session history placeholder)
- [ ] Profile page (all roles) — edit nickname/bio, upload avatar

### Definition of Done S1:
- Register (teacher/student) → status=pending → Admin approves → Login → correct dashboard
- Admin can suspend → user gets 401 on next request

---

## Sprint 2 — Classes + Enrollment + Lesson Management (Tuần 5–6)

### Features: T-CLASS-1–6, T-LESSON-1–5, S-CLS-1–4, S-LESSON-1–3

### Tasks:

#### Backend
- [ ] `ClassesModule`: CRUD `/classes` (teacher), `GET /classes/mine` (student)
- [ ] `POST /classes/:id/regenerate-code` — regenerate enrollmentCode
- [ ] `POST /classes/join` — student join via code → create ClassEnrollment
- [ ] `DELETE /enrollments/:id` — student drop class
- [ ] `LessonsModule`: CRUD `/classes/:classId/lessons`
- [ ] `PATCH /classes/:classId/lessons/reorder` — update orderIndex (bulk)
- [ ] `POST /lessons/:id/assignments` + `DELETE /lessons/:id/assignments/:assignmentId` — LessonAssignment link

#### Frontend
- [ ] Teacher: `/classes` list + create modal
- [ ] Teacher: `/classes/:id` — class detail, enrollment code display + copy
- [ ] Teacher: `/classes/:id/lessons` — lesson list + drag-to-reorder
- [ ] Teacher: lesson create/edit modal (title, description, contentType, contentUrl/upload)
- [ ] Teacher: link assignment to lesson (after S3)
- [ ] Student: `/classes` — join via code modal + list of enrolled classes
- [ ] Student: `/classes/:id/lessons` — ordered lesson list with content view
- [ ] Student: lesson detail — view content + linked assignments

### Definition of Done S2:
- Teacher creates class → student joins with code → sees lessons in order
- Teacher reorders lessons → student sees new order immediately

---

## Sprint 3 — Question Bank + Assignment Creation (Tuần 7–8)

### Features: T-QB-1–6, T-ASGN-1–5, S-ASGN-1

### Tasks:

#### Backend
- [ ] `QuestionsModule` (MongoDB): CRUD `/questions`, filter by skill/hskLevel/subType/difficulty
- [ ] Audio upload: `POST /questions/upload-audio` → Supabase Storage
- [ ] `AssignmentsModule` (PG): CRUD `/assignments`
- [ ] `GET /assignments?classId=` — student list (published only)
- [ ] Assignment publish: `PATCH /assignments/:id/publish`

#### Frontend
- [ ] Teacher: Question Bank `/questions` — list, filter, create/edit/delete
- [ ] Question create forms: Listening (audio upload), Reading (passage+questions), Writing (prompt+rubric)
- [ ] Teacher: Assignments `/assignments` — list with submission count + pending grading count
- [ ] Teacher: Assignment create/edit (select class, type, dueDate, timeLimitMinutes, pick questions)
- [ ] Student: `/assignments` — list by class, status badges (chưa làm / đang làm / đã nộp / đã chấm)

### Definition of Done S3:
- Teacher creates Listening question with audio → appears in bank → added to assignment → student sees assignment

---

## Sprint 4 — Exam Engine + AI Grading (Tuần 9–10)

### Features: S-ASGN-2–8, T-GRADE-1–6

### Tasks:

#### Backend
- [ ] `AttemptsModule`: `POST /attempts` (start), `PATCH /attempts/:id/submit`
- [ ] `AttemptAnswersModule`: `PUT /attempts/:id/answers/:questionId` (upsert — auto-save)
- [ ] Auto-score MCQ on submit (compare selectedOptions vs correctAnswer)
- [ ] `GradingModule`: `GET /grading/pending`, `GET /grading/:attemptId`, `PATCH /grading/:attemptId/answers/:answerId`
- [ ] AI suggest: `POST /grading/:attemptId/answers/:answerId/ai-suggest` → Gemini API call
- [ ] `PATCH /grading/:attemptId/finalize` → status=graded, trigger `graded` notification

#### Frontend
- [ ] Student: Assignment detail → "Bắt đầu" → exam engine page
- [ ] Exam engine: question sidebar navigation (chưa làm/đã làm/flag), answer area per subType
- [ ] Auto-save: debounced PUT every 2s
- [ ] Mock test: countdown timer, auto-submit on timeout
- [ ] Student: Results page — total score, per-question (answer + correctAnswer + feedback)
- [ ] Teacher: Grading `/grading` — pending list, submission detail
- [ ] Teacher: Per-answer grading form: text input for score/feedback + "AI Suggest" button
- [ ] AI suggest response: show suggested score + Gemini reasoning inline

### Definition of Done S4:
- Student completes mock test → auto-submits → teacher grades with AI suggestion → student sees result

---

## Sprint 5 — SRS Flashcards + Word Bank + Analytics (Tuần 11–12)

### Features: S-SRS-1–7, S-ANL-1–5, T-ANL-1–4

### Tasks:

#### Backend
- [ ] `FlashcardsModule`: `GET /flashcards?hskLevel=` (browse), seed HSK 1–6 data
- [ ] `SRSModule`: `GET /srs/due` (cards due for user), `POST /srs/review` (rate card → SM-2 update)
- [ ] `GET /srs/stats` — streak, cards reviewed today, retention rate
- [ ] `WordBankModule`: `POST /word-bank` (save word), `GET /word-bank`, `DELETE /word-bank/:id`
- [ ] `AnalyticsModule` (Student): `GET /analytics/me` — heatmap, progress chart, scores
- [ ] `AnalyticsModule` (Teacher): `GET /analytics/class/:classId` — score chart, distribution, submission rate, weak students, skill breakdown

#### Frontend
- [ ] Student: `/flashcards` — HSK level selector → card browser
- [ ] Student: `/flashcards/study` — flip card UI (hanzi → pinyin + meaning + example)
- [ ] Student: Rating buttons (Again/Hard/Good/Easy) with SM-2 feedback
- [ ] Student: SRS stats dashboard (streak heatmap, due today, retention %)
- [ ] Student: Click-to-save word UX — click any hanzi → popup (pinyin + meaning) + "Lưu vào kho từ" button
- [ ] Student: `/word-bank` — saved words list, delete, "Bắt đầu ôn tập"
- [ ] Student: `/analytics` — heatmap + charts + leaderboard
- [ ] Teacher: `/analytics/class/:id` — class analytics dashboard (score chart, distribution, submission rate, weak students, skill breakdown per student)

### Definition of Done S5:
- Student reviews due cards with SM-2, saves a word from lesson, sees it in word bank
- Teacher sees class analytics dashboard with skill breakdown

---

## Sprint 6 — Sessions + Attendance + Payroll (Tuần 13–14)

### Features: T-SES-1–7, T-INC-1–3, A-PAY-1–7, A-DASH-1 (partial)

### Tasks:

#### Backend
- [ ] `SessionsModule`: CRUD `/sessions` (teacher), `PATCH /sessions/:id/start`, `PATCH /sessions/:id/end`, `PATCH /sessions/:id/submit`
- [ ] `SessionAttendanceModule`: `PUT /sessions/:id/attendance` (bulk upsert)
- [ ] Admin: `GET /admin/sessions/pending`, `PATCH /admin/sessions/:id/approve`, `PATCH /admin/sessions/:id/reject`
- [ ] Notifications: `session_submitted_for_review` → Admin; `session_approved/rejected` → Teacher
- [ ] `PayRateModule`: CRUD `/admin/pay-rates` (admin only)
- [ ] `PayrollModule`: `POST /admin/payroll-periods`, `PATCH /admin/payroll-periods/:id/finalize`, `PATCH /admin/payroll-periods/:id/paid`
- [ ] `GET /teacher/payroll` — teacher's own periods + session breakdown
- [ ] Admin dashboard: pending sessions count, active classes count

#### Frontend
- [ ] Teacher: `/sessions` — list + "Bắt đầu buổi học" flow
- [ ] Teacher: Session logging form (date, times, topic, notes) + attendance marking per student
- [ ] Teacher: Session status history + rejection reason display
- [ ] Teacher: `/income` — monthly earnings, payroll period list + session breakdown
- [ ] Admin: Payroll `/admin/payroll` — pending sessions list, approve/reject with reason
- [ ] Admin: PayrollPeriod create → finalize → mark paid flow
- [ ] Admin: Pay rate setup per teacher
- [ ] Admin Dashboard: fill "sessions pending review" + "active classes" widgets

### Definition of Done S6:
- Teacher logs session → submits → Admin approves → Admin creates payroll period → Teacher sees income
- Attendance rate appears in teacher's class student list

---

## Sprint 7 — Invoicing + Notifications Full (Tuần 15–16)

### Features: A-INV-1–5, S-BILL-1–3, A-DASH-2, Notification full sweep

### Tasks:

#### Backend
- [ ] `TuitionRateModule`: CRUD `/admin/tuition-rates` (per student)
- [ ] `InvoicesModule`: `POST /admin/invoices`, `GET /admin/invoices`, `PATCH /admin/invoices/:id/void`
- [ ] `PaymentsModule`: `POST /admin/invoices/:id/payments`
- [ ] Student: `GET /invoices/me` — own invoices + payments
- [ ] Notification: `new_invoice` → student on invoice create
- [ ] Scheduler: `deadline_reminder` notification 24h before dueDate (NestJS `@Cron`)
- [ ] Admin Dashboard: monthly revenue (sum of payments this month), monthly payroll (sum of paid periods)

#### Frontend
- [ ] Admin: `/admin/invoices` — list all + create invoice modal (student + period + amount)
- [ ] Admin: Invoice detail — payment history + "Record Payment" form + Void button
- [ ] Admin: Tuition rate setup per student
- [ ] Admin Dashboard: fill "monthly revenue" + "monthly payroll" widgets → Dashboard complete
- [ ] Student: `/billing` — invoice list + payment history per invoice
- [ ] Notification panel (all roles): real-time bell, unread count, click to deep-link

### Definition of Done S7:
- Admin creates invoice → student notified → Admin records payment → invoice status updates
- Admin Dashboard fully populated (all widgets have real data)

---

## Sprint 8 — Skill Drill + Quiz Room + Leaderboard (Tuần 17–18)

### Features: S-DRILL-1–3, S-QUIZ-1–3, S-ANL-4 (Leaderboard)

### Dependencies: WebSocket infrastructure (Socket.IO or native WS)

### Tasks:

#### Backend
- [ ] `SkillDrillModule`: `POST /drill/start` (filter questions by skill/hskLevel/difficulty), `POST /drill/answer` (immediate feedback, no Attempt created)
- [ ] `QuizRoomModule`: `POST /quiz-rooms` (teacher creates), `POST /quiz-rooms/join` (student join by code)
- [ ] WebSocket Gateway: `QuizRoomGateway` — events: `join`, `start`, `question`, `answer`, `score_update`, `leaderboard`, `finish`
- [ ] Score computation: `basePoints × speedMultiplier` (time remaining / timeLimitPerQuestion)
- [ ] `GET /leaderboard` — global leaderboard (by totalScore / streak / retention — formula TBD)

#### Frontend
- [ ] Student: `/drill` — skill/HSK/difficulty picker → drill session
- [ ] Drill: question display → immediate answer reveal after each question → session summary
- [ ] Student: `/quiz` — enter room code → waiting room (player list)
- [ ] Quiz: real-time question display (countdown), answer selection, live leaderboard after each question
- [ ] Student: `/analytics` leaderboard tab — global rankings

#### Infrastructure
- [ ] Socket.IO server integration in NestJS
- [ ] Socket.IO client in Next.js

### Definition of Done S8:
- Student completes Skill Drill → sees instant feedback → no grade recorded
- Teacher creates Quiz Room → students join → play real-time → final leaderboard shown

---

## Sprint 9 — Testing + Polish + Launch (Tuần 19–20)

### Tasks:

#### Testing
- [ ] Unit tests: Auth, SRS algorithm, score calculation, payroll amount
- [ ] Integration tests: assignment lifecycle (create → attempt → grade → notify)
- [ ] E2E (Playwright): register → approve → login → submit assignment → grade → view result
- [ ] Load testing: SRS due card fetch, Quiz Room WebSocket concurrency

#### Monitoring
- [ ] Gemini API quota tracking: log each API call (feature, tokens, timestamp)
- [ ] `GET /admin/monitoring/gemini` — quota used, cache hit ratio, calls by feature (A-DASH-3)
- [ ] Error tracking (Sentry)

#### Polish
- [ ] Responsive design check (mobile)
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Empty states & loading skeletons for all major pages
- [ ] `robots.txt`, SEO meta tags

#### Launch
- [ ] Production env vars verified
- [ ] Vercel + Railway production deploy
- [ ] Seed production DB with HSK 1–6 flashcard data
- [ ] Smoke test production environment

### Definition of Done S9:
- All E2E tests pass on production
- Admin Dashboard shows real Gemini quota data
- App publicly accessible

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
