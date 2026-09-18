---
feature: S-SELF-4
role: student
route: /student/writing
status: built (live)
last_updated: 2026-09-18
---

# Page Contract — Student · Character Writing Practice (S-SELF-4)

## Purpose
Practise writing Chinese characters with stroke guidance and track personal mastery. Private self-study progress — never an official grade.

## Access
- Allowed roles: `student`
- Ownership rule: progress is scoped to the authenticated student; no `userId` travels on the wire

## Entry points
- From: Student sidebar → "Luyện viết chữ"; deep link `/student/writing`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Character set + optional stroke paths | `GET /student/writing`, `GET /student/writing/:id` | `data` |
| Own explicit practice markers | `GET /student/writing/progress` | `data.practised[]` |
| Save explicit practice | `PUT /student/writing/:id/progress` | `data` |

Routes covered: `/student/writing` (the "Bộ chữ" browser) and `/student/writing/[charId]` (one character's practice canvas).

Live since 2026-09-18 under student module 06. `writing.json` supplies 587
characters; `strokes.json` enhances 59 characters and the UI honestly falls
back to named stroke order for the rest. Practice is a Boolean marker, not mastery.

## Regions
1. Page Header: eyebrow "Luyện tập", title "Luyện viết chữ Hán"
2. Character browser ("Bộ chữ") with search/level filters; empty-filter state "Không có chữ nào khớp"
3. Per-character stroke guide, canvas and server-confirmed “đã luyện” marker

## States
- [x] Loading — skeleton
- [x] Ready — live repository corpus plus own progress
- [x] Empty — filtered set can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open a character | character card | navigate to live `/student/writing/[charId]` | `WRITING_CHAR_NOT_FOUND` |
| Save practice | “Lưu đã luyện” after drawing | idempotently persist own marker | `WRITING_CHAR_NOT_FOUND` |

## Out of scope
Handwriting recognition/numeric scoring, XP, official grading, teacher-assigned writing tasks and corpus authoring (`DEBT-003`).
