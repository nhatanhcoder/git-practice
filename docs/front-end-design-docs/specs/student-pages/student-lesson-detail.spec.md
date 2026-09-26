---
status: built
design_baseline: v1
last_updated: 2026-09-26
---
# Student lesson detail — page spec

> Paste with `_DESIGN-SYSTEM.md`. If you were not given it, stop and ask — do not invent tokens.

## 1 Purpose
Let an actively enrolled student read one class lesson and open the optional learning units or grammar points the teacher attached as personal supplemental practice.

## 2 Access
Student only. The server verifies an active enrollment in `classId`; the lesson must belong to that class. A denied read renders the existing access-denied state and never exposes lesson or supplement metadata.

## 3 API mapping
| Region/action | Method + path | Envelope | Errors |
|---|---|---|---|
| Lesson, content and ordered supplements | `GET /student/classes/:classId/lessons/:lessonId` | `data`, including `supplements[]` | `VALIDATION_ERROR`, `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED`, `LESSON_NOT_FOUND` |
| Class-name context | `GET /student/classes/:id` | `data.name`; failure is non-fatal | existing class errors |
| Open learning unit | navigate `/student/learning-path/:sourceKey` | no write | `LEARNING_UNIT_NOT_FOUND` on destination |
| Open grammar point | navigate `/student/grammar?point=:sourceKey` | no write | `GRAMMAR_NOT_FOUND` on destination |
| Attached assignments | ⛔ no student lesson-assignment endpoint | — | — |

## 4 Page structure
Back link, lesson heading, description, lesson-material notice, assignment-unavailable notice, then the ordered supplemental-practice panel. The page does not show supplement completion, grades, XP, streaks or teacher controls.

## 5 Component specs
Supplement rows reuse `Panel`, `Chip` and the existing LMS attachment row. Available rows are links with kind labels “Bài học” or “Ngữ pháp”. Unavailable rows are non-interactive, contain no source title, and announce “Không khả dụng”.

## 6 Data
```json
{
  "id": "9d5a7d41-5c81-4f5a-bd36-cadfaec1f88a",
  "title": "Ôn tập tuần 1",
  "supplements": [
    { "id": "s1", "sourceType": "learning_unit", "sourceKey": "hsk1-greetings", "orderIndex": 1, "title": "Chào hỏi cơ bản", "available": true },
    { "id": "s2", "sourceType": "grammar_point", "sourceKey": "g-hsk1-ma", "orderIndex": 2, "title": "Trợ từ nghi vấn 吗", "available": true },
    { "id": "s3", "sourceType": "learning_unit", "sourceKey": "removed", "orderIndex": 3, "title": null, "available": false }
  ]
}
```

## 7 States
Loading uses the existing page skeleton. Ready renders ordered rows. Empty says the teacher has not attached supplemental content. Partial allows class-name context to fail without hiding the lesson. Error retries the lesson read. Forbidden and not-found use the existing bounded states. Offline is the normal request-failure state; no cached or mock lesson is substituted.

## 8 Copy
“Nội dung bổ trợ”, “Giáo viên chưa gắn nội dung bổ trợ nào cho bài học này.”, “Nội dung này hiện không khả dụng”, “Bài học”, “Ngữ pháp”, “Không khả dụng”.

## 9 Interactions
Rows remain in server order. Available rows are keyboard-focusable links and preserve browser Back. At 375px the row wraps rather than causing horizontal overflow. Unavailable rows cannot receive link focus.

## 10 Do not
Do not resolve a dead source client-side, reveal its old title, fabricate completion, write progress from this page, or turn supplemental practice into an official result.
