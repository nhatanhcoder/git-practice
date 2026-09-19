---
page: Admin · Learning Paths
route: /admin/learning-paths
contract: ../../pages/admin-pages/admin-learning-paths.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-19
---

# Page Spec — Admin · Learning Paths

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global do-NOTs.
> This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent colours, fonts or
> spacing — this product has a locked design system.

---

## 1. Purpose

Work the queue of learning paths teachers have submitted, and be able to take down a published
lesson from anywhere on the platform.

## 2. Access

`admin` only. No ownership predicate — an admin reviews every teacher's work. Teachers and students
get `403` from the API and never see this route.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load queue | `GET /api/v1/admin/learning-paths` | `data.items[]`, `meta` | — |
| Filter | `GET /api/v1/admin/learning-paths?status=&teacherId=&page=` | `data.items[]`, `meta` | `VALIDATION_ERROR` |
| Approve | `PATCH /api/v1/admin/learning-paths/:pathId/approve` | `data.status` | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |
| Reject | `PATCH /api/v1/admin/learning-paths/:pathId/reject` | `data.status` | `LEARNING_PATH_REJECTION_REASON_REQUIRED`, `LEARNING_PATH_INVALID_STATUS` |
| Published lessons | `GET /api/v1/admin/learning-units` | `data.items[]`, `meta` | — |
| Unpublish a lesson | `PATCH /api/v1/admin/learning-units/:unitId/unpublish` | — | `LEARNING_PATH_INVALID_STATUS` |

## 4. Page structure

1. **Title row** — `h1` + the default tab's count as a subtitle
2. **Tab row** — `Chờ duyệt · Đã duyệt · Bị từ chối · Tạm ẩn · Tất cả`; default `Chờ duyệt`
3. **Path table** — `Lộ trình · Giáo viên · Bài học · Gửi lúc · Trạng thái ·` row actions
4. **Second tab: `Bài học đã publish`** — a flat list across every path:
   `Bài học · Lộ trình · Giáo viên · HSK · Số từ ·` action `Gỡ`
5. **Pagination**

Approve and Reject sit on the **row**, because the queue's whole job is clearing rows. The detailed
decision — reading the actual words — happens on the detail screen.

## 5. Component specs

### Queue table

| Column | Content |
|---|---|
| Lộ trình | title + `unitCount` lessons in the subtitle |
| Giáo viên | teacher display name |
| Bài học | `unitCount`; `—` while unresolved, never `0` |
| Gửi lúc | `submittedAt`, oldest first (FIFO — the queue sorts by who waited longest) |
| Trạng thái | Status Badge from the §2.1 enum table |
| — | `Duyệt` (primary, small) · `Từ chối` (secondary, small) |

Both row actions are **disabled with a tooltip** when the tab is not `Chờ duyệt` — an approve button
on an already-approved row is a dead control that teaches the wrong model of the state machine.

### Reject modal

One required textarea `Lý do từ chối`, 10–2000 characters, with a live character counter. The
confirm button stays disabled until the minimum is met — the API enforces the same rule
(`LEARNING_PATH_REJECTION_REASON_REQUIRED`), and the UI should not let a reviewer discover it by
failing. Helper text states that the teacher sees this text and can resubmit.

### Published-lessons tab

A flat table, deliberately not nested under paths: the reviewer's question here is "find this lesson
and take it down", not "browse a curriculum". Content in the `Số từ` column is what identifies a bad
lesson fast.

## 6. Data — use these exact values

```json
{
  "items": [
    { "id":"p2","title":"Luyện đọc HSK 4 · Tin tức ngắn","teacher":"Nguyễn Thu Hà",
      "status":"pending_review","unitCount":3,"submittedAt":"2026-09-18T15:02:00Z" },
    { "id":"p9","title":"","teacher":"Trần Minh Quân",
      "status":"pending_review","unitCount":1,"submittedAt":"2026-09-18T16:40:00Z" },
    { "id":"p1","title":"Từ vựng HSK 3 · Chủ đề gia đình","teacher":"Nguyễn Thu Hà",
      "status":"approved","unitCount":4,"submittedAt":"2026-09-15T09:10:00Z" }
  ],
  "publishedLessons": [
    { "id":"u1","title":"Bài 1 · Tin trong ngày","path":"Luyện đọc HSK 4 · Tin tức ngắn",
      "teacher":"Nguyễn Thu Hà","level":4,"wordCount":8 }
  ],
  "meta": { "page":1,"pageSize":20,"total":2 }
}
```

`p9` has an empty title on purpose: a teacher can submit before naming the path well, and the queue
must stay readable without one.

## 7. States

Switcher: `Ready · Empty queue · Empty (other tab) · Loading · Partial · Error · Conflict · Forbidden`

| State | Appearance |
|---|---|
| **Ready** | Queue with rows, oldest first |
| **Empty queue** | `Không có lộ trình nào chờ duyệt` + `Hàng đợi trống.` — a calm state, no CTA |
| **Empty (other tab)** | `Không có lộ trình nào ở trạng thái này` — different copy per tab |
| **Loading** | Table skeleton, 5 rows |
| **Partial** | One row's `unitCount` unresolved → `—` |
| **Error** | Inline retry above the table |
| **Conflict** | `409` after approve/reject → the row is stale; show `Lộ trình đã được xử lý bởi người khác.` and refetch the queue rather than leaving a wrong badge |
| **Forbidden** | Standard forbidden panel |
| **Offline** | N/A — no offline support in this product |

The Conflict state is not optional: two admins working the same queue is the normal case, not an
edge case.

## 8. Copy

| Location | String |
|---|---|
| Title | `Lộ trình học` |
| Tabs | `Chờ duyệt` · `Đã duyệt` · `Bị từ chối` · `Tạm ẩn` · `Tất cả` |
| Tabs (lessons) | `Bài học đã publish` |
| Row actions | `Duyệt` · `Từ chối` · `Gỡ` |
| Approve confirm | `Duyệt lộ trình này? Học viên toàn nền tảng sẽ thấy ngay.` |
| Reject modal title | `Từ chối lộ trình` |
| Reject helper | `Giáo viên sẽ thấy lý do này và có thể sửa rồi gửi lại.` |
| Unpublish confirm | `Gỡ bài học khỏi nền tảng? Tiến độ học viên đã học vẫn được giữ.` |
| Disabled action tooltip | `Chỉ xử lý được ở tab Chờ duyệt.` |
| Empty queue | `Hàng đợi trống.` |
| Conflict | `Lộ trình đã được xử lý bởi người khác.` |
| Toasts | `Đã duyệt lộ trình` · `Đã từ chối lộ trình` · `Đã gỡ bài học` |

## 9. Interactions

- Tab change writes `?status=` and refetches; the default tab is `Chờ duyệt`, so the queue is what
  loads first
- Approve and reject act on the row and keep the reviewer in the tab — the row leaves, the rest of
  the queue stays where it was
- A `409` refetches instead of retrying: the state moved underneath, and retrying would only fail again
- Reject's confirm is disabled until the reason is both long enough and not whitespace-only
- Below 768px the table becomes a card list; `Duyệt` / `Từ chối` move into the card, never off-screen

## 10. Constraints — do NOT

- Do not add editing of any kind — admin reviews, never authors
- Do not offer bulk approve or bulk reject; each decision is about one path's content
- Do not show learner-progress or completion numbers on this screen
- Do not optimistically flip a status badge before the server confirms it
- Do not treat an empty queue as an error or a dead end
