# 👩‍🏫 Teacher — Feature Specification

> **Role**: Teacher  
> **Scope**: Class management, lesson management, content creation, grading, analytics, attendance, payroll tracking  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-AUTH-1 | Register an account (awaits admin approval) | 🔴 Must | status = pending |
| T-AUTH-2 | Log in with email + password | 🔴 Must | JWT access + refresh token |
| T-AUTH-3 | Log out | 🔴 Must | |
| T-AUTH-4 | Automatic JWT refresh token renewal | 🔴 Must | Silent re-auth |
| T-AUTH-5 | Change password | 🟡 Should | |
| T-AUTH-6 | Update profile (name, bio) + upload avatar | 🟡 Should | Supabase Storage |

---

## 🏫 Class Management

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-CLASS-1 | Create a class (name, HSK level) | 🔴 Must | Auto-generates an 8-char enrollmentCode |
| T-CLASS-2 | View the list of classes they teach | 🔴 Must | Name, HSK level, enrollment code, student count, status |
| T-CLASS-3 | View / regenerate the enrollment code | 🔴 Must | |
| T-CLASS-4 | View the student list for a class | 🔴 Must | Name, email, join date, status, average score; attendance rate after Sprint 5 |
| T-CLASS-5 | Archive / close a class | 🟡 Should | status: active → archived |
| T-CLASS-6 | Edit class details | 🟡 Should | |

> 📄 Details: CLASS_MANAGEMENT.md

---

## 📚 Lesson Management

> **Note**: Lesson is a new entity — its definition (document/video/description + its relationship to assignments) and its ordering mechanism must be settled before building.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-LESSON-1 | Create a lesson in a class (title, description, document/video) | 🔴 Must | Attached to a specific class |
| T-LESSON-2 | Order lessons (drag-and-drop or an index number) | 🔴 Must | Students see the correct order |
| T-LESSON-3 | Attach an Assignment to a Lesson | 🔴 Must | 1 lesson → N assignments (or M:N — to be settled) |
| T-LESSON-4 | Edit / delete a lesson | 🟡 Should | |
| T-LESSON-5 | View the lesson list for a class | 🔴 Must | Preview of order + status |

---

## 📝 Question Bank

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-QB-1 | Create a Listening question | 🔴 Must | Upload audio, choose a sub-type |
| T-QB-2 | Create a Reading question | 🔴 Must | Passage + questions |
| T-QB-3 | Create a Writing question | 🔴 Must | Prompt, rubric |
| T-QB-4 | Browse / search the question bank | 🔴 Must | Filters: skill, HSK level, sub-type |
| T-QB-5 | Edit / delete a question | 🟡 Should | |
| T-QB-6 | Preview a question | 🟡 Should | |

**8+ supported sub-types:**

| Skill | Sub-Type |
|-------|----------|
| Listening | multiple_choice_single, true_false_not_given, short_answer |
| Reading | multiple_choice_single, multiple_choice_multi, true_false_not_given, fill_in_blank, sentence_ordering, matching |
| Writing | sentence_construction, essay |

> 📄 Details: QUESTION_TYPES.md

---

## 📋 Assignments & Tests

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-ASGN-1 | Create an Assignment from the question bank | 🔴 Must | Choose class, dueDate, questions |
| T-ASGN-2 | Create a Mock Test (with a time limit) | 🔴 Must | timeLimitMinutes |
| T-ASGN-3 | View the list of created assignments | 🔴 Must | Title, type, class, due date, submission count, pending-grading count |
| T-ASGN-4 | See how many students have / have not submitted | 🟡 Should | |
| T-ASGN-5 | Edit / delete an assignment (before any submission) | 🟡 Should | |

---

## ✅ Grading

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-GRADE-1 | View submitted work awaiting grading | 🔴 Must | Filters: class, assignment |
| T-GRADE-2 | View a student's submission in detail | 🔴 Must | Per question + answer |
| T-GRADE-3 | AI-suggested score for Writing questions (Gemini) | 🔴 Must | score + reasoning — a suggestion only; the teacher still grades manually |
| T-GRADE-4 | Enter a score + feedback per question | 🔴 Must | |
| T-GRADE-5 | Finish grading → update status (graded) | 🔴 Must | Trigger: graded notification to the student |
| T-GRADE-6 | Change a score after grading | 🟢 Could | |

> 📄 Details: AI_FEATURES.md

---

## 📈 Analytics & Alerts

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-ANL-1 | View class results: score chart, score distribution, submission rate | 🔴 Must | Average score per assignment, distribution chart |
| T-ANL-2 | List of submissions per student | 🔴 Must | |
| T-ANL-3 | Detect struggling students (weak student alerts) | 🟡 Should | Score below a threshold (F8.3) |
| T-ANL-4 | View each student's progress by skill | 🟡 Should | Skill breakdown (Listening / Reading / Writing) per student |

> 📄 Details: ANALYTICS_FLOW.md

---

## 🗓️ Sessions & Attendance

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-SES-1 | Create a class session (date, startTime, endTime, topic) | 🔴 Must | status: scheduled |
| T-SES-2 | Start the session (records actualStartTime) | 🔴 Must | Compared against the scheduled time to spot late or make-up classes |
| T-SES-3 | Record student attendance (present / absent_excused / absent_unexcused) | 🔴 Must | |
| T-SES-4 | End the session (records actualEndTime, notes) | 🔴 Must | |
| T-SES-5 | Submit the session for admin approval (→ completed_pending) | 🔴 Must | Feeds salary calculation in Sprint 6 |
| T-SES-6 | View approval status (approved / rejected + reason) | 🟡 Should | |
| T-SES-7 | View session history & the admin's review notes | 🟡 Should | Date, topic, actual times, status, attendance |

> 📄 Details: SESSION_ATTENDANCE.md

---

## 💵 Income

> **Note**: View-only — salary calculation lives on the Admin side (A-PAY-4/5). Only approved sessions count toward salary. Still to be settled: whether the pay rate is fixed or varies by class/hour, and whether payroll periods are monthly or on another cycle.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-INC-1 | View monthly income (approved sessions) | 🔴 Must | |
| T-INC-2 | View each payroll period in detail (PayrollPeriod) | 🟡 Should | status: draft / finalized / paid |
| T-INC-3 | View the history of all payroll periods | 🟡 Should | Sessions in the period, rate per session, total |

---

## 🔔 Notifications Received

| Notification type | Trigger |
|----------------|---------|
| Account approved | Admin approves the account |
| Account suspended | Admin suspends the account |
| Session approved | Admin approves the session |
| Session rejected (with a reason) | Admin rejects the session |

> 📄 Details: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait for admin approval) → Login
  └─► Dashboard
        ├─► Classes → Create Class → Share enrollment code
        │     ├─► Lessons → Create lesson → Order them → Attach assignments
        │     └─► Session → Log → Mark attendance → Submit for approval
        ├─► Question Bank → Create questions (Listening/Reading/Writing)
        │     └─► Assignments → Create from questions → Assign to class
        ├─► Grading → Review submissions → AI suggest (Gemini) → Enter score + feedback
        ├─► Analytics → Class dashboard (score chart, submission rate, weak students, skill breakdown)
        └─► Income → View monthly earnings → Payroll history
```
