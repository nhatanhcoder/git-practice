---
feature: T-LCAT-2, T-LCAT-5
role: teacher
route: /teacher/learning-paths/[pathId]/units/[unitId]
status: contracted
last_updated: 2026-09-19
---

# Page Contract — Teacher · Learning Lesson Editor

## Purpose
Write one lesson's vocabulary — or, once it is published, read it and change its visibility.

## Access
- Allowed roles: teacher
- Ownership rule: the lesson's **parent path** must be owned by the caller (`unit.pathId → path.ownerId`).
  A foreign unit answers `404`; a unit whose path is not the one in the URL is rejected.
- On denial: redirect to `/teacher/learning-paths` + toast `LEARNING_PATH_NOT_FOUND`

## Entry points
- From: `/teacher/learning-paths/[pathId]` → "Tự soạn" (new) or row click (existing)
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| lesson + its words | `GET /api/v1/teacher/learning-paths/:pathId` | `data.units[]` (the unit matching `unitId`) |
| save words / title / level | `PATCH /api/v1/teacher/learning-units/:unitId` | `data` |
| publish | `POST /api/v1/teacher/learning-units/:unitId/publish` | `data.published` |
| unpublish | `POST /api/v1/teacher/learning-units/:unitId/unpublish` | `data.published` |
| delete (draft/unpublished only) | `DELETE /api/v1/teacher/learning-units/:unitId` | — |

Blocked on: none — all defined in [API_TEACHER.md](../../../api/API_TEACHER.md) § Learning Catalog.

## Regions
1. Header — lesson title, parent path name (link back), HSK level, published badge
2. Read-only banner — when published: the lesson is immutable, with the one action available
   ("Bỏ publish để sửa")
3. Word editor — ordered rows of `hanzi` · `pinyin` · `nghĩa`, add/remove row, 1–8 rows
4. Reference panel — when `kind: "reference"`: show the referenced unit read-only, with a link to
   the catalog entry; no word fields at all
5. Save bar — primary "Lưu", secondary "Bỏ publish" / "Xoá bài học"

## States
- [ ] Loading — skeleton of the word editor
- [ ] Ready — the normal case
- [ ] Empty — N/A for a lesson (a lesson always has ≥ 1 word or is a reference); show the add-row
      prompt when the last row was removed
- [ ] Partial — N/A (single record, no pagination)
- [ ] Error — save failed → keep the typed values, show the error inline, never claim it saved
- [ ] Forbidden — see Access (404 for a foreign unit)
- [ ] Offline / stale — N/A (reason: no offline support in this product)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Save | "Lưu" | `PATCH`; toast matches the button verb | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN`, `VALIDATION_ERROR` |
| Add / remove word row | row controls | local only until "Lưu"; the 8-word ceiling is enforced in the UI **and** by the API | `VALIDATION_ERROR` |
| Publish | "Publish" → confirm modal | `POST /api/v1/teacher/learning-units/:unitId/publish`; requires the path to be `approved` | `LEARNING_PATH_INVALID_STATUS`, `LEARNING_PATH_FROZEN` |
| Unpublish | "Bỏ publish" → confirm modal | `POST /api/v1/teacher/learning-units/:unitId/unpublish`; learner progress is untouched, say so in the modal | `LEARNING_PATH_INVALID_STATUS` |
| Delete | "Xoá bài học" → confirm modal | `DELETE`; only for `draft` / `unpublished` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE` |

## Out of scope
- No quiz editor — the quiz is generated from the words, and the screen says so rather than showing a
  disabled quiz tab.
- No audio, no images, no rich text.
- No editing a `reference` lesson's words: the words belong to the referenced unit.
- No submitting the parent path from here.

Spec: [../../specs/teacher-pages/teacher-learning-unit-editor.spec.md](../../specs/teacher-pages/teacher-learning-unit-editor.spec.md) — written 2026-09-19, `ready-for-design`. Contract stays `contracted`: no mockup yet.
