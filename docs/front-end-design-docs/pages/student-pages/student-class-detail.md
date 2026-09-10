---
feature: S-CLS-3, S-CLS-4, S-LESSON-1
role: student
route: /student/classes/[classId]
status: built
last_updated: 2026-09-07
---

# Page Contract — Student · Class Detail & Lessons

## Purpose
View detailed information for an enrolled class (teacher profile, meeting schedule, enrolled date), inspect its ordered syllabus of lessons with multimedia resources, and provide the ability to leave the class.

## Access
- Allowed roles: `student`
- Ownership rule: caller must be actively enrolled in the class. Service verifies active enrollment in `ClassEnrollment` table (`CLASS_ACCESS_DENIED` 403 if un-enrolled or dropped)
- On denial: redirected or shown 403 error state

## Entry points
- From: `/student/classes` → click class card; Direct URL `/student/classes/:classId`
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Class & lessons | `GET /api/v1/student/classes/:id` | `data` (embeds `teacher`, `lessons[]`) |
| Leave class | `DELETE /api/v1/student/classes/:id/leave` | `data` |

Note: Peer student roster is omitted from response per RBAC (`INV-CLASS-07`).

## Regions
1. Backlink: Link returning to `/student/classes` ("Lớp của tôi")
2. Class PageHead: Eyebrow with HSK level, Class Title, Teacher name, Schedule, and action button "Rời lớp"
3. Key Facts Bar: Teacher avatar/nickname, schedule, enrolled date
4. Lessons List: Chronologically/order-indexed list of lessons with lesson title, summary, video/document chips, and assignments count
5. Leave Class Confirmation Modal: Confirmation dialog warning that access to lessons will pause while past assignment grades are preserved

## States
- [x] Loading — skeleton facts bar and lesson rows
- [x] Ready — class metadata and ordered lessons rendered
- [x] Empty — class has zero published lessons; displays "Chưa có bài học nào"
- [x] Partial — class header renders while lesson list is loading or empty
- [x] Error — 404 "Không tìm thấy lớp học", 403 "Bạn không có quyền xem lớp học này"
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — displays request failure; no mock lessons or fabricated attendance

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open Lesson | Click lesson row | navigate to `/student/classes/[classId]/lessons/[lessonId]` | — |
| Open Leave Dialog | Button "Rời lớp" | open leave confirmation modal | — |
| Confirm Leave | Button "Rời lớp" inside modal | call leave API, toast warning, redirect to `/student/classes` | `CLASS_NOT_ENROLLED`, `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`, `VALIDATION_ERROR` |

## Out of scope
Editing class info or schedule (Teacher only), adding/deleting lessons (Teacher only), peer classmate roster viewing.
