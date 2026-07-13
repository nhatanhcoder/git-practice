# 📋 Project Summary: HSK Learning Platform

Welcome to the **HSK Learning Platform**! This document provides a high-level overview of the system architecture, core actors (roles), and data entities that power the platform.

---

## 🌟 Overview

The HSK Learning Platform is a modern, full-stack web application designed to facilitate learning, teaching, and administrative management for Chinese language courses (specifically aligned with the **HSK (Hanyu Shuiping Kaoshi)** standards). 

It is designed as a **cost-efficient ($0/month developer stack)** full-stack application using **Next.js 14 (App Router)** and utilizes a hybrid database approach:
- **Relational Data (PostgreSQL via Supabase)**: Used for structured, highly relational data such as users, enrollment details, class sessions, attendance, payroll, and invoicing.
- **Document/Semi-Structured Data (MongoDB Atlas)**: Used for flexible, rich content such as question banks (listening, reading, writing with multiple sub-types), flashcards, and Spaced Repetition System (SRS) states.

---

## 👥 Actors & Roles

The system is built around three primary actors, plus developers/architects:

### 1. 👨‍💼 Admin (Administrator)
The Admin manages the administrative and financial health of the platform:
- **Account Approval**: Approves pending teacher/student registrations and suspends accounts if necessary.
- **Financial Controls**: Sets pay rates for teachers, creates payroll periods, and configures tuition rates for students.
- **Invoicing & Payments**: Generates student invoices, registers tuition payments, and tracks outstanding balances.
- **System Monitoring**: Monitors API quotas, logs, and general platform metrics.

### 2. 👩‍🏫 Teacher
Teachers are the creators of educational content and managers of classroom activities:
- **Class Management**: Manages class settings, generates class enrollment codes, and schedules class sessions.
- **Session & Attendance Tracking**: Logs lesson topics, records student attendance, and submits completed sessions for payroll approval.
- **Content Creation**: Drafts and manages HSK questions (listening, reading, writing) and organizes them into Assignments or Mock Tests.
- **Grading & Feedback**: Reviews student assignment submissions, assigns scores, and provides direct feedback.
- **Payroll Tracking**: Views monthly earnings, approved sessions, and pending payroll statements.

### 3. 🎓 Student
Students are the primary learners on the platform:
- **Class Enrollment**: Joins classes using unique 8-character enrollment codes.
- **Assignments & Mock Tests**: Completes and submits homework or timed mock tests.
- **Self-Directed Study**: Practices vocabulary using flashcards powered by Spaced Repetition (SRS).
- **Performance Analysis**: Monitors grading results, reviews teacher feedback, and tracks progress across reading, writing, and listening skills.
- **Tuition Management**: Views invoices and records payment transactions.

---

## 🗃️ Core Entities & Schema

Below are the central data entities of the platform, structured by database type.

### 🐘 PostgreSQL Relational Entities (via Prisma)

1. **[User](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L79)**
   - Represents all accounts on the platform.
   - **Key Fields**: `email`, `fullName`, `role` (`admin`, `teacher`, `student`), `status` (`pending`, `active`, `suspended`), `hskLevel`, `avatarUrl`, `preferredLanguage`.

2. **[Class](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L113)**
   - A study group led by a Teacher.
   - **Key Fields**: `name`, `hskLevel`, `enrollmentCode` (unique 8-char), `status` (`active`, `archived`).

3. **[ClassEnrollment](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L137)**
   - Junction table linking Students to Classes.
   - **Key Fields**: `classId`, `studentId`, `status` (`active`, `dropped`), `enrolledAt`.

4. **[Assignment](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L154)**
   - Tasks assigned by teachers to a class.
   - **Key Fields**: `title`, `skillType` (listening, reading, writing, mixed), `type` (homework, mock_test), `timeLimitMinutes`, `questionIds` (stored as JSON pointing to MongoDB objects), `dueDate`, `status`.

5. **[Attempt](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L179)** & **[AttemptAnswer](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L202)**
   - Tracks student submissions and corresponding question answers.
   - **Key Fields**: `status` (`in_progress`, `submitted`, `graded`), `totalScore`, `startedAt`, `submittedAt`, `isCorrect`, `score`, `teacherFeedback`.

