---
feature: S-ASGN-2, S-ASGN-3, S-ASGN-4, S-ASGN-5, S-ASGN-6
role: student
route: /student/attempts/[attemptId]
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Attempt Take

## Purpose
Answer one assignment under its timer, with answers auto-saved every 2s (S-ASGN-2..6).

## Access
- Allowed roles: `student`
- Ownership rule: attempt must belong to the caller (`ATTEMPT_NOT_OWNER` 403);
  only `in_progress` attempts are answerable (closed → result link)
- On denial: 403 forbidden state; anonymous → `/login` via shell

## Entry points
- From: `/student/assignments` → start (POST creates or resumes) → here
- Deep link: yes (re-entry resumes the same row)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Attempt + questions | `GET /api/v1/student/attempts/:id` | `data` (questions stripped of keys) |
| Autosave | `PATCH /api/v1/student/attempts/:id/answers` | `data` (answer row) |
| Submit | `POST /api/v1/student/attempts/:id/submit` | `data` (submitted attempt) |

Blocked on: none for taking — attempts endpoints live (module `03-attempt-lifecycle.md`).

## Regions
1. Sticky bar: title, countdown (if any), save indicator, submit button
2. Question card: counter, flag toggle, prompt, options/textarea, prev/next
3. Sidebar: answered/flagged chips + progress count
4. Submit confirm modal: answered count + lock warning

## States
- [x] Loading — skeleton bar + card
- [x] Ready — question rendered, timer ticking
- [x] Empty — N/A (an attempt always has the assignment's questions)
- [x] Partial — N/A (single payload, all-or-error)
- [x] Error — fetch failed → retry reloads state, shell stays
- [x] Forbidden — 403/404 states; closed attempts link to result
- [x] Offline / stale — failed autosave keeps local text + error note, never discards

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Answer | option/textarea | local update + debounced PATCH | `VALIDATION_ERROR` |
| Submit | confirm modal | POST → result route | `ATTEMPT_ALREADY_SUBMITTED`, `ATTEMPT_TIME_EXCEEDED` |
| Timeout | countdown hits 0 | auto-submit once, same POST | — |

## Out of scope
Grading and scores (result screen), creating attempts for others, editing after submit.
