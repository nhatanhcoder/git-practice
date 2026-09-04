---
feature: S-ASGN-2, S-ASGN-3, S-ASGN-4, S-ASGN-5, S-ASGN-6
role: student
route: /student/attempts/[attemptId]
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · Take Attempt

## Purpose
Answer an assignment's questions under the timer, without losing work, and submit once.

## Access
- Allowed roles: student
- Ownership rule: the attempt's `studentId` must be the caller. Service layer — an
  attempt id is guessable and a role guard alone would expose another student's paper.
- On denial: redirect to `/student/assignments` + toast from the envelope `message`

## Entry points
- From: `/student/assignments` Start or Resume
- Deep link: yes, but only for the owner and only while the attempt is `in_progress`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| attempt state + questions | `GET /api/v1/student/attempts/:id` | `data` |
| auto-save answers | `PATCH /api/v1/student/attempts/:id/answers` | `data` |
| submit | `POST /api/v1/student/attempts/:id/submit` | `data` |

Blocked on: none

## Regions
1. Sticky bar — assignment title, countdown, save indicator, "Nộp bài"
2. Question pane — one question at a time
3. Question navigator — every question as a chip: unanswered · answered · flagged

## States
- [ ] Loading — full-screen skeleton; do not start the timer until the state has loaded
- [ ] Ready — the normal case
- [ ] Empty — N/A (reason: an assignment with no question cannot be started)
- [ ] Partial — questions rendered, a save still in flight → indicator says "Đang lưu…"
- [ ] Error — a failed save must say so and keep retrying; **never** discard the local
      answer, and never let the UI imply saved work that is not saved
- [ ] Forbidden — not the owner, or the attempt is already submitted
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Answer | input change | debounce 2s → PATCH (S-ASGN-3) | — |
| Flag | flag toggle | local only, mirrored in the navigator | — |
| Navigate | chip / prev / next | swaps the question, no fetch | — |
| Submit | "Nộp bài" → confirm | attempt `submitted`, → result screen | `ATTEMPT_ALREADY_SUBMITTED` ⛔ |
| Time out | countdown hits 0 | auto-submits (S-ASGN-4), no confirm dialog | — |

The countdown is **display only**. Expiry is decided by the server against
`startedAt + timeLimitMinutes`; a client clock is trivially editable, so a timer that
the UI alone enforces is not an exam constraint. On auto-submit the client says the
time is up and calls submit — it does not decide the verdict.

## Out of scope
Showing correct answers or any score while the attempt is open, saving a draft for later
in a separate slot, and pausing the timer.
