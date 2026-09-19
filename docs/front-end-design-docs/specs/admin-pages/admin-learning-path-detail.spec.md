---
page: Admin · Learning Path Review
route: /admin/learning-paths/[pathId]
contract: ../../pages/admin-pages/admin-learning-path-detail.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
design_baseline: v1
last_updated: 2026-09-19
---

# Page Spec — Admin · Learning Path Review

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global do-NOTs.
> This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent colours, fonts or
> spacing — this product has a locked design system.

---

## 1. Purpose

Read what a teacher actually wrote, then decide its fate: approve it, send it back with a reason, or
suspend a path that is already live.

## 2. Access

`admin` only. Admin may read any path, including a `draft` one, for audit — there is no ownership
predicate on this screen, and all four action endpoints are admin-only.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load path + lessons + audit | `GET /api/v1/admin/learning-paths/:pathId` | `data`, `data.units[]` | `LEARNING_PATH_NOT_FOUND` |
| Approve | `PATCH /api/v1/admin/learning-paths/:pathId/approve` | `data.status` | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |
| Reject | `PATCH /api/v1/admin/learning-paths/:pathId/reject` | `data.status` | `LEARNING_PATH_REJECTION_REASON_REQUIRED`, `LEARNING_PATH_INVALID_STATUS` |
| Suspend | `PATCH /api/v1/admin/learning-paths/:pathId/suspend` | `data.status` | `LEARNING_PATH_INVALID_STATUS` |
| Restore | `PATCH /api/v1/admin/learning-paths/:pathId/restore` | `data.status` | `LEARNING_PATH_INVALID_STATUS` |
| Unpublish one lesson | `PATCH /api/v1/admin/learning-units/:unitId/unpublish` | — | `LEARNING_PATH_INVALID_STATUS` |

## 4. Page structure

1. **Header** — path title, teacher name, status badge, `submittedAt`, and the action set for the
   current status
2. **Description block** — the teacher's own text, verbatim
3. **Lesson table** — `Thứ tự · Bài học · HSK · Loại · Số từ · Publish ·` action `Gỡ`
4. **Lesson preview** — expanding a row shows its words inline (`Hán tự · Pinyin · Nghĩa`), read-only
5. **Audit block** — who last reviewed, when, and the rejection reason when `rejected`

Action set by status: `pending_review` → `Duyệt` + `Từ chối`; `approved` → `Tạm ẩn`;
`suspended` → `Khôi phục`; `draft` (audit view) → none.

## 5. Component specs

### Lesson preview

An expandable row, **not a modal** — a reviewer compares lessons and needs the table to stay visible.
The preview renders the words as a plain read-only list. This is the content being approved, so it
must be reachable without leaving the screen.

For a `kind: "reference"` lesson the preview shows the referenced unit's words plus a line saying the
words belong to the catalog entry and this lesson only points at it.

### Action bar

Placed in the header, right-aligned. `Duyệt` is primary only while `pending_review`; on an `approved`
path the destructive-adjacent action `Tạm ẩn` is secondary and confirm-gated. No status-changing
action fires without a confirm modal that states the student-visible consequence.

### Audit block

Text-only, muted: `Người duyệt · Thời điểm · Lý do từ chối`. When the path went through more than one
round, the block shows the most recent decision — history beyond that is explicitly out of scope for
this version.

## 6. Data — use these exact values

```json
{
  "path": { "id":"p2","title":"Luyện đọc HSK 4 · Tin tức ngắn",
            "teacher":{"id":"t1","nickname":"Nguyễn Thu Hà"},
            "description":"Bộ bài đọc ngắn theo chủ đề thời sự, mỗi bài 6–8 từ mới.",
            "status":"pending_review","unitCount":3,"publishedUnitCount":0,
            "submittedAt":"2026-09-18T15:02:00Z","reviewedAt":null,"reviewedBy":null,
            "rejectionReason":null,"suspendedAt":null },
  "units": [
    { "id":"u1","order":1,"title":"Bài 1 · Tin trong ngày","level":4,"kind":"authored",
      "published":false,"wordCount":8,
      "words":[{"hanzi":"新","pinyin":"xīn","meaning":"mới"},
               {"hanzi":"闻","pinyin":"wén","meaning":"nghe"}] },
    { "id":"u2","order":2,"title":"Bài 2 · Thời tiết","level":4,"kind":"authored",
      "published":false,"wordCount":6,"words":[] },
    { "id":"u3","order":3,"title":"Từ vựng HSK 3 · Gia đình","level":3,"kind":"reference",
      "published":false,"wordCount":8,"referenceSlug":"hanlo-v1-hsk-3-unit-2",
      "words":[{"hanzi":"家","pinyin":"jiā","meaning":"nhà"}] }
  ],
  "suspendedExample": { "status":"suspended","suspendedAt":"2026-09-19T07:15:00Z",
                        "reviewedBy":{"id":"a1","nickname":"Bùi Anh Tuấn"},
                        "reviewedAt":"2026-09-15T09:31:00Z" }
}
```

