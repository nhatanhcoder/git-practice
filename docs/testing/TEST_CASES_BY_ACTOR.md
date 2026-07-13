# Test Cases by Actor

> Test cases quan trọng nhất theo actor. Link flow tuong ung de hieu context.  
> Tool: Jest (unit/integration) + Playwright (e2e)

---

## Admin

| # | Test Case | Flow | Type |
|---|-----------|------|------|
| A-TC-1 | Approve pending user → status=active, notification sent | FLOW_AUTH | Integration |
| A-TC-2 | Suspend active user → 403 on login | FLOW_AUTH | Integration |
| A-TC-3 | Approve session → included in payroll period total | FLOW_PAYROLL_CYCLE | Integration |
| A-TC-4 | Reject session → not included in payroll | FLOW_PAYROLL_CYCLE | Integration |
| A-TC-5 | Create invoice → student can view | FLOW_TUITION_VIETQR | Integration |
| A-TC-6 | Record payment → invoice status updates | FLOW_TUITION_VIETQR | Integration |

---

## Teacher

| # | Test Case | Flow | Type |
|---|-----------|------|------|
| T-TC-1 | Create class → unique 8-char enrollmentCode generated | FLOW_ENROLLMENT | Unit |
| T-TC-2 | Create listening question with audio → saved in MongoDB | QUESTION_BANK | Integration |
| T-TC-3 | Create mock test with timeLimitMinutes → student sees timer | FLOW_ASSIGNMENT_LIFECYCLE | Integration |
| T-TC-4 | Grade writing attempt → AI suggest returns score | FLOW_GRADING | Integration |
| T-TC-5 | Grade attempt → student gets notification | FLOW_GRADING | Integration |
| T-TC-6 | Submit session → status=completed_pending | FLOW_PAYROLL_CYCLE | Integration |

---

## Student

| # | Test Case | Flow | Type |
|---|-----------|------|------|
| S-TC-1 | Join class with valid code → ClassEnrollment created | FLOW_ENROLLMENT | Integration |
| S-TC-2 | Join class with invalid code → 404 | FLOW_ENROLLMENT | Unit |
| S-TC-3 | Start attempt → auto-save answers every 2s | FLOW_ASSIGNMENT_LIFECYCLE | E2E |
| S-TC-4 | Mock test timer expires → auto-submit | FLOW_ASSIGNMENT_LIFECYCLE | E2E |
| S-TC-5 | SRS review: Again → easeFactor decreases, nextReviewDate = tomorrow | FLOW_SRS_REVIEW | Unit |
| S-TC-6 | SRS review: Easy → easeFactor increases, interval > 6 days | FLOW_SRS_REVIEW | Unit |
| S-TC-7 | View graded result → see score + feedback per question | FLOW_GRADING | Integration |

---

## Cross-Actor E2E Scenarios

| # | Scenario | Steps |
|---|----------|-------|
| E2E-1 | Full student journey | Register → Approve → Join class → Take test → Get graded → View result |
| E2E-2 | Payroll cycle | Teacher logs session → Admin approves → Payroll period created → Paid |
| E2E-3 | SRS study session | Student browses flashcards → Reviews 10 cards → Stats updated |
