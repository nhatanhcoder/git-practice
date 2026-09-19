---
module: Learning Catalog — Admin moderation
status: proposed
blocked_by: -
owner: -
last_updated: 2026-09-19
---

## 0. Summary

Admin duyệt learning path do giáo viên gửi, từ chối kèm lý do, suspend/khôi phục một path đã duyệt,
và **gỡ từng bài học đã publish** trên toàn nền tảng. Module này là phía **kiểm duyệt**: nó không
tạo và không sửa nội dung. Phạm vi toàn nền tảng (ADR-017 §2) khiến quyền gỡ ở mức unit là hàng rào
bắt buộc, vì cổng duyệt path chỉ chạy một lần trước khi giáo viên tự publish các bài học về sau.

Ranh giới: module này **không** đọc/ghi `user_learning_progress` ngoài việc nó tồn tại, không xoá
nội dung, không sửa `words`, không tạo path. Approve/reject/suspend chỉ đổi trạng thái + audit +
notification.

## 1. Tables touched

| Table / Collection | Read/Write | Notes |
|---|---|---|
| `LearningPath` (Postgres) | Read + Write | Ghi đúng các cột kiểm duyệt: `status`, `reviewedById`, `reviewedAt`, `rejectionReason`, `suspendedById`, `suspendedAt`. Không ghi `title`/`description`/`curriculumKey`/`ownerId` |
| `learning_units` (Mongo) | Read + Write | Chỉ đổi cờ `published` khi gỡ unit. **Không** sửa `words`, `title`, `order` |
| `Notification` (Postgres) | Write | INSERT `learning_path_approved` / `learning_path_rejected` / `learning_path_suspended` |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/admin/learning-paths` | admin | List mọi path — `?status=&teacherId=&page=` | proposed |
| GET | `/api/v1/admin/learning-paths/:pathId` | admin | Chi tiết path + unit + audit kiểm duyệt | proposed |
| PATCH | `/api/v1/admin/learning-paths/:pathId/approve` | admin | `pending_review` → `approved` | proposed |
| PATCH | `/api/v1/admin/learning-paths/:pathId/reject` | admin | `pending_review` → `rejected`, bắt buộc `rejectionReason` | proposed |
| PATCH | `/api/v1/admin/learning-paths/:pathId/suspend` | admin | `approved` → `suspended` | proposed |
| PATCH | `/api/v1/admin/learning-paths/:pathId/restore` | admin | `suspended` → `approved` | proposed |
| GET | `/api/v1/admin/learning-units` | admin | List unit đã publish trên mọi path — `?teacherId=&pathId=&page=` | proposed |
| PATCH | `/api/v1/admin/learning-units/:unitId/unpublish` | admin | Gỡ một unit đã publish, kể cả khi path đang `approved` | proposed |

Response của 4 endpoint chuyển trạng thái trả về chính bản ghi path sau khi đổi (cùng shape với
teacher detail) — theo pattern `PATCH /admin/sessions/:id/reject`.

## 3. DTO

### Request

**`PATCH /admin/learning-paths/:pathId/reject`**
| Field | Type | Required | Constraint |
|---|---|---|---|
| `rejectionReason` | string | yes | Trim; `minLength 10`, `maxLength 2000`; không chỉ khoảng trắng |

`approve`, `suspend`, `restore`, `unpublish` nhận body rỗng. Không field nào khác được nhận
(`forbidNonWhitelisted`) — admin không sửa nội dung qua các endpoint này.

### Response

```json
{ "data": { "id": "uuid", "title": "string", "curriculumKey": "tp-<slug>",
  "owner": { "id": "uuid", "nickname": "string" },
  "status": "approved", "unitCount": 3, "publishedUnitCount": 2,
  "submittedAt": "2026-09-19T09:00:00Z", "reviewedAt": "2026-09-19T10:00:00Z",
  "reviewedBy": { "id": "uuid", "nickname": "string" }, "rejectionReason": null,
  "suspendedAt": null, "createdAt": "2026-09-19T09:00:00Z" } }
