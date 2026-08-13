# 🎓 Student — Feature Specification

> **Role**: Student (User)  
> **Scope**: Class enrollment, lessons, assignments, SRS flashcards, skill drill, quiz room, progress tracking, billing  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-AUTH-1 | Register an account (awaits admin approval) | 🔴 Must | status = pending |
| S-AUTH-2 | Log in with email + password | 🔴 Must | JWT access + refresh token |
| S-AUTH-3 | Log out | 🔴 Must | |
| S-AUTH-4 | Automatic JWT refresh token renewal | 🔴 Must | Silent re-auth |
| S-AUTH-5 | Change password | 🟡 Should | |
| S-AUTH-6 | Update profile (nickname, target HSK level) + avatar | 🟡 Should | Supabase Storage |

---

## 🏫 Class Participation

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-CLS-1 | Join a class with an enrollment code (8 characters) | 🔴 Must | Creates a ClassEnrollment record |
| S-CLS-2 | View the list of joined classes | 🔴 Must | Class name, teacher, HSK level |
| S-CLS-3 | View class information (teacher, HSK level, schedule) | 🟡 Should | |
| S-CLS-4 | Leave a class | 🟢 Could | status: dropped |

---

## 📚 Lessons

> **Note**: Lessons are a class's core content. This is a new entity — its definition (document/video/description + its relationship to assignments) must be settled before building.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-LESSON-1 | View the ordered lesson list for a class | 🔴 Must | Ordered list, each lesson with its related assignments |
| S-LESSON-2 | View a lesson's content in detail | 🔴 Must | Document / video / description |
| S-LESSON-3 | View assignments attached to a lesson | 🟡 Should | Links to an Assignment (if any) |

---

## 📋 Assignments & Tests

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ASGN-1 | View assigned work (by class) | 🔴 Must | Status: not started / in progress / submitted / graded |
| S-ASGN-2 | Start an Assignment / Mock Test | 🔴 Must | Creates an Attempt record |
| S-ASGN-3 | Auto-save answers every 2 seconds | 🔴 Must | Avoids data loss on network drop |
| S-ASGN-4 | Countdown timer (Mock Test) | 🔴 Must | timeLimitMinutes, auto-submits when time runs out |
| S-ASGN-5 | Navigate questions via the sidebar | 🔴 Must | Marks: not answered / answered / flagged |
| S-ASGN-6 | Submit | 🔴 Must | status: submitted — locked, no further edits |
| S-ASGN-7 | View the result once graded | 🔴 Must | Total score + per-question feedback (MCQ automatic, Writing awaits the teacher) |
| S-ASGN-8 | Review the submission (correct answers + teacher comments) | 🟡 Should | Only after grading |

---

## 🃏 SRS Flashcards

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-SRS-1 | Browse vocabulary by HSK level (1–9) | 🔴 Must | MongoDB Flashcard collection |
| S-SRS-2 | Start a review session | 🔴 Must | Fetches cards due by nextReviewDate |
| S-SRS-3 | Rate: Again / Hard / Good / Easy | 🔴 Must | The SM-2 algorithm updates easeFactor and nextReviewDate |
| S-SRS-4 | View the front → flip → see the answer | 🔴 Must | hanzi, pinyin, meaning, example |
| S-SRS-5 | SRS stats dashboard (streak, cards due, retention rate) | 🟡 Should | |
| S-SRS-6 | **Click a word/hanzi in any content → save it to a personal word bank** | 🟡 Should | Available from Lessons, reading passages, and the flashcard browser → creates a `UserSavedWord` record |
| S-SRS-7 | View & manage the saved word bank | 🟡 Should | List of saved words, delete a word, start a review session from the personal word bank |

> 📄 Details: SRS_ALGORITHM.md (docs/architecture/)

---

## 🏋️ Skill Drill (Self-practice)

