# 🗃️ Entities Index

> Bảng tra cứu nhanh: entity → DB → file spec → actor liên quan → flow liên quan

---

## 🐘 PostgreSQL Entities

| Entity | File | Actors | Flows liên quan |
|--------|------|--------|----------------|
| **User** | [ENTITY_USER.md](postgres/ENTITY_USER.md) | Admin, Teacher, Student | FLOW_AUTH |
| **Class** | [ENTITY_CLASS.md](postgres/ENTITY_CLASS.md) | Teacher, Student | FLOW_ENROLLMENT |
| **ClassEnrollment** | [ENTITY_CLASS_ENROLLMENT.md](postgres/ENTITY_CLASS_ENROLLMENT.md) | Teacher, Student | FLOW_ENROLLMENT |
| **Assignment** | [ENTITY_ASSIGNMENT.md](postgres/ENTITY_ASSIGNMENT.md) | Teacher, Student | FLOW_ASSIGNMENT_LIFECYCLE |
| **Attempt** | [ENTITY_ATTEMPT.md](postgres/ENTITY_ATTEMPT.md) | Student, Teacher | FLOW_ASSIGNMENT_LIFECYCLE, FLOW_GRADING |
| **AttemptAnswer** | [ENTITY_ATTEMPT_ANSWER.md](postgres/ENTITY_ATTEMPT_ANSWER.md) | Student, Teacher | FLOW_GRADING |
| **ClassSession** | [ENTITY_CLASS_SESSION.md](postgres/ENTITY_CLASS_SESSION.md) | Teacher, Admin | FLOW_SESSION_ATTENDANCE, FLOW_PAYROLL_CYCLE |
| **SessionAttendance** | [ENTITY_SESSION_ATTENDANCE.md](postgres/ENTITY_SESSION_ATTENDANCE.md) | Teacher, Student | FLOW_SESSION_ATTENDANCE |
| **TeacherPayRate** | [ENTITY_TEACHER_PAY_RATE.md](postgres/ENTITY_TEACHER_PAY_RATE.md) | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **PayrollPeriod** | [ENTITY_PAYROLL_PERIOD.md](postgres/ENTITY_PAYROLL_PERIOD.md) | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **StudentTuitionRate** | [ENTITY_STUDENT_TUITION_RATE.md](postgres/ENTITY_STUDENT_TUITION_RATE.md) | Admin, Student | FLOW_TUITION_VIETQR |
| **StudentInvoice** | [ENTITY_STUDENT_INVOICE.md](postgres/ENTITY_STUDENT_INVOICE.md) | Admin, Student | FLOW_TUITION_VIETQR |
| **TuitionPayment** | [ENTITY_TUITION_PAYMENT.md](postgres/ENTITY_TUITION_PAYMENT.md) | Admin, Student | FLOW_TUITION_VIETQR |
| **Notification** | [ENTITY_NOTIFICATION.md](postgres/ENTITY_NOTIFICATION.md) | All | FLOW_NOTIFICATION |

---

## 🍃 MongoDB Entities

| Entity | File | Actors | Flows liên quan |
|--------|------|--------|----------------|
| **Question** | [ENTITY_QUESTION.md](mongodb/ENTITY_QUESTION.md) | Teacher | FLOW_ASSIGNMENT_LIFECYCLE |
| **Flashcard** | [ENTITY_FLASHCARD.md](mongodb/ENTITY_FLASHCARD.md) | Student | FLOW_SRS_REVIEW |
| **UserFlashcardState** | [ENTITY_USER_FLASHCARD_STATE.md](mongodb/ENTITY_USER_FLASHCARD_STATE.md) | Student | FLOW_SRS_REVIEW |
| **Lesson** ⚠️ GAP | [ENTITY_LESSON.md](mongodb/ENTITY_LESSON.md) | Teacher, Student | LESSON_BANK |

> ⚠️ `ENTITY_LESSON.md` chưa có spec đầy đủ — xem [ADR-003](../shared/decisions/003-lesson-bank-muc1-embedded.md) để hiểu design decision.

---

## Status Key

| Symbol | Nghĩa |
|--------|-------|
| ✅ | Spec đầy đủ |
| 🚧 | Stub, cần bổ sung |
| ⚠️ | Gap — chưa có spec |
