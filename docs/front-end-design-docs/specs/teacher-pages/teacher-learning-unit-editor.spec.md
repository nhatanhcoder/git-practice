---
page: Teacher · Learning Lesson Editor
route: /teacher/learning-paths/[pathId]/units/[unitId]
contract: ../../pages/teacher-pages/teacher-learning-unit-editor.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-19
---

# Page Spec — Teacher · Learning Lesson Editor

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global do-NOTs.
> This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent colours, fonts or
> spacing — this product has a locked design system.

---

## 1. Purpose

Write the vocabulary of one lesson — or, once it is published, read exactly what students are seeing
and change only its visibility.

## 2. Access

`teacher`, and the lesson's **parent path** must be owned by the caller. A lesson whose path is not
the `pathId` in the URL is rejected rather than silently rendered. Foreign unit → `404`
(`Không tìm thấy bài học`).

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load lesson | `GET /api/v1/teacher/learning-paths/:pathId` | `data.units[]` (match `unitId`) | `LEARNING_PATH_NOT_FOUND` |
| Save title / level / words | `PATCH /api/v1/teacher/learning-units/:unitId` | `data` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN`, `VALIDATION_ERROR` |
| Publish | `POST /api/v1/teacher/learning-units/:unitId/publish` | `data.published` | `LEARNING_PATH_INVALID_STATUS`, `LEARNING_PATH_FROZEN` |
| Unpublish | `POST /api/v1/teacher/learning-units/:unitId/unpublish` | `data.published` | `LEARNING_PATH_INVALID_STATUS` |
| Delete | `DELETE /api/v1/teacher/learning-units/:unitId` | — | `LEARNING_UNIT_PUBLISHED_IMMUTABLE` |

## 4. Page structure

1. **Header** — lesson title, parent path name (a link back), HSK level, published badge, and the
   back link
2. **Read-only banner** — published lessons only: why the words are locked, and the one way out
   (`Bỏ publish để sửa`)
3. **Word editor** — ordered rows `Hán tự · Pinyin · Nghĩa tiếng Việt`, add/remove row, 1–8 rows
4. **Reference panel** — a `kind: "reference"` lesson shows the referenced unit read-only with a
   link to the catalog entry; there are no word inputs at all
5. **Save bar** — `Lưu` primary; `Bỏ publish` or `Xoá bài học` secondary depending on state

The quiz is **not** on this page, and the page says so in one helper line rather than showing a
disabled quiz tab: the lesson's practice questions are generated from the words above.

## 5. Component specs

### Word editor

- One row per word: `hanzi` (short text, required, no empty string), `pinyin` (text, required),
  `meaning` (text, required)
- Row controls: drag handle, remove (`Xoá dòng`), and an `Thêm từ` button below the last row
- The 8-word ceiling is enforced **in the UI and by the API** — at 8 rows `Thêm từ` is disabled with
  a tooltip, so the teacher does not discover the limit by losing a save
- Duplicate `hanzi` inside one lesson is a validation error on the second row, not a silent
  overwrite
- Unsaved-changes state is visible: the save bar shows `Có thay đổi chưa lưu` and leaving the page
  warns once

### Published banner

Amber panel, not red — nothing is wrong. Text explains the rule in one sentence: learner progress is
stored against this lesson and keeps the answers learners gave, so the words cannot change behind
it. The button `Bỏ publish để sửa` is the documented route.

## 6. Data — use these exact values

```json
{
  "lesson": { "id":"u1","title":"Bài 1 · Tin trong ngày","level":4,"kind":"authored",
              "published":false,"parentPath":"Luyện đọc HSK 4 · Tin tức ngắn" },
  "words": [
    { "hanzi":"新","pinyin":"xīn","meaning":"mới" },
    { "hanzi":"闻","pinyin":"wén","meaning":"nghe" },
    { "hanzi":"天","pinyin":"tiān","meaning":"trời" },
    { "hanzi":"气","pinyin":"qì","meaning":"khí" }
  ],
  "referenceLesson": { "id":"u3","title":"Từ vựng HSK 3 · Gia đình","level":3,
                       "kind":"reference","published":false,
                       "referenceSlug":"hanlo-v1-hsk-3-unit-2","wordCount":8 },
  "validationErrorExample": {
    "words.1.hanzi": ["Hán tự này đã có ở dòng 1"],
    "words.3.meaning": ["Nghĩa không được để trống"]
  }
}
```

Four words, not eight, and one of them (`闻`) carries a meaning shorter than the others — the row
layout must survive uneven content.

## 7. States

Switcher: `Ready · Reference · Published (locked) · Validation error · Saving · Loading · Error · Forbidden`

| State | Appearance |
|---|---|
| **Ready** | Editor with words, `Lưu` disabled until dirty |
| **Reference** | No word inputs; referenced unit read-only + catalog link |
| **Published (locked)** | Amber banner, every input disabled, `Bỏ publish để sửa` as the only edit path |
| **Validation error** | Field-level errors from `VALIDATION_ERROR.details`, rendered under the offending row and cell |
| **Saving** | `Lưu` shows a 16px spinner + `Đang lưu…`, inputs disabled; on failure the typed values stay on screen and the error is stated — never a success toast |
| **Loading** | Editor skeleton, 4 rows |
| **Empty** | Reached only by removing the last row — show the add-row prompt, not a full-page empty state |
| **Error** | Load failure → page-level retry; save failure → inline, values preserved |
| **Forbidden** | `Không tìm thấy bài học` (foreign unit is a 404) |
| **Offline** | N/A — no offline support in this product |

## 8. Copy

| Location | String |
|---|---|
| Title (fallback) | `Bài học` |
| Field labels | `Hán tự` · `Pinyin` · `Nghĩa tiếng Việt` · `Cấp độ HSK` · `Tên bài học` |
| Row actions | `Thêm từ` · `Xoá dòng` |
| At the 8-word ceiling | `Tối đa 8 từ mỗi bài học.` |
| Published banner | `Bài học đã publish nên không sửa được nội dung. Tiến độ học viên đang gắn với bài này.` |
| Unpublish route | `Bỏ publish để sửa` |
| Reference panel | `Bài học này dùng từ vựng của một bài có sẵn trong catalog — không sửa được ở đây.` |
| Quiz note | `Câu hỏi luyện tập được tạo tự động từ các từ ở trên.` |
| Unsaved | `Có thay đổi chưa lưu` |
| Save | `Lưu` · `Đang lưu…` |
| Confirm delete | `Xoá bài học này? Hành động không thể hoàn tác.` |
| Confirm unpublish | `Bỏ publish bài học? Học viên sẽ không thấy bài này nữa. Tiến độ đã học vẫn được giữ.` |
| Toasts | `Đã lưu bài học` · `Đã publish` · `Đã bỏ publish` · `Đã xoá bài học` |

## 9. Interactions

- `Lưu` sends only the changed fields; the save bar returns to clean on success
- Publishing asks once and states that the lesson becomes visible to every student of the platform,
  not only to a class — this is a platform catalog (ADR-017 §2)
- Unpublishing states that learner progress is kept, which is the question a teacher will have
- `Ctrl/Cmd + S` saves; the shortcut does not fire while the 8-word limit blocks the save
- Below 768px each word becomes a stacked block (hanzi, then pinyin, then meaning) rather than a
  horizontally scrolled row

## 10. Constraints — do NOT

- Do not render word inputs for a reference lesson, and do not copy the referenced words into the
  editable model
- Do not let a save appear to succeed when it failed — the typed values stay and the error shows
- Do not add a quiz, audio, image or rich-text editor
- Do not show this lesson's publication as tied to a class or an assignment — it is platform-wide
- Do not allow edits while the parent path is `pending_review` or `suspended`; the inputs are
  disabled with the same explanation the detail screen gives
