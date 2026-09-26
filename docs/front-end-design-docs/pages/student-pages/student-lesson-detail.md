---
feature: S-LESSON-2, S-LESSON-3, S-LESSON-4
role: student
route: /student/classes/[classId]/lessons/[lessonId]
status: built
last_updated: 2026-09-26
---

# Page Contract — Student · Lesson Detail

Design spec: [student-lesson-detail.spec.md](../../specs/student-pages/student-lesson-detail.spec.md)

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
| Lesson supplements | same response, `data.supplements[]` (API-020, accepted) | server-ordered items `{id,sourceType,sourceKey,orderIndex,title|null,available}` |

Blocked on: attached assignments (S-LESSON-3, Sprint 4) — v1 renders lesson content only
for those. Supplements (S-LESSON-4) are live via API-020; see Regions.

## Regions
1. Backlink to `/student/classes/[classId]` (class name)
2. Lesson PageHead: eyebrow `Bài N`, title, class name
3. Content panel: description + contentType attachment (video/document/text/mixed)
4. Assignments panel: unavailable notice until the S-LESSON-3 endpoint exists
5. Supplements panel (S-LESSON-4): ordered supplement rows in server order — kind chip
   (Bài học / Ngữ pháp), title linking to the unit hub (`/student/learning-path/:slug`)
   or grammar hub point (`/student/grammar?point=:id`), where personal content and
   progress live. Unavailable rows (`available: false`) show an honest "Không khả dụng"
   notice with no title and no content. No progress/scores/XP rendered here.

## States
- [x] Loading — skeleton, per region
- [x] Ready — lesson content + supplements rendered
- [x] Empty — N/A for the lesson (no description still renders the content panel, stays Ready); supplements empty renders no rows, not an error
- [x] Partial — N/A (single GET, no split regions)
- [x] Error — fetch failed → inline retry, shell stays
- [x] Forbidden — 403 `CLASS_ACCESS_DENIED` → access-denied state
- [x] Offline / stale — request-failure wording; no mock lesson

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open lesson | lesson row in class detail | navigate here | — |
| Open supplement | supplement row link | unit → `/student/learning-path/:slug`; grammar → `/student/grammar?point=:id` (content + personal progress live there) | `GRAMMAR_NOT_FOUND` for a removed grammar point |
| Retry | error-state button | re-fetch same endpoint | `VALIDATION_ERROR`, `CLASS_NOT_FOUND`, `LESSON_NOT_FOUND`, `CLASS_ACCESS_DENIED` |

## Out of scope
Editing lessons (teacher only), submitting attempts (Sprint 4), peer roster.
