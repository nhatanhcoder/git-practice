---
module: Learning Catalog — Teacher authoring
status: proposed
blocked_by: -
owner: -
last_updated: 2026-09-19
---

## 0. Summary

Giáo viên tạo và sở hữu một `LearningPath`, soạn bài học trong đó, gửi admin duyệt, rồi tự
publish từng bài học sau khi path đã được duyệt. Module này là phía **authoring**: nó tạo ra nội
dung; việc duyệt và gỡ là của module `09-learning-catalog-moderation.md`. Nội dung bài học nằm ở
Mongo `learning_units`; metadata, trạng thái và audit của path nằm ở Postgres `LearningPath` —
đúng ADR-017 §4.

Ranh giới: module này **không** đọc hay ghi tiến độ học viên (`user_learning_progress`), không tạo
Attempt, không ghi SRS/Flashcard, và không publish corpus nền tảng `hanlo_vocabulary` (việc đó vẫn
là CLI `apps/api/scripts/learning-path-import.ts`).

## 1. Tables touched

| Table / Collection | Read/Write | Notes |
|---|---|---|
| `LearningPath` (Postgres) | Read + Write | Tạo path, sửa `title`/`description`, ghi `status` khi submit. Không ghi các cột audit duyệt (`reviewedById`, `reviewedAt`, `rejectionReason`) — đó là quyền của admin (module 09) |
| `learning_units` (Mongo) | Read + Write | Tạo/sửa/xoá unit `draft`, đổi `published` khi publish/unpublish, ghi `slug`, `pathId`, `authorId`, `sourceHash`, `order`. **Không sửa `words` của unit đã `published`** (INV-LCAT-07) |
| `user_learning_progress` (Mongo) | Read only | Chỉ đọc để chặn xoá path đã có người học (INV-LCAT-11). Không bao giờ ghi |
| `Notification` (Postgres) | Write | INSERT `learning_path_submitted` khi submit (fan-out cho mọi admin) |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/api/v1/teacher/learning-paths` | teacher | Tạo path ở `draft` | proposed |
| GET | `/api/v1/teacher/learning-paths` | teacher | List path của chính mình — `?status=&page=` | proposed |
| GET | `/api/v1/teacher/learning-paths/:pathId` | teacher | Chi tiết path + danh sách unit của nó | proposed |
| PATCH | `/api/v1/teacher/learning-paths/:pathId` | teacher | Sửa `title` / `description` | proposed |
| DELETE | `/api/v1/teacher/learning-paths/:pathId` | teacher | Xoá path — chỉ khi chưa publish unit nào và chưa có tiến độ | proposed |
| POST | `/api/v1/teacher/learning-paths/:pathId/submit` | teacher | Gửi duyệt: `draft`/`rejected` → `pending_review` | proposed |
| PATCH | `/api/v1/teacher/learning-paths/:pathId/units/reorder` | teacher | Đổi thứ tự unit — payload phải là permutation 1..N | proposed |
| POST | `/api/v1/teacher/learning-paths/:pathId/units` | teacher | Tạo unit trong path (luôn ở `draft`) | proposed |
| GET | `/api/v1/teacher/learning-units` | teacher | List unit đã publish để **tham chiếu** — `?level=&curriculum=&page=` | proposed |
| PATCH | `/api/v1/teacher/learning-units/:unitId` | teacher | Sửa unit `draft`; unit đã từng publish là bất biến | proposed |
| DELETE | `/api/v1/teacher/learning-units/:unitId` | teacher | Xoá unit `draft`; unit đã từng publish không được xoá | proposed |
| POST | `/api/v1/teacher/learning-units/:unitId/publish` | teacher | `draft`/`unpublished` → `published` — path phải `approved` | proposed |
| POST | `/api/v1/teacher/learning-units/:unitId/unpublish` | teacher | `published` → `unpublished`, giữ nguyên tiến độ học viên | proposed |

`curriculumKey` của path do server sinh từ slug path, không nhận từ client.

## 3. DTO

### Request

**`POST /teacher/learning-paths`**
| Field | Type | Required | Constraint |
|---|---|---|---|
| `title` | string | yes | Trim; 3–300 ký tự; không chỉ khoảng trắng |
| `description` | string | no | ≤ 2000 ký tự |

**`PATCH /teacher/learning-paths/:pathId`** — `title?`, `description?` cùng ràng buộc trên.
`curriculumKey`, `status`, `ownerId` **không nhận từ client** (`forbidNonWhitelisted`).

**`POST /teacher/learning-paths/:pathId/units`**
| Field | Type | Required | Constraint |
|---|---|---|---|
| `kind` | `"authored"` \| `"reference"` | yes | |
| `title` | string | yes | 3–300 ký tự |
| `level` | number | yes | HSK 1–9 |
| `words` | `{hanzi, pinyin, meaning}[]` | chỉ khi `authored` | 1–8 phần tử; `hanzi` không rỗng; không trùng `hanzi` trong cùng unit |
| `referenceSlug` | string | chỉ khi `reference` | Phải là unit đang `published` |

Mỗi path có tối đa **100 unit**. Request tạo unit thứ 101 trả `VALIDATION_ERROR`
trước khi ghi Mongo.

**`PATCH /teacher/learning-units/:unitId`** — `title?`, `level?`, `words?`. `kind`, `referenceSlug`,
`slug`, `pathId` là bất biến sau khi tạo.

**`PATCH .../units/reorder`** — `[{ id, order }]`, phải là permutation hoàn chỉnh `1..N` của toàn
bộ unit trong path; thiếu, trùng id, trùng `order` hoặc ngoài khoảng đều bị từ chối **trước khi**
chạm DB.

**`POST .../units/:unitId/publish`** — body rỗng.

### Response

Mọi response bọc trong `{ "data": ... }`; list có `meta`.

```json
{ "data": { "id": "uuid", "title": "string", "description": null,
  "curriculumKey": "tp-<slug>", "status": "draft",
  "submittedAt": null, "reviewedAt": null, "rejectionReason": null,
  "unitCount": 0, "publishedUnitCount": 0,
  "createdAt": "2026-09-19T09:00:00Z", "updatedAt": "2026-09-19T09:00:00Z" } }
