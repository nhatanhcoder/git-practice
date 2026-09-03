---
title: Backend Module Specs — Teacher
status: active
last_updated: 2026-09-03
---

# Backend Module Specs — Teacher

> Backend specifications for the **Teacher area** — 6 modules, 36 endpoints. Written 2026-09-03
> by opencode from the verbatim sources (see each file's §0). **These are specs, not code.**
> Companion set: `docs/api/modules/` (Admin, 8 modules).
>
> Scope settled by the owner 2026-09-03:
> - **SCOPE-01 (teacher slice)**: teacher-side full management; student join/leave stays
>   deferred in Admin module 03.
> - **Income**: read-only over stored data, no rate computation (avoids API-002/C2 + Decision A).
> - **AI-suggest** (module 04): endpoint specced, implementation **parked** pending the owner's
>   Gemini decision.
>
> Code status: `apps/api` has Auth (module 01-Admin, implemented on `feat/s1-auth-module`) and
> the access-control foundation. **No Teacher module is implemented yet.**

## 1. Module map

| # | Module | File | Status | Endpoints | New INV | Blocked by |
|---|---|---|---|---|---|---|
| T1 | Classes + Lessons | `01-classes-lessons.md` | 🔶 proposed | 14 | 10 (INV-TCL) | `LESSON_*` codes proposed |
| T2 | Question Bank (MongoDB) | `02-question-bank.md` | 🔶 proposed | 5 | 7 (INV-TQ) | delete-gate code missing · CR-3 (upload only) |
| T3 | Assignments | `03-assignments.md` | 🔶 proposed | 5 | 8 (INV-TASG) | §16 sign-offs |
| T4 | Attempts + Grading | `04-attempts-grading.md` | 🔶 proposed | 4 | 8 (INV-TGRD) | AI parked · grade-status code gap · per-question max not modeled |
| T5 | Sessions (teacher side) | `05-sessions.md` | 🔶 proposed | 6 | 9 (INV-TSES) | transition code gap (§16-Q1) |
| T6 | Income (read-only) | `06-income.md` | 🔶 proposed | 2 | 4 (INV-TINC) | — (reads stored data only) |

46 new invariants, each with a test line in its module's §15 — the invariant gate.
Inherited invariants (INV-CLASS-*, INV-SESSION-*, INV-PAYROLL-*) are referenced, never
redefined.

## 2. Dependency order

```
T1 Classes+Lessons ──► T3 Assignments ──► T4 Attempts+Grading
        │                    │
        │                    └──► T5 Sessions (teacher side) ──► T6 Income (read-only)
        └──► T2 Question Bank (MongoDB) ──► T3 (questionIds validation)
```

- T3 needs T2's questions to exist (cross-DB validation) and T1's classes.
- T5 needs T1 (classes + enrollments for attendance).
- T6 needs T5's sessions to have something to read; the `PayrollPeriod` table itself is
  Admin module 05's (T6 §12: one migration set, `PayrollPeriod` first).
- Auth (Admin module 01) precedes everything — every endpoint is teacher-JWT-guarded.

## 3. What this set closes

| Known issue | Closed by |
|---|---|
| `API-004` — `/admin/sessions/pending` permanently empty; `session_submitted_for_review` has no producer | T5 (teacher-side transitions + the notification producer) |
| `05-payroll.md` **Q-PAY-7** — `PayrollPeriod read own = 🔒 Teacher` but no route | T6 |
| `_INDEX.md` (Admin) §11 — "Teacher area has no module spec at all" | this set |
| RBAC gap — no Lesson row in `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` | rows added alongside this set (owner-approved via the 2026-09-03 plan) |

## 4. Cross-cutting rules (not repeated per file)

- Envelope, error codes, UTC-ISO-on-the-wire: `docs/api/modules/_INDEX.md` §4 applies verbatim.
- Every ownership check is a **service-layer predicate** on `teacherId` (or the class join),
  never the role guard alone.
- Error-code gaps are recorded as ⛔ in each §9 with a §16 row — no module invents codes.
  **Three gaps block coding** and need the registry owner:
  1. teacher-side session transition errors (T5 §16-Q1)
  2. question edit/delete gated by published assignment (T2 §16-Q1)
  3. grading a non-`submitted` attempt (T4 §16-Q3)
- MongoDB (T2): template §7/§12 rethought — single-document atomicity, idempotent
  `createIndex` bootstrap, DEBT-001 mitigations documented in T2 §7.
- Known cross-doc conflicts are **recorded, not silently resolved**: C1 (nickname/fullName),
  C4 (HSK 1–9), FLOW_SESSION_ATTENDANCE legacy naming/state machine (T5 §16-Q7).

## 5. Read by role

| You are | Read |
|---|---|
| BE owner signing off | §4 above + every module's §9 + §16 |
| Teacher-API coder | each module top to bottom; start T1 → T2 → T3 → T4 → T5 → T6 |
| Reviewer | §4 + §15 of the module under review (invariant ↔ test) |
| DB designer | §1, §7, §11, §12 of every module (new tables: Class, ClassEnrollment, Lesson, LessonAssignment, Assignment, Attempt, AttemptAnswer, ClassSession, SessionAttendance, PayrollPeriod; Mongo: questions) |
