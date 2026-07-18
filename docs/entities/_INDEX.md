# 🗃️ Entities Index

> Bảng tra cứu nhanh: entity → DB → file spec → actor liên quan → flow liên quan

---

## 🐘 PostgreSQL Entities

| Entity | File | Status | Actors | Flows liên quan |
|--------|------|--------|--------|----------------|
| **User** | [ENTITY_USER.md](postgres/ENTITY_USER.md) | ✅ | Admin, Teacher, Student | FLOW_AUTH |
| **Class** | [ENTITY_CLASS.md](postgres/ENTITY_CLASS.md) | ✅ | Teacher, Student | FLOW_ENROLLMENT |
| **ClassEnrollment** | [ENTITY_CLASS_ENROLLMENT.md](postgres/ENTITY_CLASS_ENROLLMENT.md) | ✅ | Teacher, Student | FLOW_ENROLLMENT |
| **Lesson** | [ENTITY_LESSON.md](postgres/ENTITY_LESSON.md) | ✅ | Teacher, Student | LESSON_FLOW |
| **LessonAssignment** | [ENTITY_LESSON_ASSIGNMENT.md](postgres/ENTITY_LESSON_ASSIGNMENT.md) | ✅ | Teacher, Student | LESSON_FLOW |
| **Assignment** | [ENTITY_ASSIGNMENT.md](postgres/ENTITY_ASSIGNMENT.md) | ✅ | Teacher, Student | FLOW_ASSIGNMENT_LIFECYCLE |
| **Attempt** | [ENTITY_ATTEMPT.md](postgres/ENTITY_ATTEMPT.md) | ✅ | Student, Teacher | FLOW_ASSIGNMENT_LIFECYCLE, FLOW_GRADING |
| **AttemptAnswer** | [ENTITY_ATTEMPT_ANSWER.md](postgres/ENTITY_ATTEMPT_ANSWER.md) | ✅ | Student, Teacher | FLOW_GRADING |
| **ClassSession** | [ENTITY_CLASS_SESSION.md](postgres/ENTITY_CLASS_SESSION.md) | ✅ | Teacher, Admin | FLOW_SESSION_ATTENDANCE, FLOW_PAYROLL_CYCLE |
| **SessionAttendance** | [ENTITY_SESSION_ATTENDANCE.md](postgres/ENTITY_SESSION_ATTENDANCE.md) | ✅ | Teacher, Student | FLOW_SESSION_ATTENDANCE |
| **TeacherPayRate** | [ENTITY_TEACHER_PAY_RATE.md](postgres/ENTITY_TEACHER_PAY_RATE.md) | ✅ | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **PayrollPeriod** | [ENTITY_PAYROLL_PERIOD.md](postgres/ENTITY_PAYROLL_PERIOD.md) | ✅ | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **StudentTuitionRate** | [ENTITY_STUDENT_TUITION_RATE.md](postgres/ENTITY_STUDENT_TUITION_RATE.md) | ✅ | Admin, Student | FLOW_TUITION |
| **StudentInvoice** | [ENTITY_STUDENT_INVOICE.md](postgres/ENTITY_STUDENT_INVOICE.md) | ✅ | Admin, Student | FLOW_TUITION |
| **TuitionPayment** | [ENTITY_TUITION_PAYMENT.md](postgres/ENTITY_TUITION_PAYMENT.md) | ✅ | Admin, Student | FLOW_TUITION |
| **Notification** | [ENTITY_NOTIFICATION.md](postgres/ENTITY_NOTIFICATION.md) | ✅ | All | FLOW_NOTIFICATION |
| **QuizRoom** | [ENTITY_QUIZ_ROOM.md](postgres/ENTITY_QUIZ_ROOM.md) | ✅ | Teacher (host), Student | FLOW_QUIZ_ROOM |
| **QuizParticipant** | [ENTITY_QUIZ_PARTICIPANT.md](postgres/ENTITY_QUIZ_PARTICIPANT.md) | ✅ | Student | FLOW_QUIZ_ROOM |

---

## 🍃 MongoDB Entities

| Entity | File | Status | Actors | Flows liên quan |
|--------|------|--------|--------|----------------|
| **Question** | [ENTITY_QUESTION.md](mongodb/ENTITY_QUESTION.md) | ✅ | Teacher | FLOW_ASSIGNMENT_LIFECYCLE |
| **Flashcard** | [ENTITY_FLASHCARD.md](mongodb/ENTITY_FLASHCARD.md) | ✅ | Student | FLOW_SRS_REVIEW |
| **UserFlashcardState** | [ENTITY_USER_FLASHCARD_STATE.md](mongodb/ENTITY_USER_FLASHCARD_STATE.md) | ✅ | Student | FLOW_SRS_REVIEW |
| **UserSavedWord** | [ENTITY_USER_SAVED_WORD.md](mongodb/ENTITY_USER_SAVED_WORD.md) | ✅ | Student | FLOW_WORD_BANK |
| ~~Lesson~~ | [ENTITY_LESSON.md](mongodb/ENTITY_LESSON.md) | ⚠️ Moved to PG | — | — |

---

## Sprint → Entities Introduced

| Sprint | New Entities |
|--------|-------------|
| S0 | *(schema scaffold only)* |
| S1 | `User`, `Notification` |
| S2 | `Class`, `ClassEnrollment`, `Lesson`, `LessonAssignment` |
| S3 | `Question`, `Assignment` |
| S4 | `Attempt`, `AttemptAnswer` |
| S5 | `Flashcard`, `UserFlashcardState`, `UserSavedWord` |
| S6 | `ClassSession`, `SessionAttendance`, `TeacherPayRate`, `PayrollPeriod` |
| S7 | `StudentTuitionRate`, `StudentInvoice`, `TuitionPayment` |
| S8 | `QuizRoom`, `QuizParticipant` |

---

## Status Key

| Symbol | Nghĩa |
|--------|-------|
| ✅ | Spec đầy đủ |
| 🚧 | Stub, cần bổ sung |
| ⚠️ | Gap hoặc đã di chuyển |