```

Unit trong detail:
```json
{ "id": "uuid", "slug": "tp-<slug>-u1", "order": 1, "title": "string", "level": 3,
  "kind": "authored", "published": false, "wordCount": 8, "referenceSlug": null,
  "createdAt": "2026-09-19T09:00:00Z", "updatedAt": "2026-09-19T09:00:00Z" }
```

`words` chỉ trả về ở unit detail/authored; **không** trả `sourceHash` ra wire.

## 4. Business rules (invariants)

INV-LCAT-01: Path thuộc đúng một giáo viên (`ownerId`). Mọi read/write kiểm ở service bằng
predicate trên `ownerId`; thiếu chủ sở hữu ⇒ **từ chối**, không phải bỏ qua check.
INV-LCAT-02: Không giáo viên nào đọc hoặc ghi được path/unit của giáo viên khác, kể cả khi biết id.
INV-LCAT-03: Path ở `pending_review` hoặc `suspended` là **đóng băng** với giáo viên: mọi write
trả `LEARNING_PATH_FROZEN`, không có ngoại lệ cho `title`/`description`.
INV-LCAT-04: `submit` chỉ từ `draft` hoặc `rejected`, cần **≥ 1 unit**, và chuyển trạng thái
atomically trên `status` nguồn.
INV-LCAT-05: Không có đường nào để giáo viên tự chuyển path sang `approved`; `approved` chỉ do
admin (module 09).
INV-LCAT-06: Unit tạo ra luôn ở `draft`; **publish chỉ khi path đang `approved`**.
INV-LCAT-07: Unit đã từng `published` là **bất biến về nội dung**: cả `published`
và `unpublished` đều không cho `PATCH`/`DELETE`, trả `LEARNING_UNIT_PUBLISHED_IMMUTABLE`.
Sửa = tạo unit mới rồi unpublish unit cũ; unit `unpublished` chỉ có thể republish nguyên vẹn.
INV-LCAT-08: `slug` sinh một lần khi tạo và **không bao giờ đổi** (tiến độ học viên khoá theo
`slug`). `curriculumKey` cũng bất biến sau khi tạo.
INV-LCAT-09: `reorder` chỉ chấp nhận permutation hoàn chỉnh `1..N`; payload sai bị từ chối trước
khi ghi, để không bao giờ đâm vào unique index `(curriculum, level, order)`.
INV-LCAT-10: Unit `reference` **không sao chép** `words`; nó trỏ tới `referenceSlug` và chỉ được
trỏ tới unit đang `published` của path nguồn không `suspended` (ADR-016 §2, ADR-017 §3).
INV-LCAT-11: `DELETE` path chỉ hợp lệ khi path còn `draft`/`rejected`, chưa có unit đã
từng `published` **và** chưa có bản ghi `user_learning_progress` nào cho các unit của path.
Path đã `approved` không hard-delete; admin dùng `suspend`.
INV-LCAT-12: Mọi response chỉ chứa dữ liệu của chính giáo viên gọi API; không lộ `ownerId` của
người khác, không lộ `sourceHash`.
INV-LCAT-13: Module này không ghi `user_learning_progress`, SRS, Flashcard hay Attempt.
INV-LCAT-14: `unpublish` **không xoá** tiến độ học viên và không xoá `words`; chỉ đổi cờ
`published` (ADR-017 §6).

## 5. Ownership / RBAC

Predicate ở service, không phải chỉ role guard:

```
load(pathId) → path
if (!path) throw LEARNING_PATH_NOT_FOUND              // 404, không phải 403
if (path.ownerId !== caller.id) throw LEARNING_PATH_ACCESS_DENIED   // 403
```

Với unit, quyền suy ra từ path cha: `unit.pathId → path.ownerId`. Một unit không có path cha
(`hanlo_vocabulary` của CLI) **không thuộc module này** — giáo viên chỉ được *tham chiếu* nó, không
được sửa.

Thiếu `ownerId`/`caller.id` ⇒ từ chối. Đây là bài học `API-009`: một tham số thiếu từng biến check
quyền thành "không kiểm gì cả".

`RBAC_MATRIX.md` dòng `LearningCatalog | author / publish` được thay bằng quyền thật khi module
này được accept.

## 6. State machine

```
LearningPath
  draft ──submit──► pending_review ──approve──► approved ──suspend──► suspended
    ▲                    │                         ▲                     │
    │                    └──reject──► rejected     └────restore──────────┘
    └──────────submit──────────────────┘

