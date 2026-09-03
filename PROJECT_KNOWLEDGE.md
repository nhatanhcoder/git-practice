# 📚 HSK Learning Platform — Complete Project Knowledge Base & Overview

This document consolidates the business rules, technical architecture, database design, coding conventions and roadmap for the **HSK Learning Platform**. It is the single most complete reference: a developer or AI assistant who reads it should be able to understand the whole project and start working immediately.

> **Language**: English. Translated from Vietnamese on 2026-08-31 — see `HANDOFF.md` for that session's notes.
> **Unresolved conflicts** are marked inline with ⚠️ **OPEN** and collected in §9. Do not silently pick a side on any of them.
>
> **Verified against the repo on 2026-09-01.** This file was written in a chat session with no repo access, then checked against `D:\PersonalProject\Real` at HEAD `d277ca1`. Register IDs were renamed `C##` → `CR-##` because `PROGRESS.md` already uses `C1`/`C2`/`C3` for unrelated module blockers, and the product-model conflict was renamed `SCOPE-01` → `SCOPE-02` because `PROGRESS.md` already uses `SCOPE-01` for the Classes/Enrollment scope question. Four conflicts closed on repo evidence — see §9.

---

## 🚀 1. Project Overview & Technology Stack

**HSK Learning Platform** is an online platform for managing and supporting self-study of Chinese from **HSK 1 through HSK 9**, serving Teachers, Students and system Administrators at the same time.

The project uses a **Monorepo** managed by **Turborepo** and **pnpm**, deploying Frontend and Backend independently, on a **$0/month** budget optimised around free tiers.

### 🛠️ Core Architecture

