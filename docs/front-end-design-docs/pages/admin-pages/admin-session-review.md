---
feature: A-PAY-2, A-PAY-3
role: admin
route: /admin/payroll/sessions
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · Session Review

## Purpose
Clear the queue of teacher-submitted sessions by approving or rejecting each one.
This is the gate that feeds payroll — nothing is payable until it passes here.

## Access
- Allowed roles: admin
- Ownership rule: none (any class, any teacher)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Payroll" → "Chờ duyệt"; Dashboard "Buổi chờ duyệt" KPI;
  notification `session_submitted_for_review`
- Deep link: yes — `?teacherId=` to filter one teacher

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| pending sessions | `GET /api/v1/admin/sessions/pending` | `data[]`, `meta` |
| approve | `PATCH /api/v1/admin/sessions/:id/approve` | `data.session` |
| reject | `PATCH /api/v1/admin/sessions/:id/reject` | `data.session` |

Blocked on: UC-A-003 step 3 requires teacher, class, date, actualStart/End, lesson
topic **and an attendance summary** in the review view. `GET /admin/sessions/pending`
must embed those. No detail endpoint exists — confirm the list payload carries them.

## Regions
1. Page title + filter (teacher, date range)
2. Session table — teacher, class, date, actual duration, topic, attendance summary, row actions
3. Review drawer — opens on row click; full session detail + approve/reject without leaving the queue

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — queue clear → "Không có buổi học chờ duyệt" (this is a success state; make it read like one)
- [ ] Partial — N/A
- [ ] Error — inline retry, filters preserved
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Approve | drawer / row | status → `approved`, row leaves queue, teacher notified `session_approved` | `PAYROLL_SESSION_NOT_FOUND`, `PAYROLL_SESSION_NOT_COMPLETED` |
| Reject | drawer / row | modal **requires reason** (A-PAY-3) → status `rejected`, teacher notified with reason | `PAYROLL_SESSION_NOT_FOUND` |

Rejection reason is mandatory — the teacher edits and resubmits from it
(FLOW_PAYROLL_CYCLE §1). An empty reason must fail client-side validation.

## Out of scope
- Editing session times or attendance — Admin approves or rejects, never corrects.
  Corrections are the teacher's job on resubmit
- Approved/rejected history — belongs on the period detail screen
