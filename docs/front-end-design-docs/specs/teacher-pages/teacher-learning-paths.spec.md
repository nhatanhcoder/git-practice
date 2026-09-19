---
page: Teacher · Learning Paths
route: /teacher/learning-paths
contract: ../../pages/teacher-pages/teacher-learning-paths.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-19
---

# Page Spec — Teacher · Learning Paths

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global do-NOTs.
> This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent colours, fonts
> or spacing — this product has a locked design system.

---

## 1. Purpose

The teacher's own learning paths: which are still being written, which are waiting on the admin,
which are live, and which came back with a reason. One primary action — start a new path.

## 2. Access

`teacher`, **own paths only** — the server filters by the token's `userId`; there is no filter
control for "teacher" and no way to see a colleague's paths. Admin reviews the same entities on
`/admin/learning-paths`, which is a different route.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load list | `GET /api/v1/teacher/learning-paths` | `data.items[]`, `meta` | — |
| Filter by status | `GET /api/v1/teacher/learning-paths?status=&page=` | `data.items[]`, `meta` | `VALIDATION_ERROR` |
| Create path | `POST /api/v1/teacher/learning-paths` | `data.id` | `VALIDATION_ERROR` |
| Delete path | `DELETE /api/v1/teacher/learning-paths/:pathId` | — | `LEARNING_PATH_HAS_PUBLISHED_UNITS`, `LEARNING_PATH_NOT_FOUND` |

`VALIDATION_ERROR.details` is keyed by field name; map it into per-field errors on the create modal.

## 4. Page structure

1. **Title row** — `h1` + primary button `Tạo lộ trình`
2. **Status tabs** — `Tất cả · Bản nháp · Chờ duyệt · Đã duyệt · Bị từ chối · Tạm ẩn`; the active tab
   is mirrored into `?status=` so the view is linkable
3. **Path table** — `Lộ trình · Bài học · Đã publish · Trạng thái · Cập nhật ·` row menu
4. **Pagination**

The `rejected` reason is **not** a column — it appears as a second line under the title cell of that
row only, truncated to one line, with the full text on the detail screen.

## 5. Component specs

### Status tabs

Standard tabs from `_DESIGN-SYSTEM.md` §4, with one badge per tab showing that tab's count. Counts
come from `meta`, not from counting the current page — counting the visible rows would silently lie
whenever there is more than one page.

### Path table

| Column | Content |
|---|---|
| Lộ trình | title (semibold) + optional `MOCK`-free subtitle line with the rejection reason |
| Bài học | `unitCount`; `—` while unresolved, never `0` |
| Đã publish | `publishedUnitCount`; same `—` rule |
| Trạng thái | Status Badge, colour from the §2.1 enum table — `draft`, `pending_review`, `approved`, `rejected`, `suspended` |
| Cập nhật | `updatedAt`, formatted by the shared date formatter (ISO on the wire) |
| — | Row menu: `Mở` · `Xoá` |

`Xoá` is rendered **disabled with a tooltip** when the path has a published lesson or recorded
learners — the reason is stated before the click, not as an error after it.

### Create modal

Two fields: `Tên lộ trình` (required, 3–300) and `Mô tả` (optional, ≤ 2000, textarea). Standard
Modal from `_DESIGN-SYSTEM.md` §4.5. On success, navigate straight to the new path's detail screen —
a freshly created path is empty, and the list is not where the teacher wants to be.

## 6. Data — use these exact values

```json
{
  "items": [
    { "id":"p1","title":"Từ vựng HSK 3 · Chủ đề gia đình","status":"approved",
      "unitCount":4,"publishedUnitCount":4,"rejectionReason":null,
      "updatedAt":"2026-09-19T09:20:00Z" },
    { "id":"p2","title":"Luyện đọc HSK 4 · Tin tức ngắn","status":"pending_review",
      "unitCount":3,"publishedUnitCount":0,"rejectionReason":null,
      "updatedAt":"2026-09-18T15:02:00Z" },
    { "id":"p3","title":"Từ vựng HSK 2 · Đồ ăn và thức uống","status":"rejected",
      "unitCount":2,"publishedUnitCount":0,
      "rejectionReason":"Nghĩa tiếng Việt chưa thống nhất giữa các từ trong bài 2; bổ sung pinyin đầy đủ rồi gửi lại.",
      "updatedAt":"2026-09-17T08:40:00Z" },
    { "id":"p4","title":"","status":"draft","unitCount":0,"publishedUnitCount":0,
      "rejectionReason":null,"updatedAt":"2026-09-16T11:00:00Z" }
  ],
  "meta": { "page":1,"pageSize":20,"total":4 }
}
```

Row `p4` deliberately has an empty title and zero lessons: it covers the awkward case (a path created
a second ago) without which the empty-title cell is never designed.

## 7. States

Switcher: `Ready · Loading · Empty · Filtered-empty · Partial · Error · Forbidden`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton, 5 rows, tabs rendered but inert |
| **Ready** | Data above |
| **Empty** | No path at all → `Bạn chưa có lộ trình nào` + primary `Tạo lộ trình đầu tiên` |
| **Filtered-empty** | A different message per tab — e.g. `Không có lộ trình nào chờ duyệt`. Reusing the create-CTA copy here would tell a teacher with 12 paths to create their first one |
| **Partial** | `unitCount` unresolved on one row → `—` in that cell only |
| **Error** | Inline retry block above the table; tabs keep their last counts |
| **Forbidden** | Standard forbidden panel |
| **Offline** | N/A — no offline support in this product |

## 8. Copy

| Location | String |
|---|---|
| Title | `Lộ trình học` |
| Primary | `Tạo lộ trình` |
| Tabs | `Tất cả` · `Bản nháp` · `Chờ duyệt` · `Đã duyệt` · `Bị từ chối` · `Tạm ẩn` |
| Empty | `Bạn chưa có lộ trình nào` |
| Empty CTA | `Tạo lộ trình đầu tiên` |
| Filtered empty | `Không có lộ trình nào ở trạng thái này` |
| Delete confirm | `Xoá lộ trình này? Hành động không thể hoàn tác.` |
| Delete disabled tooltip | `Không xoá được: lộ trình đã có bài học được publish hoặc đã có học viên học.` |
| Toasts | `Đã tạo lộ trình` · `Đã xoá lộ trình` |

## 9. Interactions

- Tab click updates `?status=` and refetches; the tab is a link, so it can be shared
- Row click opens the detail; the row menu is a separate hit target and must not also navigate
- Create modal: `Enter` submits, `Esc` closes, focus returns to the trigger (use `Overlay`/`useOverlay`)
- Below 768px the table becomes a card list — status badge and lesson counts stay visible, the
  `Cập nhật` column moves under the title

## 10. Constraints — do NOT

- Do not add a teacher filter — the server scopes the list, and exposing the control would imply
  access that does not exist
- Do not offer `Duyệt` / `Từ chối` here; approval is admin-only
- Do not compute `unitCount` from the page's rows, and never render `0` for an unresolved count
- Do not let the delete action fail into an error toast when the menu item could have been disabled