6. **[ClassSession](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L286)** & **[SessionAttendance](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L317)**
   - Records individual class sessions and student presence.
   - **Key Fields**: `sessionDate`, `startTime`, `endTime`, `actualStartTime`, `actualEndTime`, `status` (`scheduled`, `completed_pending`, `approved`, `rejected`, `paid`), `lessonTopic`, `notes`, `attendanceStatus` (`present`, `absent_excused`, `absent_unexcused`).

7. **[TeacherPayRate](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L346)** & **[PayrollPeriod](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L361)**
   - Teacher financial tracking.
   - **Key Fields**: `rateType` (`per_session`, `per_hour`), `rateAmount`, `effectiveFrom`, `periodStart`, `periodEnd`, `totalAmount`, `status` (`draft`, `finalized`, `paid`).

8. **[StudentTuitionRate](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L403)**, **[StudentInvoice](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L421)** & **[TuitionPayment](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L442)**
   - Student billing tracking.
   - **Key Fields**: `rateAmount`, `invoiceDate`, `periodStart`, `periodEnd`, `totalAmount`, `status` (`unpaid`, `partially_paid`, `paid`, `void`), `amount` (paid), `paymentMethod`, `transactionReference`.

9. **[Notification](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/prisma/schema.prisma#L240)**
   - Platform alerts system.
   - **Key Fields**: `recipientId`, `senderId`, `type` (`new_assignment`, `deadline_reminder`, `graded`, `weak_student_alert`, `account_approved`, `account_suspended`), `message`, `readAt`.

### 🍃 MongoDB Document Entities (via Mongoose)

1. **Question**
   - High-fidelity HSK examination questions. Contains sub-documents for options, correct answers, reading passage texts, or listening audio file URLs.
   - **Attributes**: `hskLevel`, `skill` (`listening`, `reading`, `writing`), `subType` (e.g., *multiple choice, true/false, sentence ordering, gap fill*), `content` (text/audio), `options`, `correctAnswer`, `explanation`, `createdBy`.

2. **Flashcard & UserFlashcardState**
   - Vocabulary lists and personal retention records.
   - **Attributes**: `chineseWord`, `pinyin`, `vietnameseMeaning`, `englishMeaning`, `hskLevel`, `exampleSentence`, `audioUrl`, `boxNumber` (SRS), `nextReviewDate`, `easeFactor`, `repetitionsCount`.

---

## 📂 Navigation & Documentation Index

To explore further, please refer to the following documents located in the `docs/` folder:

- **General Project Conventions & Technology Stack**:
  - [TECH_STACK.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/shared/TECH_STACK.md) — Architectural decisions and free-tier limits.
  - [CONVENTIONS.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/shared/CONVENTIONS.md) — Git workflows, styling standards, and codebase rules.
  - [PROJECT_STRUCTURE.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/shared/PROJECT_STRUCTURE.md) — Deep dive into folders, directories, and import patterns.
  - [DATABASE_SCHEMA.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/shared/DATABASE_SCHEMA.md) — Complete ERD explanation and database configurations.

- **Role-Specific Feature Specifications**:
  - [FEATURES_ADMIN.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/admin/FEATURES_ADMIN.md) / [USECASES_ADMIN.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/admin/USECASES_ADMIN.md)
  - [FEATURES_TEACHER.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/teacher/FEATURES_TEACHER.md) / [USECASES_TEACHER.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/teacher/USECASES_TEACHER.md)
  - [FEATURES_STUDENT.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/student/FEATURES_STUDENT.md) / [USECASES_STUDENT.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/student/USECASES_STUDENT.md)

- **Detailed Entity Specifications**:
  - Find all specs under `docs/entities/` (e.g., [ENTITY_USER.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/entities/ENTITY_USER.md), [ENTITY_CLASS.md](file:///c:/Users/nhata/OneDrive/M%C3%A1y%20t%C3%ADnh/Web%20ti%E1%BA%BFng%20trung%20docx/docs/entities/ENTITY_CLASS.md), etc.).
