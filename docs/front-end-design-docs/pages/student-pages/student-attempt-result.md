---
feature: S-ASGN-7, S-ASGN-8
role: student
route: /student/attempts/[attemptId]/result
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · Attempt Result

## Purpose
See the official score for a submitted attempt and read the teacher's feedback.

## Access
- Allowed roles: student
- Ownership rule: the attempt's `studentId` must be the caller (service layer)
- On denial: redirect to `/student/assignments` + toast from the envelope `message`

## Entry points
- From: submit confirmation, and the "Xem kết quả" action on a graded row
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| graded result + feedback | `GET /api/v1/student/attempts/:id/result` | `data` |

Blocked on: none

## Regions
1. Score header — total, max, submitted-at, graded-at
2. Teacher feedback — free text, whole-attempt
3. Per-question review — the student's answer, the correct answer, per-question comment

## States
- [ ] Loading — header then list skeleton
- [ ] Ready — fully graded
- [ ] Empty — N/A (reason: a result always has at least the attempt it belongs to)
- [ ] Partial — **the important one.** MCQ is graded automatically while Writing waits
      for the teacher, so a real attempt is routinely half-graded. Show the auto-graded
      part with the Writing rows marked "Chờ giáo viên chấm", and label the total as
      provisional. Presenting a partial total as final is the failure mode here
- [ ] Error — fetch failed → inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Back to assignments | header link | → `/student/assignments` | — |
| Save a mistake | per-question "Lưu vào sổ lỗi" | adds to the mistake notebook | ⛔ no endpoint |

⛔ The mistake notebook is self-study; `API_STUDENT.md` has no endpoint that writes to it
from an official attempt. Ships behind `MOCK(S-ASGN-8)` and is listed under
`## Needs from the other lane`.

## Out of scope
Disputing a grade, re-attempting, and any comparison against other students. The score
shown here is the official one — self-study practice never writes to it.
