# 👨‍💼 Admin — Use Cases

> Detailed use cases for the Admin.  
> Feature list: [FEATURES_ADMIN.md](./FEATURES_ADMIN.md)  
> Permissions: [PERMISSIONS_ADMIN.md](./PERMISSIONS_ADMIN.md)

---

## UC-A-001: Approve a user account

**Actor**: Admin  
**Trigger**: Receives a "new account awaiting approval" notification (new_teacher_registration / new_student_registration)  
**Precondition**: The user has registered, status = `pending`

**Main Flow**:
1. Admin opens the Dashboard → sees the "Pending users" badge
2. Admin opens the user list → filters `status=pending`
3. Admin reviews the user's profile (name, email, role)
4. Admin clicks "Approve"
5. System: status `pending → active`, sends an `account_approved` notification
6. The user can now log in

**Alternative**: Admin clicks "Reject" → the user is notified and the account is either deleted or left pending

---

## UC-A-002: Create monthly tuition invoices

**Actor**: Admin  
**Trigger**: The start of each month  
**Precondition**: A StudentTuitionRate has been set for the student

**Main Flow**:
1. Admin opens Finance → Invoicing
2. Selects the student + the month to invoice
3. System suggests an amount from the active `StudentTuitionRate`
4. Admin confirms → the system creates a `StudentInvoice` (status=unpaid)
5. The student receives a "new invoice" notification

---

## UC-A-003: Approve class sessions and create a payroll period

**Actor**: Admin  
**Trigger**: A teacher submits a session as `completed_pending`

**Main Flow**:
1. Admin receives a `session_submitted_for_review` notification
2. Admin opens Payroll → Pending sessions
3. Reviews the details: teacher, class, date, actual times (actualStart/End), topic, attendance summary
4. Admin approves → session status = `approved`; the teacher receives `session_approved`
5. At the end of the period: Admin creates a PayrollPeriod (draft) → the system aggregates approved sessions
6. Admin reviews the total amount → Finalize → pay the salary → Paid

**Alternative**: Admin rejects and enters a reason → session status = `rejected`; the teacher receives `session_rejected` with the reason

---

## UC-A-004: Suspend an account for a violation

**Actor**: Admin  
**Precondition**: The user is active

**Main Flow**:
1. Admin opens Users → finds the user
2. Clicks "Suspend" and enters a reason
3. System: status `active → suspended`, sends an `account_suspended` notification
4. The user can no longer log in (401 when using the refresh token)

---

## UC-A-005: Monitor the Gemini API quota

**Actor**: Admin  
**Precondition**: At least one feature genuinely uses Gemini (T-GRADE-3 AI suggested score is live)

**Main Flow**:
1. Admin opens Dashboard → "Monitoring" tab → "Gemini API" section
2. Reviews the metrics:
   - Total API calls in the period (day / week / month)
   - Remaining quota (the key's total quota)
   - Cache hit ratio (share of results served from cache rather than a fresh API call)
   - Breakdown by feature: AI suggested score (teacher grading), translation (if present)
3. If the quota falls below the warning threshold → a red alert appears on the dashboard

**Note**: These numbers only mean something once T-GRADE-3 actually runs. Whether the quota is shared on one key or each teacher gets their own must be settled before building.

---

## UC-A-006: View a user's profile in detail

**Actor**: Admin  
**Precondition**: The user exists in the system

**Main Flow**:
1. Admin opens Users → searches for the user (by name / email)
2. Clicks the user → the detail screen shows:
   - Personal details (name, email, role, status, registration date, last_login_at)
   - Current account status (active / pending / suspended)
   - **If a Student**: history of classes joined (enrollment records), history of submitted work (attempt records)
   - **If a Teacher**: list of classes taught, session history
   - Session history: an empty placeholder — depends on Sprint 5

**Note**: `last_login_at` needs to be added to the User schema and updated on every successful login (F1.2).