learning_unit
  draft ──publish──► published ──unpublish──► unpublished ──publish──► published
```

- Giáo viên ghi được: `draft`, `rejected` (path); chỉ `draft` (nội dung unit). Path `approved`:
  giáo viên thêm được unit mới và publish, sửa `title`/`description` (Q2), nhưng không sửa unit đã
  published.
- Chỉ admin đi được các cạnh vào/ra `approved` và `suspended`.
- Một chiều: `published` không quay lại `draft`; unit đã publish chỉ có thể `unpublished`.

## 7. Transaction boundary

- **Postgres**: đổi `LearningPath.status` + INSERT `Notification` phải nằm trong **cùng một
  transaction** (đúng pattern `users.service.ts` truyền `tx` vào `createManyWithinTx`).
- **Mongo**: tạo/sửa/publish unit là một document write, tự atomic trong một collection.
- **Xuyên hai store**: KHÔNG có transaction chung (`DEBT-001`). Thứ tự bắt buộc: Postgres trước
  (trạng thái là nguồn sự thật), Mongo sau. Một path `approved` trỏ tới 0 unit published phải được
  render trung thực; không có cơ chế rollback tự động và điều đó được ghi nhận, không giấu.

## 8. Idempotency & concurrency

- `submit`, `publish`, `unpublish` dùng **atomic conditional update** trên trạng thái nguồn
  (`updateMany({ where: { id, status: source } })`). Hai request song song: một thắng, người kia
  nhận `LEARNING_PATH_INVALID_STATUS` / `LEARNING_UNIT_PUBLISHED_IMMUTABLE`.
- `slug` có unique index trong Mongo; tạo unit trùng slug trả lỗi chứ không ghi đè.
- `reorder` validate toàn bộ payload trước, rồi ghi trong một lượt; không để lại thứ tự nửa vời.
- `POST .../units` không idempotent theo thiết kế (tạo hai unit là hai unit); client không retry mù.

## 9. Error → code mapping

| Nhánh lỗi | HTTP | Code | Code status |
|---|---|---|---|
| Path không tồn tại | 404 | `LEARNING_PATH_NOT_FOUND` | agreed 2026-09-19 |
| Path tồn tại nhưng không thuộc giáo viên gọi API | 403 | `LEARNING_PATH_ACCESS_DENIED` | agreed 2026-09-19 |
| Chuyển trạng thái không hợp lệ (kể cả hai admin/giáo viên chạy song song) | 409 | `LEARNING_PATH_INVALID_STATUS` | agreed 2026-09-19 |
| Ghi vào path đang `pending_review`/`suspended` | 409 | `LEARNING_PATH_FROZEN` | agreed 2026-09-19 |
| Sửa/xoá unit đã từng `published` | 409 | `LEARNING_UNIT_PUBLISHED_IMMUTABLE` | agreed 2026-09-19 |
| Reorder không phải permutation `1..N` | 400 | `LEARNING_UNIT_ORDER_INVALID` | agreed 2026-09-19 |
| Unit không thuộc giáo viên gọi API | 403 | `LEARNING_UNIT_NOT_OWNED` | agreed 2026-09-19 |
| Tham chiếu tới unit không published / không tồn tại | 409 | `LEARNING_UNIT_REFERENCE_INVALID` | agreed 2026-09-19 |
| Xoá path còn unit đã từng publish hoặc đã có tiến độ | 409 | `LEARNING_PATH_HAS_PUBLISHED_UNITS` | agreed 2026-09-19 |

Không dùng code nào khác. LEARNING_UNIT_NOT_FOUND (404) và LEARNING_UNIT_LOCKED (403) đã có từ
module student và giữ nguyên nghĩa phía học viên. Cả family mới đã được owner
**agreed 2026-09-19** cho Slice 1.

## 10. Side effects & notifications

| Hành động | Notification | Gửi cho |
|---|---|---|
| `submit` | `learning_path_submitted` | fan-out mọi admin `active` (trong cùng transaction với đổi trạng thái) |
| `publish` unit | — | không bắn; admin thấy qua danh sách unit published |

`learning_path_approved` / `learning_path_rejected` / `learning_path_suspended` do module 09 bắn.
Bốn type mới phải được thêm vào enum `NotificationType` (Postgres) và vào module
`07-notifications.md` §2 — việc đó thuộc slice BE, nhưng **tên type được chốt ở đây** để hai module
không đặt hai tên khác nhau.

Không có side effect nào khác: không XP, không SRS, không enrollment, không điểm chính thức.

## 11. Index & query

- Postgres `LearningPath`: index `(ownerId, status)` cho list của giáo viên; index `(status)`
  cho hàng đợi duyệt của admin (module 09).
- Mongo `learning_units`: giữ unique `(curriculum, level, order)` hiện có; thêm index `(pathId,
  order)` và `(pathId, published)` cho detail và đếm.
- `GET /teacher/learning-paths` phân trang 20/trang; `unitCount`/`publishedUnitCount` tính bằng
  aggregate theo `pathId`, không N+1 theo từng path.

## 12. Migration & seed

- Migration Postgres thêm model `LearningPath` + enum `LearningPathStatus`, và thêm 4 giá trị vào
  enum `NotificationType`.
- Mongo: `learning_units` thêm `pathId?`, `authorId?`, và **nới enum `curriculum`** (hiện cứng
  `["hanlo_vocabulary"]`) để nhận `curriculumKey` của path. Giá trị hop lệ được validate ở service
  theo Postgres, không hard-code trong schema.
- `sourceHash` đang `required`: unit do giáo viên nhập **derive SHA-256 từ chính payload**
  (`words` + `title` + `level` theo thứ tự tất định), giữ nguyên ý nghĩa "bản publish có hash kiểm
  chứng được" mà không cần nguồn ngoài.
- Seed cho test: một giáo viên, một admin, hai path (một `draft`, một `approved`), vài unit ở cả
  hai loại `authored`/`reference`.

## 13. Security & rate limit

- Không trả `sourceHash`, không trả `ownerId` của người khác, không trả path ở trạng thái
  `pending_review` cho người không phải chủ sở hữu hoặc admin.
- `forbidNonWhitelisted` bật: `status`, `curriculumKey`, `ownerId`, `published` không nhận từ body.
- Nội dung do người dùng nhập được render như text, không HTML (cùng luật với snapshot của CLI).
- Chưa đặt rate limit riêng cho module này; tạo path/unit không nằm trong nhóm nhạy cảm như auth.

## 14. Observability

- Log khi `submit` thành công (pathId, ownerId, unitCount) và mọi lần chuyển trạng thái bị từ chối
  kèm trạng thái nguồn — vì đây là nơi hai request song song được phát hiện.
- Không log nội dung từ vựng; log số lượng.
- Đếm số path đang `pending_review` để thấy hàng đợi duyệt.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-LCAT-01 | integration (real DB) | Không truyền `ownerId`/gọi chéo ⇒ từ chối, không trả dữ liệu |
| INV-LCAT-02 | integration (real DB) | Giáo viên B đọc/sửa path của A ⇒ 404/403; unit của A cũng vậy |
| INV-LCAT-03 | integration (real DB) | Mọi write khi `pending_review` ⇒ `LEARNING_PATH_FROZEN` |
| INV-LCAT-04 | service + integration | `submit` từ `draft`/`rejected`; path 0 unit ⇒ từ chối; hai submit song song ⇒ một thắng |
| INV-LCAT-05 | integration | Không endpoint nào của giáo viên đưa path sang `approved` |
| INV-LCAT-06 | integration | Publish khi path `draft`/`pending_review`/`suspended` ⇒ từ chối |
| INV-LCAT-07 | integration | `PATCH`/`DELETE` unit published hoặc unpublished ⇒ 409; `words` không đổi trong DB |
| INV-LCAT-08 | service | `slug` sinh một lần, không đổi qua mọi lần sửa và publish |
| INV-LCAT-09 | service (pure) | Partial/duplicate/out-of-range reorder ⇒ từ chối; DB không đổi |
| INV-LCAT-10 | integration | Reference tới unit unpublished hoặc thuộc path suspended ⇒ 409; `words` không bị copy |
| INV-LCAT-11 | integration (real DB) | Xoá path approved, có unit đã publish, hoặc có progress ⇒ 409 |
| INV-LCAT-12 | integration | Payload không chứa `sourceHash`/`ownerId` người khác |
| INV-LCAT-13 | integration | Không collection/table tiến độ nào bị ghi bởi module này |
| INV-LCAT-14 | integration (real DB) | `unpublish` giữ nguyên `user_learning_progress`; publish lại thấy đúng trạng thái cũ |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| `submit` cần ≥ 1 unit (INV-LCAT-04) — mạnh hơn plan đã duyệt, để admin không duyệt vỏ rỗng | Không chặn code; là lựa chọn thiết kế đã ghi | Project owner | đã chốt trong spec này 2026-09-19 |
| Giới hạn số unit mỗi path | **RESOLVED:** 100; unit thứ 101 → `VALIDATION_ERROR` | Project owner | owner-approved 2026-09-19 |
| Giáo viên có được **xoá** path đang `approved` mà chưa có tiến độ không? | **RESOLVED:** không hard-delete sau approve; dùng suspend | Project owner | owner-approved 2026-09-19 |
| Reference có được trỏ tới unit của path `suspended` không? | **RESOLVED:** không | Project owner | owner-approved 2026-09-19 |
| Trộn hai loại unit trong một path có cần admin thấy rõ ở hàng đợi duyệt? | **RESOLVED:** có trong v1 | Project owner | owner-approved 2026-09-19 |
