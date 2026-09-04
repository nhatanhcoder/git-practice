---
feature: S-CLS-1, S-CLS-2
role: student
route: /student/classes
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · My Classes

## Purpose
See every class the student has joined, and join a new one with an 8-character code.

## Access
- Allowed roles: student
- Ownership rule: the list is scoped to the caller's own `ClassEnrollment` rows; there is
  no class id in the URL, so there is nothing to own-check beyond the token subject.
- On denial: redirect to `/login`

## Entry points
- From: Student rail → "Lớp của tôi"; dashboard → "Lớp đang học" card
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| enrolled classes | `GET /api/v1/student/classes` | `data[]` |
| join a class | `POST /api/v1/student/classes/join` | `data` |

Blocked on: none

## Regions
1. Page head — eyebrow, title, "Tham gia lớp" primary action
2. Class card grid — name, teacher, HSK level, schedule summary, open-assignment count
3. Join dialog — single code field, 8 characters, uppercase-insensitive

## States
- [ ] Loading — card skeletons, three placeholders
- [ ] Ready — the normal case
- [ ] Empty — never joined a class → illustration + "Nhập mã lớp" CTA, not a bare table
- [ ] Partial — N/A (reason: one request, nothing to resolve separately)
- [ ] Error — fetch failed → inline retry, rail and topbar stay
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Join class | dialog submit | new card prepended, toast, dialog closes | ⛔ none exists |
| Open class | card click | → `/student/classes/[classId]` | — |

⛔ The three join failures — invalid code, archived class, already enrolled — are listed
in `KNOWN_ISSUES.md` `DOC-007` as branches with **no registered error code**. Their names
are deliberately not written here: quoting a code that the registry does not define is how
an invented code gets copied into implementation. Surface the envelope `message` until
`API_ERROR_CODES.md` defines them.

## Out of scope
Leaving a class (that lives on the detail screen), any teacher-side view, class search
or discovery — a class is only reachable with a code.