```

List trả `meta` phân trang. Unit trong detail giống shape teacher detail, cộng `moderation` (lần
gỡ gần nhất nếu có). Không trả `sourceHash` ra wire.

## 4. Business rules (invariants)

INV-LMOD-01: Chỉ `admin` gọi được mọi endpoint của module này; teacher và student nhận 403.
INV-LMOD-02: `approve` và `reject` chỉ hợp lệ từ `pending_review`, kiểm bằng atomic conditional
update trên `status` nguồn. Hai admin chạy song song: đúng một thắng, người kia nhận
`LEARNING_PATH_INVALID_STATUS`.
INV-LMOD-03: `reject` bắt buộc có `rejectionReason` hợp lệ; lý do được lưu và trả lại trong detail
cho cả admin lẫn giáo viên sở hữu.
INV-LMOD-04: `suspend` chỉ từ `approved`; `restore` chỉ từ `suspended`. Không có đường tắt từ
`pending_review` sang `suspended`.
INV-LMOD-05: `approve` chỉ hợp lệ khi path có **≥ 1 unit đã tạo** (kể cả unit `draft`) — kiểm lại
ở thời điểm approve, không tin trạng thái lúc submit.
INV-LMOD-06: Admin **unpublish được mọi unit đã publish**, kể cả unit do giáo viên tự publish sau
khi path đã duyệt. Đây là hàng rào bù cho việc duyệt path một lần (ADR-017 §2).
INV-LMOD-07: Không hành động nào của module này xoá dữ liệu: `suspend`/`unpublish` giữ nguyên
`words`, `learning_units` row, và `user_learning_progress` của học viên.
INV-LMOD-08: Mọi chuyển trạng thái ghi audit đủ: ai làm, lúc nào, và lý do khi từ chối.
INV-LMOD-09: Admin không tạo, không sửa, không xoá nội dung hay metadata của path qua module này.
INV-LMOD-10: `restore` đưa path về đúng trạng thái hiển thị trước đó; học viên thấy lại đúng những
unit đang `published`, không tự publish thêm unit nào.
INV-LMOD-11: Sau `suspend`, học viên không thấy path và không thấy unit của nó; tiến độ đã ghi
không bị ảnh hưởng và không bị xoá.
INV-LMOD-12: Path `rejected` không tự trở về `draft`; chỉ giáo viên chủ động submit lại (module
teacher INV-LCAT-04).

## 5. Ownership / RBAC

Admin không sở hữu path — quyền đến từ role `admin`, kiểm ở guard **và** không có predicate chủ
sở hữu nào bị bỏ qua. Ngược lại, module này **không** được nới quyền đọc của teacher/student.

`RBAC_MATRIX.md` dòng `LearningCatalog | author / publish` nhánh Admin được thay bằng: đọc tất cả,
duyệt, từ chối, suspend, restore, unpublish unit. Admin **không** có quyền `author`.

## 6. State machine

```
pending_review ──approve──► approved ──suspend──► suspended
       │                        ▲                    │
       └──reject──► rejected    └──────restore───────┘
                       │
                       └──(teacher submit lại)──► pending_review
