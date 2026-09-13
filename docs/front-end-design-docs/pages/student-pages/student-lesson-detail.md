---
feature: S-LESSON-2, S-LESSON-3, S-LESSON-4
role: student
route: /student/classes/[classId]/lessons/[lessonId]
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Lesson Detail

## Purpose
Read one lesson's content of an enrolled class (S-LESSON-2); assignments (S-LESSON-3) follow when their endpoint exists.

## Access
- Allowed roles: `student`
- Ownership rule: caller must be actively enrolled in `classId` (service check, `CLASS_ACCESS_DENIED` 403); lesson must belong to `classId` (`LESSON_NOT_FOUND` 404)
- On denial: 403 access-denied state + link back to `/student/classes/[classId]`

## Entry points
- From: `/student/classes/[classId]` → click lesson row
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Lesson detail | `GET /api/v1/student/classes/:classId/lessons/:lessonId` | `data` (ENTITY_LESSON fields) |

Blocked on: attached assignments (S-LESSON-3, Sprint 4) + supplemental units (S-LESSON-4, ⛔ no catalog contract) — v1 renders lesson content only.

## Regions
1. Backlink to `/student/classes/[classId]` (class name)
2. Lesson PageHead: eyebrow `Bài N`, title, class name
3. Content panel: description + contentType attachment (video/document/text/mixed)
4. Assignments panel: unavailable notice until the S-LESSON-3 endpoint exists

## States
- [x] Loading — skeleton, per region
- [x] Ready — lesson content rendered
- [x] Empty — N/A (no description still renders the content panel, stays Ready)
- [x] Partial — N/A (single GET, no split regions)
- [x] Error — fetch failed → inline retry, shell stays
- [x] Forbidden — 403 `CLASS_ACCESS_DENIED` → access-denied state
- [x] Offline / stale — request-failure wording; no mock lesson

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open lesson | lesson row in class detail | navigate here | — |
| Retry | error-state button | re-fetch same endpoint | `VALIDATION_ERROR`, `CLASS_NOT_FOUND`, `LESSON_NOT_FOUND`, `CLASS_ACCESS_DENIED` |

## Out of scope
Editing lessons (teacher only), submitting attempts (Sprint 4), supplemental catalog units (S-LESSON-4), peer roster.
