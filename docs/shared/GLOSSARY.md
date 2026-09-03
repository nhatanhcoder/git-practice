# 📖 Glossary — HSK Learning Platform

> Domain and technical terminology, used consistently across all docs.  
> When adding a new term, update this file first, then use it elsewhere.

---

## A

| Term | Definition |
|------|-----------|
| **Access Token** | Short-lived JWT (15 minutes), held in Zustand (memory). Used to authenticate every API call. |
| **Attempt** | One student's run at an Assignment. A PostgreSQL entity. |
| **AttemptAnswer** | A single student answer to one question within an Attempt. |

## B

| Term | Definition |
|------|-----------|
| **boxNumber** | Legacy/mock-only Leitner box used by the current Student FE. Not part of the production SRS contract after ADR-016. |

## C

| Term | Definition |
|------|-----------|
| **ClassEnrollment** | The record linking Student ↔ Class. Created when a student enters an enrollmentCode. |
| **ClassSession** | An actual class session. Teacher logs it → submits → admin approves → payroll. |

## E

| Term | Definition |
|------|-----------|
| **easeFactor** | A flashcard's ease coefficient in SM-2. Starts at 2.5, decreases on an "Again/Hard" rating, increases on "Easy". Min: 1.3. |
| **enrollmentCode** | An 8-character code (uppercase letters + digits) students use to join a class. Auto-generated when the teacher creates the class. |

## F

| Term | Definition |
|------|-----------|
| **Flashcard** | A Chinese vocabulary card in MongoDB. Contains: hanzi, pinyin, Vietnamese/English meaning, example, audio. |

## G

| Term | Definition |
|------|-----------|
| **Grading** | The process of a teacher scoring an Attempt after the student submits. States: submitted → graded. |

## H

| Term | Definition |
|------|-----------|
| **HSK** | Hanyu Shuiping Kaoshi — the international Chinese proficiency exam. Levels 1–9 (HSK 1 is the easiest). |
| **hskLevel** | The field holding an HSK level (1–9); applies to User, Class, Question, and Flashcard. |

## I

| Term | Definition |
|------|-----------|
| **Invoice** | See **StudentInvoice** |

## J

| Term | Definition |
|------|-----------|
| **JWT** | JSON Web Token. The platform uses two kinds: Access Token (15 minutes) + Refresh Token (7 days). |

## M

| Term | Definition |
|------|-----------|
| **Mock Test** | An Assignment type with a time limit (timeLimitMinutes). Auto-submits when time runs out. |

## N

| Term | Definition |
|------|-----------|
| **nextReviewDate** | The next date an SRS card is due for review. Computed by the SM-2 algorithm. |

## P

| Term | Definition |
|------|-----------|
| **PayrollPeriod** | A teacher's pay period (periodStart → periodEnd). States: draft → finalized → paid. |
| **Pinyin** | The romanisation system for Chinese. Example: 你好 = nǐ hǎo. |

## Q

| Term | Definition |
|------|-----------|
| **Question** | A question in the question bank (MongoDB). Has a skill (listening/reading/writing) and a subType. |
| **Question Bank** | The full set of questions belonging to a teacher or to the platform. Used to build Assignments. |

## R

| Term | Definition |
|------|-----------|
| **RBAC** | Role-Based Access Control. See [RBAC_MATRIX.md](./RBAC_MATRIX.md). |
| **Refresh Token** | Long-lived JWT (7 days), stored in an httpOnly cookie. Used to obtain a new Access Token. |
| **repetitionsCount** | The number of consecutive successful reviews. Used by SM-2 to compute the next interval. |

## S

| Term | Definition |
|------|-----------|
| **SM-2** | The Spaced Repetition algorithm (SuperMemo 2). Computes the interval from easeFactor and repetitionsCount. |
| **SRS** | Spaced Repetition System. A review system whose intervals grow as recall strengthens. |
| **StudentInvoice** | A tuition invoice for a student. Created by an admin, viewed by the student. States: unpaid/partially_paid/paid/void. |

## T

| Term | Definition |
|------|-----------|
| **timeLimitMinutes** | The time limit for a Mock Test (in minutes). Null = no limit (an ordinary Assignment). |
| **TuitionPayment** | A tuition payment record. Linked to a StudentInvoice. |

## U

| Term | Definition |
|------|-----------|
| **UserFlashcardState** | The SM-2 state for one user × one flashcard. Contains easeFactor, repetitionsCount, intervalDays and nextReviewDate; no production `boxNumber`. |

## V

| Term | Definition |
|------|-----------|
| **VietQR** | The Vietnamese bank payment QR standard. Used for student tuition payments, reconciled manually by an admin. |
