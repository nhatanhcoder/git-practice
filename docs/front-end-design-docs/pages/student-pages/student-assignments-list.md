---
feature: S-ASGN-1
role: student
route: /student/assignments
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · Assignments

## Purpose
See everything the teacher has assigned across every class, and what still needs doing.

## Access
- Allowed roles: student
- Ownership rule: scoped to the caller's enrolled classes; no id in the URL
- On denial: redirect to `/login`

## Entry points
- From: Student rail → "Bài tập"; dashboard → "Bài cần làm"
- Deep link: yes, including the status filter in the query string

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| assignment list | `GET /api/v1/student/assignments` | `data[]`, `meta` |
| one assignment | `GET /api/v1/student/assignments/:id` | `data` |
| start an attempt | `POST /api/v1/student/assignments/:id/attempts` | `data` |

Blocked on: none

## Regions
1. Page head — title, count of what is due
2. Filter row — class, status, type (homework / mock_test)
3. Assignment list — title, class, type, due date, status badge, primary action

Status badge values are exactly the four in S-ASGN-1: not started · in progress ·
submitted · graded. `status.ts` decides the colour — a CSS module must not.

## States
- [ ] Loading — row skeletons
- [ ] Ready — the normal case
- [ ] Empty — two distinct cases: no assignments at all, and none matching the filter.
      They need different copy; one CTA clears the filter, the other does not
- [ ] Partial — list resolved, per-row attempt state still loading
- [ ] Error — fetch failed → inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Start | "Bắt đầu" on a not-started row | creates an Attempt → `/student/attempts/[id]` | `ASSIGNMENT_NOT_FOUND` |
| Resume | "Tiếp tục" on an in-progress row | → `/student/attempts/[id]` | `ATTEMPT_NOT_FOUND` |
| View result | "Xem kết quả" on a graded row | → `/student/attempts/[id]/result` | `ATTEMPT_NOT_FOUND` |

A submitted-but-ungraded row has **no** action. Showing a result link there would promise
a score that does not exist yet — Writing waits for the teacher (S-ASGN-7).

## Out of scope
Self-study practice. Nothing on this screen may come from the self-study library: only an
Assignment produces an official Attempt, and mixing the two is the boundary the scope note
draws explicitly.
