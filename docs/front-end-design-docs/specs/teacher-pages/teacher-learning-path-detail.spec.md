---
page: Teacher · Learning Path Detail
route: /teacher/learning-paths/[pathId]
contract: ../../pages/teacher-pages/teacher-learning-path-detail.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-19
---

# Page Spec — Teacher · Learning Path Detail

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global do-NOTs.
> This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent colours, fonts or
> spacing — this product has a locked design system.

---

## 1. Purpose

Build one path's lesson list, then hand it to the admin — or, once it is approved, publish the
lessons students will actually see.

## 2. Access

`teacher`, and the path must be owned by the caller (service-layer predicate on `path.ownerId`).
A path belonging to another teacher answers `404`, not `403` — the screen shows
`Không tìm thấy lộ trình`, never a hint that someone else's path exists.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load path + lessons | `GET /api/v1/teacher/learning-paths/:pathId` | `data`, `data.units[]` | `LEARNING_PATH_NOT_FOUND` |
| Edit title / description | `PATCH /api/v1/teacher/learning-paths/:pathId` | `data` | `LEARNING_PATH_FROZEN`, `VALIDATION_ERROR` |
| Add authored lesson | `POST /api/v1/teacher/learning-paths/:pathId/units` | `data.id` | `LEARNING_PATH_FROZEN`, `VALIDATION_ERROR` |
| Reference picker | `GET /api/v1/teacher/learning-units` | `data.items[]` | — |
| Add reference lesson | `POST /api/v1/teacher/learning-paths/:pathId/units` | `data.id` | `LEARNING_UNIT_REFERENCE_INVALID`, `LEARNING_PATH_FROZEN` |
| Reorder | `PATCH /api/v1/teacher/learning-paths/:pathId/units/reorder` | — | `LEARNING_UNIT_ORDER_INVALID` |
| Publish / unpublish lesson | `POST /api/v1/teacher/learning-units/:unitId/publish`, `POST /api/v1/teacher/learning-units/:unitId/unpublish` | `data.published` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN` |
| Submit for review | `POST /api/v1/teacher/learning-paths/:pathId/submit` | `data.status` | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |

## 4. Page structure

1. **Header** — path title, status badge, `x bài học · y đã publish`, and the one primary action
   this state allows
2. **Review panel** — `rejected` only: the admin's reason, full text, above the fold
3. **Frozen banner** — `pending_review` or `suspended`: one line saying which writes are blocked and
   why, plus the date submitted
4. **Lesson list** — order, title, HSK level, kind, word count, published flag, drag handle,
   publish toggle
5. **Add-lesson split button** — `Tự soạn` and `Chọn từ catalog`
6. **Edit-path modal** — title + description

The primary action per status: `draft`/`rejected` → `Gửi duyệt`; `approved` → none (the work here is
per-lesson); `pending_review` → none, replaced by the frozen banner; `suspended` → none.

## 5. Component specs

### Lesson list row

| Cell | Content |
|---|---|
| Order handle | Drag handle + up/down buttons — buttons are the keyboard-accessible path |
| Title | Semibold; a `rejected`-style reason is not applicable here |
| HSK | Badge `HSK n`, level 1–9 |
| Loại | Text chip: `Tự soạn` or `Tham chiếu` |
| Số từ | `wordCount`; a reference lesson shows the referenced unit's count |
| Publish | Toggle. Disabled with a tooltip when the path is not `approved` |

The **word-count cell is `—` while unresolved**, never `0`.

### Reorder

Drag is the affordance, but the up/down buttons are what the keyboard and screen-reader user gets.
Either path sends the **complete** order for every lesson in the path — never a single moved row —
because the API rejects a partial permutation (`LEARNING_UNIT_ORDER_INVALID`). If the request fails,
the list snaps back to the server's order rather than keeping a local order the server never stored.

### Reference picker modal

Search + HSK filter + list of published units (`title`, HSK, word count, source path). Selecting one
adds a lesson with `kind: "reference"` — the modal must state that the words belong to the catalog
entry and are not copied, so a teacher does not expect to edit them afterwards.

## 6. Data — use these exact values

```json
{
  "path": { "id":"p2","title":"Luyện đọc HSK 4 · Tin tức ngắn","status":"draft",
            "unitCount":3,"publishedUnitCount":0,"rejectionReason":null },
  "units": [
    { "id":"u1","order":1,"title":"Bài 1 · Tin trong ngày","level":4,
      "kind":"authored","published":false,"wordCount":8,"referenceSlug":null },
    { "id":"u2","order":2,"title":"Bài 2 · Thời tiết","level":4,
      "kind":"authored","published":false,"wordCount":6,"referenceSlug":null },
    { "id":"u3","order":3,"title":"Từ vựng HSK 3 · Gia đình","level":3,
      "kind":"reference","published":false,"wordCount":8,
      "referenceSlug":"hanlo-v1-hsk-3-unit-2" }
  ],
  "rejectedExample": {
    "status":"rejected",
    "rejectionReason":"Nghĩa tiếng Việt chưa thống nhất giữa các từ trong bài 2; bổ sung pinyin đầy đủ rồi gửi lại."
  }
}
```

`u2` has 6 words, not 8 — the editor allows 1–8, and a mock that always shows 8 hides the uneven
case. `u3` is the reference case.

## 7. States

Switcher: `Ready (draft) · Rejected · Pending review (frozen) · Approved · Empty · Loading · Error · Forbidden`

| State | Appearance |
|---|---|
| **Ready** | Data above, `Gửi duyệt` enabled |
| **Rejected** | Reason panel above the list; `Gửi duyệt` reads `Gửi duyệt lại` |
| **Pending review** | Frozen banner; drag handles, toggles and `Sửa` all disabled with the same tooltip |
| **Approved** | Publish toggles live; no `Gửi duyệt` |
| **Empty** | `Chưa có bài học nào` + `Thêm bài học đầu tiên`; `Gửi duyệt` disabled with `Cần ít nhất 1 bài học` |
| **Loading** | Header + 5 skeleton rows |
| **Error** | Inline retry; a failed reorder reverts the list to the server's order |
| **Forbidden** | `Không tìm thấy lộ trình` (a foreign path is a 404 here) |
| **Offline** | N/A — no offline support in this product |

## 8. Copy

| Location | String |
|---|---|
| Primary actions | `Gửi duyệt` · `Gửi duyệt lại` · `Sửa` |
| Add lesson | `Tự soạn` · `Chọn từ catalog` |
| Frozen banner | `Lộ trình đang chờ admin duyệt — tạm thời không sửa được.` |
| Suspended banner | `Lộ trình đang bị tạm ẩn — không thể sửa hoặc publish.` |
| Rejected panel | `Admin đã từ chối lộ trình này` |
| Publish tooltip | `Chỉ publish được khi lộ trình đã được duyệt.` |
| Submit confirm | `Gửi lộ trình cho admin duyệt? Trong lúc chờ, lộ trình sẽ tạm khoá để admin duyệt đúng nội dung.` |
| Empty | `Chưa có bài học nào` |
| Toasts | `Đã gửi duyệt` · `Đã publish bài học` · `Đã bỏ publish` |

## 9. Interactions

- The frozen rule is mirrored in the UI **before** the request, not only reported after it — the
  API is still the authority and answers `LEARNING_PATH_FROZEN` if the state changed underneath
- Publishing a lesson asks for confirmation once; unpublishing states that learner progress is kept
- Reorder is optimistic with a revert on failure, and the revert message says the order was not saved
- Below 768px the lesson list becomes cards; drag is unavailable and the up/down buttons carry the
  whole reorder feature

## 10. Constraints — do NOT

- Do not offer any approve/reject control, and do not show the admin's audit fields
- Do not allow editing a published lesson's words from the list — the row offers unpublish instead
- Do not send a single-row reorder
- Do not leave the local order in place after a failed reorder
- Do not offer a student preview of the path
