# 👨‍💼 Admin — Feature Specification

> **Role**: Administrator  
> **Scope**: Account governance, financial management, system monitoring  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-AUTH-1 | Log in with email + password | 🔴 Must | JWT access + refresh token |
| A-AUTH-2 | Log out | 🔴 Must | Invalidate refresh token |
| A-AUTH-3 | Automatic JWT refresh token renewal | 🔴 Must | Silent re-auth |
| A-AUTH-4 | Change password | 🟡 Should | Requires the current password |
| A-AUTH-5 | Update profile (name, email) | 🟡 Should | |
| A-AUTH-6 | Upload / change avatar | 🟢 Could | Supabase Storage |

---

## 👥 User Management

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-USER-1 | View a list of all users | 🔴 Must | Name, email, role, status, registration date, last_login_at (needs a new column in the schema, updated on every successful login) |
| A-USER-2 | Approve pending accounts (pending → active) | 🔴 Must | Trigger: account_approved notification (split into new_teacher_registration / new_student_registration) |
| A-USER-3 | Suspend / unsuspend an account (active ↔ suspended) | 🔴 Must | Trigger: account_suspended notification |
| A-USER-4 | View a user's detailed profile | 🟡 Should | Personal details, account status, class history (enrollment), submission history (attempts); session history left empty — depends on Sprint 5 |

---

## 💰 Finance — Invoicing (Student Billing)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-INV-1 | Set tuition per student (StudentTuitionRate) | 🔴 Must | rateAmount, effectiveFrom — the pricing model (per class / package / month) still needs deciding |
| A-INV-2 | Create monthly tuition invoices (StudentInvoice) | 🔴 Must | periodStart, periodEnd, totalAmount — shares the invoices/payments tables with Student (S-BILL-1) |
| A-INV-3 | Record a payment (TuitionPayment) | 🔴 Must | paymentMethod, transactionReference |
| A-INV-4 | View invoice history & status (unpaid/partially_paid/paid/void) | 🟡 Should | Admin sees the whole system; a student sees only their own |
| A-INV-5 | Void / cancel an invoice | 🟢 Could | |

> 📄 Details: INVOICE_FLOW.md

---

## 💼 Finance — Payroll (Teacher Salary)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-PAY-1 | Set a teacher's pay rate (TeacherPayRate) | 🔴 Must | per_session / per_hour, effectiveFrom — the rate calculation still needs deciding |
| A-PAY-2 | Approve a teacher's class session (completed_pending → approved) | 🔴 Must | Trigger: session_approved notification to the teacher |
| A-PAY-3 | Reject a class session (→ rejected) with a reason | 🔴 Must | Trigger: session_rejected + the reason, sent to the teacher |
| A-PAY-4 | Create a payroll period (PayrollPeriod) — draft | 🔴 Must | Aggregates approved sessions; periods are monthly (to be confirmed) |
| A-PAY-5 | Finalize a payroll period (draft → finalized) | 🔴 Must | |
| A-PAY-6 | Mark salary as paid (finalized → paid) | 🟡 Should | |
| A-PAY-7 | View payroll period history per teacher | 🟡 Should | Session date, duration, status, rate, payroll period, total earnings |

> 📄 Details: PAYROLL_FLOW.md

---

## 📊 Dashboard & Monitoring

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-DASH-1 | User overview: total, awaiting approval, suspended, active classes | 🔴 Must | Computable from existing data today |
| A-DASH-2 | Financial stats: total tuition collected, total salary paid, current month | 🟡 Should | Can be populated once A-INV-2 (Sprint 4) and A-PAY-5 (Sprint 6) are done |
| A-DASH-3 | Monitor Gemini API quota & cache hit ratio | 🟡 Should | Total calls, remaining quota, cache hit ratio; includes calls from T-GRADE-3 (AI score) — best built after T-GRADE-3 actually runs so the numbers mean something |
| A-DASH-4 | Sessions pending review (count awaiting approval) | 🟡 Should | Can be populated once Sprint 5 is done |
| A-DASH-5 | System log / audit trail | 🟢 Could | |

---

## 🔔 Notifications Received

| Notification type | Trigger |
|----------------|---------|
| A new class session needs approval | Teacher submits a session (session_submitted_for_review) |
| New teacher registration | Pending teacher registration (new_teacher_registration) |
| New student registration | Pending student registration (new_student_registration) |

> 📄 Details: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Login
  └─► Dashboard (pending users + pending sessions + payroll/revenue summary)
        ├─► User Management → Approve / Suspend / View profile detail
        ├─► Payroll → Review sessions → Approve/Reject → Create Period → Finalize → Paid
        ├─► Invoicing → Set Tuition Rate → Create Invoice → Record Payment
        └─► Monitoring → Gemini API quota + cache hit ratio
```
