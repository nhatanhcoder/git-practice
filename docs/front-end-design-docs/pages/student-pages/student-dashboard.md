---
feature: S-CLS-2, S-SRS-5
role: student
route: /student
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Dashboard

## Purpose
Answer "what should I do right now" with live figures from the learner's own account (Task A).

## Access
- Allowed roles: `student`
- Ownership rule: both sources scope by the signed-in id server-side
- On denial: `RequireAuth` shell (anonymous → `/login`)

## Entry points
- From: post-login landing per role
- Deep link: n/a (landing route)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Enrolled classes | `GET /api/v1/student/classes` | `data[]` |
| SRS stats | `GET /api/v1/student/flashcards/stats` | `data` (streak intentionally null) |

Blocked on: XP / rank / minutes / HSK progress / activity have no endpoint — named
under "Chưa có số liệu" (Needs), never invented (WEB-011).

## Regions
1. Greeting header (live identity name)
2. Stats tiles — 7 tiles from the two sources
3. Class list — name, HSK, lesson count, entry links
4. Missing-figures note — the Needs list in words
5. Live shortcuts — flashcards, mistakes, classes

## States
- [x] Loading — skeletons per section
- [x] Ready — tiles + classes rendered
- [x] Empty — zero classes → join CTA (stats never empty — zeros are data)
- [x] Partial — sources load independently; failed half shows "—" + note
- [x] Error — per-section retry, shell stays
- [x] Forbidden — handled by shell `RequireAuth`
- [x] Offline / stale — request-failure wording; missing totals read "—", never 0

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Retry | error-state button | refetch both sources | — |
| Open class | "Vào lớp" | `/student/classes/[classId]` | — |

## Out of scope
Dev mock surface (stays behind `DemoStateSwitcher`, never shipped), gamification,
analytics, curriculum progress — all without contracts.