> **Note**: Entirely separate from teacher-assigned work — no official grade, and the answer is revealed after each question.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-DRILL-1 | Pick a skill (reading / listening / writing) + HSK level + difficulty | 🟡 Should | Filters applied before starting |
| S-DRILL-2 | Practise without an official grade | 🟡 Should | The correct answer is shown after each question |
| S-DRILL-3 | View a practice session summary (correct/incorrect) | 🟢 Could | Not saved to the grade record |

---

## 🎮 Quiz Room (Live, Real-time)

> **Note**: Requires WebSocket infrastructure. Still to be settled: who creates the room (Teacher?), and where the questions come from (the question bank?).

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-QUIZ-1 | Enter a room code to join a quiz room | 🟡 Should | Enters the waiting room and sees the player list |
| S-QUIZ-2 | Answer questions in real time (simultaneously with all players) | 🟡 Should | Per-question timer; faster + correct → higher score |
| S-QUIZ-3 | View the live leaderboard in the room | 🟡 Should | Rank updates after each question; final rank shown at the end |

---

## 📊 Progress & Analytics

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ANL-1 | Skill × week heatmap (Listening / Reading / Writing) | 🔴 Must | |
| S-ANL-2 | Progress chart of average score over time | 🔴 Must | |
| S-ANL-3 | View the score for each completed assignment | 🔴 Must | |
| S-ANL-4 | Global leaderboard (ranked by score / streak / retention) | 🟡 Should | Aggregates all study activity |
| S-ANL-5 | Compare against the class average | 🟢 Could | |

> 📄 Details: ANALYTICS_FLOW.md

---

## 🧾 Billing (Tuition)

> **Note**: View-only — invoice creation lives on the Admin side (A-INV-2). The tuition pricing model (per class / package / month) must be settled before building.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-BILL-1 | View the list of tuition invoices | 🔴 Must | status: unpaid / partially_paid / paid |
| S-BILL-2 | View invoice detail (period, amount, payments) | 🟡 Should | |
| S-BILL-3 | Get notified when a new invoice is issued | 🟡 Should | Notification trigger |

> 📄 Details: INVOICE_FLOW.md

---

## 🔔 Notifications Received

| Notification type | Trigger |
|----------------|---------|
| Account approved | Admin approves the account |
| Account suspended | Admin suspends the account |
| New assignment issued | Teacher creates an assignment |
| Submission deadline approaching | Deadline reminder (scheduler) |
| Work has been graded | Teacher finishes grading |
| New invoice | Admin creates a StudentInvoice |

> 📄 Details: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait for admin approval) → Login
  └─► Dashboard (assignments due, SRS cards due)
        ├─► Classes → Join via code → View class details
        │     └─► Lessons → View lesson list → View content + attached assignments
        ├─► Assignments → View list → Start attempt
        │     ├─► Auto-save + timer (mock test)
        │     ├─► Navigate questions via sidebar
        │     └─► Submit → await grading → View results + feedback
        ├─► SRS Flashcards → Browse HSK level → Study session
        │     └─► Rate: Again/Hard/Good/Easy → SM-2 schedules next review
        ├─► Skill Drill → Pick skill + HSK + difficulty → Practise (ungraded)
        ├─► Quiz Room → Enter room code → Wait → Play real-time → View leaderboard
        ├─► Progress → Heatmap + charts + scores + global leaderboard
        └─► Billing → View invoices + payment history
```

---

## 🔗 Related

| Document | Path |
|---------|----------|
| SRS Algorithm | docs/architecture/SRS_ALGORITHM.md |
| Exam Engine | docs/architecture/EXAM_ENGINE.md |
| Analytics Flow | ANALYTICS_FLOW.md |
| Invoice Flow | INVOICE_FLOW.md |
| Notification Flow | NOTIFICATION_FLOW.md |
| Admin Features | FEATURES_ADMIN.md |
| Teacher Features | FEATURES_TEACHER.md |