`u2` carries only its word count, not its words — the expanded-preview state must also survive a
partially loaded lesson, which is what the row-level skeleton covers.

## 7. States

Switcher: `Pending review · Approved · Suspended · Rejected · Empty path · Loading · Error · Conflict`

| State | Appearance |
|---|---|
| **Pending review** | `Duyệt` + `Từ chối` in the header |
| **Approved** | `Tạm ẩn` only; the header states the path is live to every student |
| **Suspended** | `Khôi phục`; a muted banner says students cannot see it and that progress is kept |
| **Rejected** | Reason-block visible; no state actions (the teacher must resubmit) |
| **Empty path** | A submitted path with 0 lessons should be impossible (`submit` requires ≥ 1); if it occurs, show it plainly and keep `Duyệt` disabled with `Lộ trình chưa có bài học nào.` |
| **Loading** | Header + table skeleton |
| **Error** | A failed action keeps the current status on screen and shows the error inline; the badge never flips optimistically |
| **Conflict** | `409` → `Lộ trình đã được xử lý bởi người khác.` and refetch |
| **Forbidden** | Standard forbidden panel |
| **Offline** | N/A — no offline support in this product |

## 8. Copy

| Location | String |
|---|---|
| Actions | `Duyệt` · `Từ chối` · `Tạm ẩn` · `Khôi phục` · `Gỡ` |
| Approve confirm | `Duyệt lộ trình này? Học viên toàn nền tảng sẽ thấy ngay.` |
| Reject modal | `Từ chối lộ trình` + `Lý do từ chối` + `Giáo viên sẽ thấy lý do này và có thể sửa rồi gửi lại.` |
| Suspend confirm | `Tạm ẩn lộ trình? Học viên sẽ không thấy lộ trình này nữa. Tiến độ đã học vẫn được giữ.` |
| Restore confirm | `Khôi phục lộ trình? Học viên sẽ thấy lại đúng các bài đang publish.` |
| Unpublish confirm | `Gỡ bài học khỏi nền tảng? Tiến độ học viên đã học vẫn được giữ.` |
| Suspended banner | `Lộ trình đang bị tạm ẩn. Học viên không thấy nội dung; tiến độ đã học vẫn còn.` |
| Empty path | `Lộ trình chưa có bài học nào.` |
| Audit labels | `Người duyệt` · `Thời điểm` · `Lý do từ chối` |
| Reference note | `Bài học này dùng từ vựng của một bài có sẵn trong catalog.` |
| Conflict | `Lộ trình đã được xử lý bởi người khác.` |
| Toasts | `Đã duyệt lộ trình` · `Đã từ chối lộ trình` · `Đã tạm ẩn lộ trình` · `Đã khôi phục lộ trình` · `Đã gỡ bài học` |

## 9. Interactions

- Expanding a lesson previews it in place; only one preview open at a time
- Every status action opens a confirm modal naming the student-visible effect, and `Esc` cancels
- A `409` refetches rather than retrying
- The lesson `Gỡ` action is available while the path stays `approved` — that is the point of this
  screen, and it must not be hidden behind the path-level actions
- Below 768px the table becomes a card list; the preview expands inside the card and the action bar
  becomes a sticky footer

## 10. Constraints — do NOT

- Do not allow editing the title, description, words or ordering — admin reviews, never authors
- Do not add a delete action, or a bulk approve of all lessons
- Do not show learner progress, completion rates or scores
- Do not flip the status badge optimistically before the server confirms
- Do not build a full review-history timeline — most recent decision only