```

`approved` là trạng thái duy nhất học viên thấy nội dung. `suspended` ẩn path nhưng giữ mọi dữ
liệu. Không có cạnh nào từ `draft` — admin không duyệt một path giáo viên chưa gửi.

## 7. Transaction boundary

Trong **một** transaction Postgres: đổi `status` + ghi cột audit + INSERT `Notification`. Dùng
`updateMany` có điều kiện trên trạng thái nguồn; nếu `count === 0` thì rollback và trả
`LEARNING_PATH_INVALID_STATUS` (đúng pattern `users.service.ts` / session review).

Gỡ unit (Mongo) là một document update độc lập, **sau** khi Postgres đã ở trạng thái đúng nếu hành
động đó cũng đổi trạng thái path. Không có transaction xuyên hai store (`DEBT-001`).

## 8. Idempotency & concurrency

- Bốn endpoint chuyển trạng thái đều idempotent theo nghĩa: gọi lại sau khi thành công trả
  `LEARNING_PATH_INVALID_STATUS` (không nhân đôi hiệu ứng, không bắn notification lần hai).
- Hai admin approve cùng lúc ⇒ đúng một `200`, người kia `409`.
- `unpublish` unit đã `unpublished` ⇒ `LEARNING_PATH_INVALID_STATUS` (hoặc 404 nếu unit không tồn
  tại) — không im lặng thành công.

## 9. Error → code mapping

| Nhánh lỗi | HTTP | Code | Code status |
|---|---|---|---|
| Path không tồn tại | 404 | `LEARNING_PATH_NOT_FOUND` | proposed |
| Chuyển trạng thái không hợp lệ / đã bị người khác đổi trước | 409 | `LEARNING_PATH_INVALID_STATUS` | proposed |
| Approve khi path chưa có unit nào | 409 | `LEARNING_PATH_EMPTY` | proposed |
| Thiếu hoặc sai `rejectionReason` | 400 | `LEARNING_PATH_REJECTION_REASON_REQUIRED` | proposed |
| Unit không tồn tại hoặc chưa từng publish | 404 | LEARNING_UNIT_NOT_FOUND | đã có (module student) |
| Unit đã `unpublished` từ trước | 409 | `LEARNING_PATH_INVALID_STATUS` | proposed |

Không dùng code nào khác. Toàn bộ family `LEARNING_PATH_*` là **proposed, not agreed** cho tới khi
có người ký; code *proposed* chưa được dùng trong code chạy.

## 10. Side effects & notifications

| Hành động | Notification | Gửi cho |
|---|---|---|
| `approve` | `learning_path_approved` | giáo viên sở hữu path |
| `reject` | `learning_path_rejected` | giáo viên sở hữu path |
| `suspend` | `learning_path_suspended` | giáo viên sở hữu path |
| `restore` | — | không bắn |
| `unpublish` unit | — | không bắn (giáo viên thấy trạng thái unit trong màn của mình) |

Payload notification mang `referenceType = learning_path`, `referenceId = pathId` để deep-link về
`/teacher/learning-paths/[pathId]`. Tên type được chốt ở module teacher §10 và ở đây — hai nơi
phải khớp; cả 4 phải được thêm vào enum `NotificationType` và vào `07-notifications.md` §2 (BE
slice).

## 11. Index & query

- Postgres: index `(status)` cho hàng đợi duyệt (mặc định lọc `pending_review`), index
  `(teacherId)`/`(ownerId)` cho lọc theo giáo viên, `(reviewedById, reviewedAt)` để tra audit.
- Hàng đợi phân trang 20/trang, sắp xếp `submittedAt ASC` (FIFO — path chờ lâu lên trước).
- `GET /admin/learning-units` lọc theo `published = true`; đếm bằng aggregate, không N+1.

## 12. Migration & seed

Không có migration riêng: module này dùng đúng bảng/enum mà module teacher tạo (một migration set,
`LearningPath` trước — cùng nguyên tắc như teacher T6 §12 với `PayrollPeriod`). Nếu hai slice được
triển khai tách rời, migration thuộc slice nào tạo bảng thì slice đó sở hữu.

Seed cho test: một admin thứ hai (để kiểm hai admin chạy song song), một path `pending_review` có
unit, một path `approved` có unit đã publish, một giáo viên khác không sở hữu gì.

## 13. Security & rate limit

- Admin đọc được nội dung mọi path — kể cả `draft` — nhưng endpoint này không trả `sourceHash`.
- `rejectionReason` là text do người dùng nhập: render như text, lưu nguyên văn, không HTML.
- Không có endpoint nào cho admin sửa nội dung, nên không có đường vòng qua immutability của unit
  đã publish (INV-LCAT-07).
- Chưa đặt rate limit riêng.

## 14. Observability

- Log mọi lần approve/reject/suspend/restore/unpublish: actor, pathId/unitId, trạng thái nguồn,
  trạng thái đích. Đây là audit vận hành cho một cổng kiểm duyệt chỉ chạy một lần.
- Đếm số path `pending_review` và số unit bị gỡ, để thấy khối lượng kiểm duyệt thực tế.
- Không log nội dung từ vựng.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-LMOD-01 | integration (real DB) | teacher/student gọi mọi endpoint ⇒ 403 |
| INV-LMOD-02 | integration (real DB) | Hai admin approve song song ⇒ đúng một 200, một 409; notification chỉ một |
| INV-LMOD-03 | service + integration | Thiếu lý do / lý do < 10 ký tự / chỉ khoảng trắng ⇒ 400; lý do hiện trong detail của giáo viên |
| INV-LMOD-04 | integration | `suspend` từ `pending_review` ⇒ 409; `restore` từ `approved` ⇒ 409 |
| INV-LMOD-05 | integration | Approve path 0 unit ⇒ `LEARNING_PATH_EMPTY`; path có unit `draft` ⇒ approve được |
| INV-LMOD-06 | integration (real DB) | Gỡ unit do giáo viên tự publish sau khi path approved ⇒ thành công |
| INV-LMOD-07 | integration (real DB) | Sau suspend + unpublish: `words` còn nguyên, `user_learning_progress` còn nguyên |
| INV-LMOD-08 | integration | Audit đủ `reviewedById`/`reviewedAt`/`rejectionReason` sau mỗi lần chuyển |
| INV-LMOD-09 | integration | Không endpoint nào của admin đổi `title`/`description`/`words` |
| INV-LMOD-10 | integration (real DB) | `restore` ⇒ học viên thấy lại đúng tập unit `published` như trước |
| INV-LMOD-11 | integration (real DB) | Học viên không thấy path `suspended`; progress không đổi |
| INV-LMOD-12 | integration | Path `rejected` giữ nguyên cho tới khi giáo viên submit lại |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Admin có cần xem **lịch sử** các lần duyệt (nhiều vòng reject → approve) không, hay chỉ trạng thái hiện tại? | Chỉ là hiển thị; bản đầu ghi trạng thái hiện tại + audit gần nhất | Project owner | trước Slice 3 |
| Suspend có nên kèm lý do gửi cho giáo viên như reject không? | Nội dung notification; mặc định **không** ở bản đầu | Project owner | trước Slice 1 |
| Có cần một hàng đợi riêng cho unit bị gỡ (để giáo viên biết vì sao) không? | Không chặn | — | — |