*   **Frontend**: Next.js 14 (App Router), React Query 5 (cache management), Zustand (global state), Tailwind CSS + shadcn/ui (UI and consistent design).
*   **Backend**: NestJS REST API (independent module architecture, injectable services, DTO validation, auto-generated Swagger).
*   **Relational Database**: PostgreSQL (Supabase free tier, 500 MB) for business data, transactions and permissions. Accessed through **Prisma ORM**.
*   **NoSQL Database**: MongoDB (Atlas free tier, 512 MB) for the multi-structured question bank, the vocabulary store and SRS state. Accessed through **Mongoose ODM**.
*   **AI Integration**: Google Gemini 1.5 Flash (free API, capped at 60 requests/minute) for auto-scoring and feedback suggestions on student writing. ⚠️ **OPEN (CR-11)** — the model version was chosen before 2026 and has not been reviewed since; confirm it is still the right choice.
*   **Storage**: ⚠️ **OPEN (CR-3)** — two providers appear in the docs. Verified 2026-09-01: **Supabase Storage** is what `docs/BACKEND_PLAN.md`, `docs/diagrams/architecture-layers.mmd`, all three `FEATURES_*.md` and the *accepted* module spec `docs/api/modules/01-auth.md` say (7+ places, including the only accepted spec). **Cloudinary** survives in older shared docs (`TECH_STACK.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `PROJECT_STRUCTURE.md`, entity specs). Evidence favours Supabase Storage, but this is an owner decision — **pick one before writing any upload code**, then sweep the loser out. Both sides agree on Cloudflare R2 for student video.

### 📁 Monorepo Structure

*   `apps/api/` — NestJS backend API.
*   `apps/web/` — Next.js 14 frontend.
*   `packages/types/` — shared TypeScript interfaces used by both FE and BE. ✅ **CR-19 RESOLVED 2026-09-01 → `packages/types`.** `pnpm-workspace.yaml` declares `packages/*`, and `PROGRESS.md` refers to `packages/types` throughout (Sprint 0, *Needs from the other lane*, *Backend — not started*). **The directory does not exist on disk yet** — nothing to rename, only to create. `packages/shared-types` was this document's invention.
*   `docs/` — detailed business specifications per actor and per flow.
*   ⛔ `backend/data/content/` — **DOES NOT EXIST IN THIS REPO.** Verified 2026-09-01. The source corpus was located on 2026-09-03 at `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content`, outside this repository. ADR-016 accepts the learning modules into the product domain, but the files are still unavailable to CI/deploy and are not an approved production data shape — see `DOC-011`.

---

## 👥 2. Actors & Permissions (RBAC Matrix)

Role-Based Access Control is enforced by a `RolesGuard` on the backend and by router groups on the frontend.

### 👨‍💼 Admin

*   **Account approval**: approve Teacher and Student accounts on registration (initial status `pending`, becomes `active` once approved).
*   **Financial setup**:
    *   Configure teacher pay, either per hour or per session (`TeacherPayRate`).
    *   Configure monthly student tuition (`StudentTuitionRate`).
    *   Create payroll periods (`PayrollPeriod`) and approve payroll for payment.
    *   Issue tuition invoices (`StudentInvoice`) and manually reconcile bank transfers.
*   **System monitoring**: track Gemini API quota, storage usage and database traffic.

### 👩‍🏫 Teacher

*   **Class management**: create and edit classes. The system generates a unique 8-character enrollment code (uppercase letters + digits) that students use to join.
*   **Teaching & attendance**: schedule sessions (`ClassSession`), take attendance (`SessionAttendance`) after each session, and submit teaching logs so the Admin can calculate pay.
*   **Question bank & assignments**:
    *   Author questions in 8+ formats (MCQ, true/false, gap-fill, sentence ordering, short answer, paragraph writing), classified by HSK level and skill (listening, reading, writing).
    *   Create homework or timed mock tests.
*   **Grading**:
    *   Objective questions (MCQ, true/false, gap-fill) are auto-graded.
    *   Writing is graded by the teacher, assisted by **Gemini AI Suggest** (proposed score and feedback).

### 🎓 Student

*   **Joining a class**: enter the enrollment code given by the teacher to be added to the class automatically.
*   **Homework & mock tests**:
    *   Homework has no time limit.
    *   Mock tests run a live countdown and auto-submit when time expires.
    *   `Auto-save` persists answers as they are given, so a dropped connection does not lose work.
*   **Spaced-repetition vocabulary (SRS)**:
    *   Study HSK vocabulary through flashcards with audio, pinyin, translation and example sentences.
    *   Daily review scheduled by a spaced-repetition algorithm. The student self-rates recall from 0 to 5 and the system schedules the next review.
*   **Progress tracking**: view a **skill heatmap** (listening, reading, writing, grammar, characters, speaking) by week or month.
*   **Invoices**: receive monthly tuition invoices, pay by scanning a VietQR code, and review payment history.
*   **Built-in self-study content** (full detail in §8 — F9→F16): pronunciation foundation and the 214 radicals · structured grammar for HSK 1–9 · character writing with stroke order · Lego sentence builder · HSK mock exams · workplace roleplay · curriculum-based learning path · XP, badges, ranks and leaderboard.

---

## 🗃️ 3. Database Schema

### 🐘 PostgreSQL (Prisma models)

#### 1. User

*   `id`: String (CUID, primary key)
*   `email`: String (unique)
*   `passwordHash`: String
*   `fullName`: String
*   `role`: Enum (`admin`, `teacher`, `student`)
*   `status`: Enum (`pending`, `active`, `suspended`)
*   `hskLevel`: Int (current level 1–9, optional, students only)
*   `avatarUrl`: String (nullable)
*   `preferredLanguage`: String (default `"vi"`)
*   `createdAt`, `updatedAt`: DateTime

#### 2. Class

*   `id`: String (CUID, primary key)
*   `name`: String
*   `description`: String (nullable)
*   `hskLevel`: Int (class level 1–9)
*   `enrollmentCode`: String (unique, 8 random characters)
*   `status`: Enum (`active`, `archived`)
*   `teacherId`: String (FK → `User.id`)

#### 3. ClassEnrollment

*   `id`: String (primary key)
*   `classId`: String (FK → `Class.id`)
*   `studentId`: String (FK → `User.id`)
*   `status`: Enum (`active`, `dropped`)
*   `enrolledAt`, `droppedAt`: DateTime
*   *Index*: unique on `(classId, studentId)`

#### 4. Assignment

*   `id`: String (primary key)
*   `classId`: String (FK → `Class.id`)
*   `title`: String
*   `description`: String (nullable)
*   `skillType`: Enum (`listening`, `reading`, `writing`, `grammar`, `character`, `speaking`, `pronunciation`, `mixed`)
*   `type`: Enum (`homework`, `mock_test`)
*   `timeLimitMinutes`: Int (null if untimed)
*   `questionIds`: String[] (MongoDB ObjectId strings)
*   `dueDate`: DateTime
*   `status`: Enum (`draft`, `published`, `closed`)
*   `maxScore`: Int

#### 5. Attempt

*   `id`: String (primary key)
*   `userId`: String (FK → `User.id`, the student)
*   `assignmentId`: String (FK → `Assignment.id`)
*   `status`: Enum (`in_progress`, `submitted`, `graded`)
*   `totalScore`: Float (null until writing has been graded)
*   `startedAt`: DateTime
*   `submittedAt`, `gradedAt`: DateTime (nullable)
*   *Index*: unique on `(userId, assignmentId)` — one attempt per student per assignment.

#### 6. AttemptAnswer

*   `id`: String (primary key)
*   `attemptId`: String (FK → `Attempt.id`)
*   `questionId`: String (MongoDB question id)
*   `answer`: Json (student input: a choice, an array of gap-fill words, or a body of writing)
*   `isCorrect`: Boolean (nullable — auto-graded questions only)
*   `autoGraded`: Boolean (default true; false for writing, which needs a teacher)
*   `score`: Float
*   `teacherFeedback`: String
*   `aiSuggestedScore`: Float
*   `aiFeedback`: String
*   `aiGradedAt`, `gradedAt`: DateTime
*   *Index*: unique on `(attemptId, questionId)`

#### 7. SkillScore (feeds the heatmap and progress charts)

*   `id`: String (primary key)
*   `userId`: String
*   `attemptId`: String
*   `skill`: Enum (`listening`, `reading`, `writing`, `grammar`, `character`, `speaking`, `pronunciation`)
*   `score`: Float (normalised to a 100-point scale)
*   `weekNumber`, `year`: Int (ISO week number and year, for the heatmap)
*   `recordedAt`: DateTime

#### 8. ClassSession

*   `id`: String (primary key)
*   `classId`: String
*   `lessonTopic`: String
*   `notes`: String
*   `sessionDate`: DateTime
*   `startTime`, `endTime`: DateTime (scheduled window)
*   `actualStartTime`, `actualEndTime`: DateTime (as logged by the teacher)
*   `status`: Enum (`scheduled`, `completed_pending`, `approved`, `rejected`, `paid`)
*   `rejectionReason`: String
*   `submittedAt`, `approvedAt`: DateTime

#### 9. SessionAttendance

*   `id`: String (primary key)
*   `sessionId`: String
*   `studentId`: String
*   `attendanceStatus`: Enum (`present`, `absent_excused`, `absent_unexcused`)
*   `notes`: String
*   *Index*: unique on `(sessionId, studentId)`

#### 10. TeacherPayRate

*   `id`: String (primary key)
*   `teacherId`: String
*   `rateType`: Enum (`per_session`, `per_hour`)
*   `rateAmount`: Float (VND per session or per hour)
*   `effectiveFrom`: DateTime
*   *Note*: rates are **append-only** — add a new rate with a new effective date rather than editing an old one, so historical invoices stay explainable.

#### 11. PayrollPeriod

*   `id`: String (primary key)
*   `teacherId`: String
*   `periodStart`, `periodEnd`: DateTime
*   `totalAmount`: Float
*   `status`: Enum (`draft`, `finalized`, `paid`)
*   `finalizedAt`, `paidAt`: DateTime

#### 12. StudentTuitionRate

*   `id`: String (primary key)
*   `studentId`: String
*   `rateAmount`: Float (monthly tuition, e.g. 1,500,000 VND)
*   `effectiveFrom`: DateTime
*   *Note*: append-only, same rule as `TeacherPayRate`.

#### 13. StudentInvoice

*   `id`: String (primary key)
*   `studentId`: String
*   `periodStart`, `periodEnd`: DateTime
*   `totalAmount`: Float
*   `status`: Enum (`unpaid`, `partially_paid`, `paid`, `void`)
*   `issuedAt`, `dueDate`: DateTime

#### 14. TuitionPayment

*   `id`: String (primary key)
*   `invoiceId`: String
*   `amount`: Float
*   `paymentMethod`: String (`cash`, `bank_transfer`, `momo`, `zalo_pay`)
*   `transactionReference`: String (bank reference used for reconciliation)
*   `paidAt`: DateTime
*   `recordedBy`: String (id of the Admin who recorded the payment)

#### 15. Notification

*   `id`: String (primary key)
*   `recipientId`: String
*   `senderId`: String (null when generated by the system)
*   `type`: Enum (`new_assignment`, `deadline_reminder`, `grading_required`, `graded`, `weak_student_alert`, `account_approved`, `account_suspended`, `session_approved`, `session_rejected`, `payroll_finalized`, `invoice_created`)
*   `message`: String
*   `data`: Json (context such as assignment or attempt id, for deep links)
*   `readAt`: DateTime (null while unread)

#### 16. RefreshToken

*   `id`: String (primary key)
*   `userId`: String
*   `tokenHash`: String (unique, one-way hash of the refresh token)
*   `expiresAt`: DateTime
*   `revokedAt`: DateTime (set on logout or on rotation)

---

### 🍃 MongoDB Collections (Mongoose schemas)

#### 1. Question

*   `hskLevel`: Number (1–9)
*   `skill`: String (`listening`, `reading`, `writing`, `grammar`, `character`, `speaking`, `pronunciation`)
*   `subType`: String (`listen_mcq`, `listen_true_false`, `listen_dialogue_mcq`, `read_mcq`, `read_true_false`, `read_gap_fill`, `read_sentence_order`, `write_short`, `write_paragraph`)
*   `content`: Object (shape varies by `subType`):
    *   `instruction` — task instructions
    *   `passage` — reading passage
    *   `question` — question text
    *   `audioUrl` — audio file URL (listening). ⚠️ **OPEN (CR-3)** — storage provider undecided.
    *   `audioDuration` — length in seconds
    *   `transcript` — audio transcript (hidden from students)
    *   `prompt` — writing prompt
    *   `keywords` — required words the student must use
    *   `blanks` — array of blank ids to fill
    *   `wordBank` — words available to drag into blanks
    *   `sentences` — shuffled sentences to reorder
*   `options`: Array of `{ key: string, text: string }`
*   `correctAnswer`: Mixed (string for MCQ, boolean for true/false, array of pairs for gap-fill)
*   `explanation`: String
*   `pointValue`: Number (default 1)
*   `maxScore`: Number (for writing, e.g. 5 or 10)
*   `rubric`: String (grading criteria for writing)
*   `createdBy`: String (PostgreSQL user id)
*   `tags`: String[] (e.g. `['vocabulary', 'grammar', 'hsk1']`)

#### 2. Flashcard

*   `chineseWord`: String (unique)
*   `pinyin`: String (with tone marks)
*   `vietnameseMeaning`: String
*   `englishMeaning`: String
*   `hskLevel`: Number (1–9)
*   `exampleSentence`: String
*   `exampleTranslation`: String
*   `audioUrl`: String
*   `tags`: String[] (e.g. `['noun', 'verbs', 'hsk1']`)

#### 3. UserFlashcardState

*   `userId`: String (PostgreSQL user id)
*   `flashcardId`: ObjectId
*   `repetitions`: Number (consecutive successful reviews, default 0)
*   `interval`: Number (days until next review, default 1)
*   `easeFactor`: Number (default 2.5)
*   `nextReviewDate`: Date (default today)
*   `totalReviews`, `correctReviews`: Number

---

## 🔄 4. Core Flows & Algorithms

### 🔐 4.1. Authentication & Refresh Token Rotation

The system uses Refresh Token Rotation (RTR) to defend against stolen tokens:

1.  A successful login returns:
    *   `accessToken` — 15-minute lifetime, held in memory (Zustand) on the client.
    *   `refreshToken` — 7-day lifetime, stored in a cookie with `httpOnly`, `secure`, `sameSite: strict`.
2.  A one-way `bcrypt` hash of the refresh token is written to the `RefreshToken` table in PostgreSQL and marked active.
3.  When the access token expires, the client sends `POST /api/v1/auth/refresh` (the refresh cookie is attached automatically).
4.  The backend decodes the token and checks the hash in PostgreSQL:
    *   **Valid and not revoked** (`revokedAt` is null): issue a new access token *and* a new refresh token, mark the old one revoked (`revokedAt = now()`), and store the hash of the new one.
    *   **Already revoked** (`revokedAt` is not null): treat this as a replay attack. Immediately invalidate the **entire token tree** for that user, forcing a fresh login.

### 🤖 4.2. AI-Assisted Writing Grading (Gemini)

Designed around the free-tier quota (Gemini 1.5 Flash allows 60 requests/minute):

1.  The student submits writing. `AttemptAnswer.score` stays `null` and the `Attempt` moves to `submitted`.
2.  When the teacher opens the grading view, the submission is shown with an **"AI Suggest"** button.
3.  Pressing it calls `POST /attempts/:attemptId/answers/:questionId/ai-grade`, protected by a custom `AiRateLimiterGuard` that caps per-user AI calls.
4.  The backend calls Gemini with the question, HSK level, `maxScore` and the student's writing, using a fixed prompt template that forces strict JSON output.
5.  The response contains `suggestedScore`, `feedback` (in Vietnamese), `strengths` and `improvements`. These are saved to `aiSuggestedScore` and `aiFeedback` so pressing the button again does not consume another API call.
6.  The teacher reviews the suggestion, adjusts the score, adds their own comments, and saves. The system writes `score` and `teacherFeedback`, moves the attempt to `graded`, and notifies the student.

### 🗂️ 4.3. Spaced Repetition (SM-2)

The standard **SM-2** algorithm schedules daily vocabulary review. ADR-016 confirms SM-2 as
the production algorithm; the five-box Leitner behavior in the Student FE is mock-only.

After studying a card, the UI offers four ratings mapped to SM-2 recall quality ($q$):

*   **Again** → $q = 0$
*   **Hard** → $q = 3$
*   **Good** → $q = 4$
*   **Easy** → $q = 5$

Quality 1–2 remain valid internal values for imported/corrected history but have no separate UI button.

Updating `UserFlashcardState`:

1.  **Repetitions ($n$)**
    *   Poor recall ($q < 3$): reset $n = 0$.
    *   Good recall ($q \ge 3$): $n = n + 1$.
2.  **Interval ($I$, in days)**
    *   First repetition ($n = 1$): $I = 1$.
    *   Second ($n = 2$): $I = 6$.
    *   Third onward ($n > 2$): $I = \text{round}(I_{\text{previous}} \times EF)$.
3.  **Ease factor ($EF$)**
    *   $EF_{\text{new}} = EF_{\text{old}} + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$
    *   Floor: if $EF_{\text{new}} < 1.3$, set $EF_{\text{new}} = 1.3$.
4.  **Next review date**
    *   `nextReviewDate` = now + $I$ days.

---

## 📏 5. Conventions & Development Standards

*   **REST API**
    *   Paths use plural nouns, kebab-case, and a version prefix: `/api/v1/classes`, `/api/v1/flash-cards`.
    *   All responses are wrapped by a global interceptor: `{ success: boolean, data: any, error?: { code: string, message: string } }`.
    *   All DateTime values are UTC ISO 8601.
    *   Error codes come from `docs/api/API_ERROR_CODES.md` — never invent new ones.
*   **Git & commits**
    *   **Conventional Commits**: `<type>(<scope>): <description>`, e.g. `feat(auth): implement refresh token rotation`.
    *   Feature branches: `feature/S[sprint]-[task]`, merged through `develop` before `main`.
    *   When two agents work in parallel, branch naming follows `multi-agent-workflow.md` instead: `feat/s<sprint>-<lane>-<slice>`. ⚠️ **OPEN (CR-20)** — two branch conventions are documented; reconcile them.
*   **Database**
    *   *Prisma (SQL)*: camelCase fields, snake_case tables via `@@map`.
    *   *Mongoose (NoSQL)*: snake_case fields in MongoDB, mapped to camelCase through `toJSON` virtuals.
    *   Cross-database transactions are impossible — design flows to tolerate partial failure (see `KNOWN_ISSUES.md` DEBT-001).

---

## 📅 6. Roadmap

✅ **CR-2 RESOLVED 2026-09-01 → 10 sprints (S0–S9).** `docs/roadmap/SPRINT_PLAN.md` was reachable this time and contains ten sprint sections, S0 through S9, with Sprint 7 = Invoicing + Notifications, Sprint 8 = Skill Drill + Quiz Room + Leaderboard, Sprint 9 = Testing + Polish + Launch. `project-brain.md` agrees. **`SPRINT_PLAN.md` is the authority.**

> ⚠️ The eight sections below are a condensed S0–S7 view written before `SPRINT_PLAN.md` was read, and they **do not match it** past Sprint 6 — this document's "Sprint 7 — Testing & Deploy" is really Sprint 9 there. `ai/PROGRESS.md` inherits the same 8-sprint shape and is wrong in the same way. Read them as a feature summary, not as the plan; renumber both against `SPRINT_PLAN.md` before planning a sprint (`DOC-012`).

### 🏁 Sprint 0 — Foundation (weeks 1–2)

*   **Goal**: shared infrastructure and connections to every data store.
*   **Tasks**:
    *   Set up Turborepo, pnpm workspace, eslint, prettier, husky pre-commit hooks.
    *   Create the NestJS API app with Prisma, Mongoose, Swagger and global pipes/filters.
    *   Create the Next.js web app with Tailwind, shadcn/ui, Axios interceptors and Zustand store skeletons.
    *   Initialise Supabase PostgreSQL and MongoDB Atlas, run the first Prisma migration, write a seed script.
*   **DoD**: API on port 3001 with Swagger at `/api`. Web on port 3000, connected to the API. GitHub Actions CI passes lint and build.

### 🔑 Sprint 1 — Auth & Users (weeks 3–4)

*   **Goal**: secure login and initial permission management.
*   **Tasks**:
    *   Backend `auth` module: registration, login, refresh token rotation.
    *   Custom decorators `@CurrentUser`, `@Roles`, `@Public`.
    *   Login/register screens and a dashboard layout whose sidebar filters by role.
    *   Admin user-management page for approving and suspending accounts.
*   **DoD**: register → Admin approves → login lands on the correct dashboard for Student or Teacher.

### 🏫 Sprint 2 — Classes & Enrollment (weeks 5–6)

*   **Goal**: connect teachers and students through classes.
*   **Tasks**:
    *   Teacher: create and edit classes; generate a unique 8-character enrollment code with a collision check against the database.
    *   Student: join by code, creating an active `ClassEnrollment`.
    *   Class dashboard listing enrolled students for the teacher.
*   **DoD**: teacher creates a class and gets a code → student joins with it → teacher sees the student in the list.

### 📝 Sprint 3 — Question Bank & Assignments (weeks 7–8)

*   **Goal**: authoring tools for teachers.
*   **Tasks**:
    *   Backend: MongoDB aggregation pipeline for full-text search and advanced filters (skill, HSK level).
    *   Teacher UI: author MCQ, true/false, gap-fill and writing prompts; upload listening audio.
    *   Assignment builder: pick a class, select questions from the bank, set a due date, choose homework or mock test, set the countdown.
*   **DoD**: create a set of questions → group them into an assignment attached to a class.

### ⏱️ Sprint 4 — Taking Tests & AI Grading (weeks 9–10)

*   **Goal**: online testing with AI assistance.
*   **Tasks**:
    *   Student: test-taking UI with a question sidebar and a live countdown for mock tests.
    *   Auto-save on every answer change, debounced.
    *   On submit: MCQ auto-graded by comparison; writing held for manual grading.
    *   AI Suggest: NestJS Gemini service scores writing against the rubric and stores the suggestion. The teacher makes the final call.
*   **DoD**: a mock test auto-submits at time-up → teacher uses AI Suggest → enters a final score → student views the result.

### 🗂️ Sprint 5 — SRS & Analytics (weeks 11–12)

*   **Goal**: self-directed vocabulary study and performance tracking.
*   **Tasks**:
    *   Student: browse vocabulary by level; flashcard review UI with a card-flip interaction.
    *   SRS engine: SM-2 scheduling written to `UserFlashcardState`.
    *   Analytics: aggregate `SkillScore` by week into a **skill heatmap** and a progress line chart.
    *   Weak-student alerts: flag students whose recent average is below 50% on the teacher's dashboard.
*   **DoD**: rating a card reschedules it correctly per SM-2; teachers see red alerts for struggling students.

### 💸 Sprint 6 — Attendance, Payroll & Tuition (weeks 13–14)

⚠️ **OPEN (CR-13)** — this document and `SPRINT_PLAN.md` both describe Sprint 6 as fully in scope with a DoD, but `PROGRESS.md` marks every item `⏸` ("not yet confirmed in scope", citing the non-existent `DECISIONS.md` #5). Two of three sources say in scope; `PROGRESS.md` is the outlier, but the owner still has to say so.

*   **Goal**: finish the financial module and automated notifications.
*   **Tasks**:
    *   Teachers log real sessions (`ClassSession`), record the topic and notes, and take attendance (`SessionAttendance`).
    *   Teachers submit teaching logs for Admin approval, which feeds per-session or per-hour pay into a `PayrollPeriod`.
    *   Admin issues monthly tuition invoices (`StudentInvoice`). Students view the invoice and pay by scanning a generated VietQR code. Admin reconciles manually and marks the invoice paid.
    *   Notifications for new assignments, payment reminders and payroll approval.
*   **DoD**: teacher takes attendance → Admin approves the session → pay accrues into payroll. Admin issues an invoice → student scans and pays → payment recorded.

### 🧪 Sprint 7 — Testing & Production Deploy (weeks 15–16)

*   **Goal**: quality assurance and a live deployment.
*   **Tasks**:
    *   Unit tests for the core services (auth, class, question, attempt, SRS).
    *   Playwright E2E tests covering the full attempt-taking and submission flow.
    *   Production environment configuration; GitHub Actions running tests on every pull request.
    *   Deploy: frontend to Vercel, backend to Railway or Render, connected to real Supabase and Atlas instances.
*   **DoD**: stable in production with no critical defects; all tests green.

---

## 📖 7. Glossary

*   **Attempt** — one student's run at a specific assignment. States: `in_progress`, `submitted`, `graded`.
*   **EnrollmentCode** — an 8-character random string of uppercase letters and digits, generated when a teacher creates a class. Students use it to add themselves.
*   **SRS (Spaced Repetition System)** — review scheduling that strengthens long-term memory by prompting recall just before the word would be forgotten.
*   **easeFactor (EF)** — how easy a card is for a given student, in SM-2. Defaults to 2.5, floors at 1.3. A higher EF means longer gaps between reviews.
*   **repetitions** — consecutive successful reviews ($q \ge 3$) of a card.
*   **XP** — experience points earned by completing learning activities. Drives the imperial-exam ranks (F16.2); independent of assignment and exam scores.
*   **Streak** — consecutive days with activity. Breaks after one missed day.
*   **Boss (Ải Trùm)** — a gate test at the end of a chapter in the learning path (F15); must be cleared to unlock the next level.
*   **Station (Trạm)** — one level in the Lego sentence builder (F12), each tied to a word-order rule.
*   **Block roles (S/T/P/A/V/O/C/Q)** — grammatical labels attached to blocks in F12: Subject, Time, Place, Adverbial, Verb, Object, Complement, Question word.
*   **VietQR** — the NAPAS-standard QR payment code used in Vietnam. The system encodes the school's bank account, the amount due and the transfer memo so students can pay by scanning.

---

## 🧩 8. Built-in Learning Content & Gamification (F9 → F16)

> ✅ **Product scope accepted by ADR-016.** F9–F16 are first-class self-study and gamification
> domain capabilities inside the same product as the LMS. They primarily supply personal practice
> and teacher-selected supplemental work aligned to a class curriculum. Only an Assignment/Attempt
> produces an official graded result.
>
> ⛔ **Content source still blocked by `DOC-011`.** The 10 JSON files are outside this repo at
> `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content`. Their content must be
> validated and imported/seeded before CI or production can use them. Acceptance of the domain is
> not acceptance of the proposed schema below.
>
> ⚠️ **OPEN (CR-8, §8.10)** — whether to keep both sources or import the JSON into MongoDB at seed time is undecided, and moot until the files are located.

### 🔤 F9. Pronunciation & Writing Foundation
*Source: `foundation.json`*

| ID | Feature | Description |
|---|---|---|
| F9.1 | Interactive pinyin table | 21 initials + 36 finals. Tap a cell to hear the sound, see the IPA, examples, and pronunciation tips aimed at Vietnamese speakers (e.g. distinguishing `zh/ch/sh` from `z/c/s`). |
| F9.2 | Tones | The 4 tones (high level ˉ · rising ˊ · dipping ˇ · falling ˋ) with an animated pitch contour, audio, and side-by-side comparison. |
| F9.3 | Tone sandhi | 6 rules: two third tones in a row · three third tones · `不` before a fourth tone · `一` before 4th/1st/2nd/3rd · neutral tone. Each rule shows a before/after example pair. |
| F9.4 | 214 radicals lookup | The full Kangxi table, correctly numbered. Filter by stroke count; look a character up to find its radical. Shares data with F11.3. |
| F9.5 | Foundation listening | 6 passages (ordering food → project discussion, HSK 2–5). Audio first; transcript and translation revealed after answering. |
| F9.6 | Speaking patterns | 6 patterns (greetings → stating an opinion, HSK 1–5) for shadowing practice. |
| F9.7 | Printable material | 4 PDFs: pinyin table · tone contour chart · 214 radicals · basic stroke practice sheet. |

### 📐 F10. Structured Grammar
*Source: `grammar.json` — HSK 1–9*

| ID | Feature | Description |
|---|---|---|
| F10.1 | Browse grammar points | Filter by HSK level and by frequency. Each point shows its formula, an example sentence (characters + pinyin + translation), and notes on common mistakes. |
| F10.2 | Auto-generated exercises | Each point ships with a `tokens` array, so the system generates gap-fill and structure-choice exercises **without a teacher authoring anything**. |
| F10.3 | Practice tracking | Records which points the learner has passed, feeding overall progress (`UserGrammarProgress`). |
| F10.4 | Confusable pairs | Groups easily-confused points for side-by-side comparison: `再` vs `又`, `虽然…但是` vs `尽管…还是`, `与其…不如`. |

> 🔍 **Data to verify before building**: the file declares 60 points but the per-level counts sum to 51. `与其…不如…` appears under both HSK 5 and HSK 8 — one must go.

### ✍️ F11. Character Writing
*Source: `writing.json`*

| ID | Feature | Description |
|---|---|---|
| F11.1 | Stroke-order animation | Plays each stroke from the stored stroke sequence; can be slowed, paused and stepped backwards. |
| F11.2 | Trace and write | The learner draws on a canvas; the system compares stroke count and stroke order against the reference (must match `strokeCount`). |
| F11.3 | Character breakdown | Shows the radical (links to F9.4), example compounds, and a visual mnemonic. |
| F11.4 | Filter and lookup | By HSK level, stroke count, or radical. |

> 🔍 **Distribution is badly skewed**: HSK 1 has 33 characters while HSK 5–9 have roughly 2 per level. Some HSK 9 characters (龘, 爨) are showpieces rather than practical. The declared total (60) does not match the per-level sum (~65).

### 🧱 F12. Lego Sentence Builder
*Source: `lego.json` — 40 sentences across 7 stations*

| ID | Feature | Description |
|---|---|---|
| F12.1 | Station progression | 7 stations unlocked in order: (1) foundation sentences → (2) time & place → (3) particles 了/过/呢 → (4) complements → (5) complex sentences → (6) time adverbials → (7) 把/被/comparison. |
| F12.2 | Drag-and-drop blocks | Each block carries a grammatical role (`S/T/P/A/V/O/C/Q`) and is colour-coded, so the learner sees Chinese word order directly. |
| F12.3 | Explain on error | A wrong ordering surfaces the station's rule rather than just marking it wrong. |
| F12.4 | Endless mode | Uses the 7 spare sentences outside the main stations, shuffled, unlimited. |

### 📄 F13. HSK Mock Exams
*Source: `exams.json` — 11 exams / 161 questions*

| ID | Feature | Description |
|---|---|---|
| F13.1 | Full exams | 9 full papers covering HSK 1–9, with real durations (40′ → 150′) and real pass marks (120/200 for HSK 1–2; 180/300 for HSK 3–9). |
| F13.2 | Skill drills | 2 short papers: HSK 4 listening drill (30′, 9 questions) and HSK 5 reading drill (45′, 9 questions), pass mark 60/100. |
| F13.3 | Timer and auto-submit | Live countdown that locks and submits at time-up — the same mechanism as the Sprint 4 mock test. |
| F13.4 | Detailed review | Per question: Vietnamese instruction, Chinese material, pinyin, four options, correct answer, explanation. |
| F13.5 | Skill breakdown | Separates listening, reading and writing scores against the pass threshold, and writes them to `SkillScore` for the heatmap (Sprint 5). |

### 💼 F14. Workplace Roleplay
*Source: `workplace.json` — 6 scenarios, HSK 4–6*

| ID | Feature | Description |
|---|---|---|
| F14.1 | Scenario selection | Sending a quotation (发送报价单) · morning team meeting · email requesting a delivery reschedule · job interview · negotiating price and payment terms · responding to a late-delivery complaint. |
| F14.2 | Preparation | Context and a domain vocabulary list shown before the dialogue starts. |
| F14.3 | Multi-turn dialogue | 2–3 turns of free-form response, scored against required keywords. |
| F14.4 | Model answers | After each turn, a model sentence and the grading criteria are shown for self-comparison. |

### 🗺️ F15. Curriculum Learning Path
*Source: `learning-path.json`*

| ID | Feature | Description |
|---|---|---|
| F15.1 | Choose a curriculum | **HSK Standard Course** (HSK标准教程, BLCU Press): 8 topics × 9 levels. Or **Chinese Course** (汉语教程, Yang Jizhou, Vietnamese edition): 6 topics × 9 levels. |
| F15.2 | Progress map | Topics unlock in order by level, with per-topic completion percentages. |
| F15.3 | Side quests | 4 types interleaved between topics: vocabulary sprint · rapid listening challenge · character maze · sentence-order puzzle. |
| F15.4 | Boss gates | 3 mandatory gates that must be cleared to advance a level: chapter review · grammar boss · combined listening-speaking exam. |

### 🏆 F16. Motivation & Achievement
*Source: `badges.json`, `levels.json`, `leaderboard.json`*

| ID | Feature | Description |
|---|---|---|
| F16.1 | XP and named levels | 9 levels: 入门 → 基础 → 日常 → 进阶 → 提高 → 流利 → 精通 → 专精 → 大成. |
| F16.2 | Imperial-exam ranks | 6 XP milestones: Đồng sinh (童生, 0) → Tú tài (8,000) → Cử nhân (24,000) → Cống sĩ (26,400) → Tiến sĩ (52,000) → Trạng nguyên (96,000). |
| F16.3 | Streaks | 6 milestones: 7 / 14 / 30 / 60 / 100 / 365 days, with a streak calendar on the student dashboard. |
| F16.4 | Badges | 20 badges across 4 rarities and 6 groups: streak (Khai Bút, Hằng Tâm, Bách Nhật, Chung Thủy) · vocabulary (Nghìn Chữ, Vạn Từ, Tốc Ký) · characters (Bút Thép, Thiết Hoạch, Bộ Thủ Thông) · exams (Sơ Thí, Tam Khoa, Trạng Nguyên, Trường Ốc) · grammar (Cú Pháp Sư, Lego Đại Sư, Vô Lỗi) · community (Đồng Song, Quần Anh, Truyền Đăng). Each has an unlock condition and an XP reward. |
| F16.5 | Leaderboard | 20 fixed simulated rivals so the board is not empty while real usage is low. |

> 🔍 **The XP curve is broken**: Cử nhân (24,000) → Cống sĩ (26,400) is a 2,400-point gap, while Cống sĩ → Tiến sĩ is 25,600. Rebalance.

### 🗄️ 8.9. Proposed persistence concepts — not approved schema

Per-learner progress must be durable and ownership-safe. The table names and fields below came
from the external prototype analysis and remain a proposal; ADR-016 approves the capabilities,
not these SQL boundaries or columns.

| Table | Purpose | Key fields |
|---|---|---|
| `UserGrammarProgress` | F10 progress | `userId`, `grammarPointId`, `status`, `attemptCount`, `lastPracticedAt` |
| `UserCharacterProgress` | F11 progress | `userId`, `characterId`, `strokeAccuracy`, `practiceCount`, `lastPracticedAt` |
| `UserExamResult` | F13 history | `userId`, `examId`, `totalScore`, `passed`, `skillBreakdown` (Json), `durationSeconds`, `takenAt` |
| `UserGamification` | F16, one-to-one with User | `userId`, `totalXp`, `currentStreak`, `longestStreak`, `lastActiveDate`, `rankTitle` |
| `UserBadge` | F16.4 | `userId`, `badgeId`, `earnedAt` — *Index*: unique on `(userId, badgeId)` |
| `UserLearningPath` | F15 progress | `userId`, `curriculumId`, `currentLevel`, `completedTopics` (String[]), `bossCleared` (String[]) |
| `UserLegoProgress` | F12 progress | `userId`, `stationId`, `bestStreak`, `completedAt` |

### ❓ 8.10. Open Questions for This Module

1.  **Content source** — keep static JSON alongside the MongoDB question bank, or import the JSON at seed time? This decides the entire repository layer for F10–F14.
2.  **`progress.default.json`** — currently a demo profile ("Nguyễn Minh Anh", 24,860 XP, 34-day streak). Confirm it is seed/demo only and not a production data shape.
3.  **HSK 7–9 content is thin** — 3–4 grammar points per level, ~2 characters per level, 15 questions per exam. Filling this is authoring work, not engineering; the test pipeline is already in place.
4.  **Speaking input (F14)** — does this need audio recording, or is keyword-scored typed text enough? `workplace.json` currently scores typed text.
5.  ✅ **Relationship to the class model — resolved by ADR-016.** F9–F16 remain personal
    self-study. Teachers may attach catalog units as supplemental practice and view completion
    only for units assigned to active students in their own class. Unrelated self-study history
    remains private. Official grades require an Assignment/Attempt.

---

## ⚠️ 9. Open Conflicts Register

Conflicts found during the 2026-08-31 documentation review, **re-checked against the real repo on
2026-09-01** (`D:\PersonalProject\Real`, HEAD `d277ca1`). Four closed on hard evidence; the rest
still need the project owner.

> **IDs were renamed.** The 2026-08-31 session numbered these `C1`–`C22`, but `ai/PROGRESS.md`
> already uses `C1`, `C2` and `C3` for unrelated backend module blockers, and already uses
> `SCOPE-01` for the Classes/Enrollment scope question. Colliding IDs are worse than ugly ones,
> so this register uses `CR-##` and the product-model conflict is `SCOPE-02`. Old ID = new ID
> minus the prefix.

| ID | Conflict | Where it appears | Status |
|---|---|---|---|
| CR-1 | HSK level range 1–6 vs 1–9 | Everywhere | ✅ **RESOLVED → 1–9**, and it was already resolved on **2026-08-11**, not 2026-08-31. The repo's evidence is stronger: entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md` and `SPRINT_PLAN.md` all use 1–9, matching the HSK 3.0 standard. The 2026-07-27 revert to 1–6 was the mistake. |
| CR-2 | 8 sprints (S0–S7) vs 10 sprints (S0–S9) | §6 here vs `SPRINT_PLAN.md` | ✅ **RESOLVED 2026-09-01 → 10 sprints.** `docs/roadmap/SPRINT_PLAN.md` contains S0–S9. §6 here and `ai/PROGRESS.md` both carry the stale 8-sprint shape → `DOC-012`. |
| CR-3 | Cloudinary vs Supabase Storage for avatars and audio | §1, §3 here vs `docs/` | 🔴 Open — **but the evidence is lopsided.** Supabase Storage: `BACKEND_PLAN.md`, `architecture-layers.mmd`, all three `FEATURES_*.md`, `USECASES_TEACHER.md`, and the only *accepted* module spec `01-auth.md` (3 places, incl. the non-rollbackable-upload ordering rule). Cloudinary: `TECH_STACK.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `PROJECT_STRUCTURE.md`, `QUESTION_BANK.md`, `ENVIRONMENT_SETUP.md`, entity specs. Owner picks; then sweep the loser. |
| CR-6 | Backend at `apps/api/` vs a second backend at `backend/` | §1 here vs the content data | ✅ **RESOLVED 2026-09-01 → one backend, `apps/api/`.** There is no `backend/` directory in the repo. See `DOC-011` for where the content went. |
| CR-7 | Sprint 0 marked "not started" while the repo has scaffolding | `PROGRESS.md` vs `multi-agent-workflow.md` §13 | 🟡 **Partly false as stated.** Verified 2026-09-01: `turbo.json` exists on disk but is **untracked in git** (`BUILD-001` is not fixed); `pnpm-workspace.yaml`, `eslint.config.mjs`, `.prettierrc`, `.npmrc` exist; `apps/api` **does** exist with `prisma/schema.prisma`, `seed.ts` and migration `20260820000000_init_users`; `apps/web` is scaffolded. But **`packages/` does not exist at all** — the claim that the repo root "already contains a `packages/` directory" was wrong. Corrected in `PROGRESS.md`. |
| SCOPE-02 | Product model: multi-role LMS vs single-user self-study | §2 vs §8 | ✅ **RESOLVED 2026-09-03 by ADR-016** → one product, two lanes. Class learning owns official Assignments/Attempts; platform self-study owns personal practice/progress. Teachers may assign catalog units as supplemental practice. The source corpus remains external (`DOC-011`). |
| CR-11 | Gemini 1.5 Flash chosen pre-2026, never reviewed | §1 | 🟡 Worth revisiting |
| CR-13 | Sprint 6 fully specified here and in `SPRINT_PLAN.md`, but marked `⏸ out of scope` in `PROGRESS.md` | §6 vs `PROGRESS.md` | 🔴 Open — `PROGRESS.md` is the outlier of three sources, and its authority (`DECISIONS.md` #5) does not exist. |
| CR-14 | `DECISIONS.md` is referenced by `PROGRESS.md` (#3, #4, #5) and `AI_CHAT_LOG.md`, but the file does not exist | `PROGRESS.md`, `AI_CHAT_LOG.md` | 🟡 **Confirmed absent 2026-09-01** (`find` across the repo returns nothing). Three real decisions have no recorded rationale → `DOC-008`. |
| CR-19 | `packages/shared-types/` vs `packages/types/` | §1 here vs `multi-agent-workflow.md` | ✅ **RESOLVED 2026-09-01 → `packages/types`.** `pnpm-workspace.yaml` declares `packages/*`; `PROGRESS.md` uses `packages/types` in three places. The directory does not exist yet, so this is a naming decision for the first commit that creates it, not a rename. `packages/shared-types` came from this document. |
| CR-20 | Two branch-naming conventions: `feature/S1-task` vs `feat/s1-lane-slice` | §5 here vs `multi-agent-workflow.md` §5 | 🔴 Open |
| CR-21 | `project-brain.md` pointed to `ai/rules/coding-rules.md`; the actual file is `working-rules.md` | `project-brain.md` | ✅ **RESOLVED** — the repo copy has said `working-rules.md` since 2026-07-27. |
| CR-22 | Local infra described as "Postgres 5433, Mongo 27018" is stale — PR #12 renamed the service to `db`, uses `${POSTGRES_PORT:-5432}`, database `hsk_dev`, and dropped the local Mongo container in favour of Atlas | 2026-08-25 session notes | 🟡 Sweep still pending → `DOC-009`. |

### 9.1 What the 2026-09-01 verification changed

The 2026-08-31 review ran in a chat session with **no access to this repository**. It rebuilt
several files from stale copies held in the claude.ai Project, which had not been updated since
July. Consequence: its versions of `KNOWN_ISSUES.md`, `PROGRESS.md`, `HANDOFF.md`,
`working-rules.md` and `multi-agent-workflow.md` were **shorter than the repo's** and reused
existing issue IDs for different problems. Those files were **not** overwritten. Only genuinely
new material was merged in, under new IDs.

Two of that session's headline conclusions were already true here, reached earlier and on better
evidence (HSK 1–9, `working-rules.md`), and one of its factual claims was wrong (`packages/`
existing). Its real contributions are this document, §8, the mount/`unlink` trap (`GIT-003`) and
the content-data defects (`DEBT-003`).
