# ADR-017: Teacher-authored learning catalog với một cổng duyệt của Admin

**Date**: 2026-09-19
**Status**: Accepted
**Deciders**: Project owner (chốt 2026-09-19, cùng plan `docs/learning-catalog-adr`)
**Applies to**: `LearningCatalog`, learning path của Học viên, nội dung self-study, RBAC Teacher/Admin/Student, Notifications
**Related**: ADR-016 (§2 — ô ⛔ mà ADR này đóng), `DOC-011`, `DEBT-001`, `API-008`, `API-009`, `WEB-011`

---

## Context

ADR-016 §2 đã chốt rằng giáo viên **có thể** gắn nội dung self-study vào việc dạy của mình, nhưng
để lại đúng một ô chưa quyết định:

> ⛔ Cách giáo viên author/publish catalog, cardinality và transport contract chưa được duyệt.
> ADR này không định nghĩa field, table hay endpoint.

`RBAC_MATRIX.md` đã ghi sẵn hai dòng chờ cho ô đó — `LearningCatalog | author / publish` là
`⛔ contract needed` ở cả Admin và Teacher — và ghi chú ngày 2026-09-15 khẳng định catalog chỉ
được publish bằng **operator CLI**, không có permission công khai nào.

Thực tế hiện tại (`docs/api/modules/student/05-learning-path.md`, status `implemented`):

- catalog nằm ở MongoDB `learning_units` (curriculum cứng `hanlo_vocabulary`), nội dung là snapshot
  bất biến sinh từ corpus `writing.json` đã được duyệt ở A11, `sourceHash` là SHA-256 của nguồn;
- người publish duy nhất là script `apps/api/scripts/learning-path-import.ts`;
- hợp đồng Student đã cam kết **"never replace content behind recorded progress"**: đổi nội dung
  sau khi có người học thì tiến độ đã ghi không còn nghĩa, nên sửa nội dung phải là một revision mới
  với rollout riêng.

Yêu cầu mới của chủ dự án: **giáo viên tạo learning path → admin duyệt → sau khi duyệt thì giáo
viên thêm bài học vào**. Đây chính là ô ⛔ trên, và nếu không có ADR này thì tài liệu sẽ tự mâu
thuẫn: RBAC nói "chỉ CLI publish", còn hệ thống lại có giáo viên publish.

Ba câu hỏi sản phẩm đã được chủ dự án trả lời ngày 2026-09-19 (ghi nguyên văn lựa chọn):

1. **Phạm vi**: "Toàn bộ học viên (catalog nền tảng)".
2. **Duyệt lại**: "Path duyệt 1 lần; bài học thêm ở dạng nháp, GV tự publish, admin gỡ được".
3. **Nguồn nội dung**: "Cả hai: GV tự nhập HOẶC tham chiếu unit có sẵn".

---

## Decision

### 1. Learning path do giáo viên tạo, admin duyệt một lần

`LearningPath` là một thực thể do **giáo viên** tạo và sở hữu. Nó chỉ trở thành nội dung học viên
nhìn thấy sau khi **admin duyệt**. Sau khi duyệt, giáo viên **tự publish từng bài học** mà không
cần một vòng duyệt thứ hai. Admin giữ quyền **gỡ** ở hai mức: gỡ một unit, hoặc suspend cả path.

Điều này thay thế câu "catalog chỉ publish bằng operator CLI" trong `RBAC_MATRIX.md`: CLI vẫn là
cách publish của corpus nền tảng (`hanlo_vocabulary`), không còn là cách duy nhất.

### 2. Phạm vi là catalog nền tảng (toàn bộ học viên)

Path đã duyệt được mọi học viên nhìn thấy, không giới hạn theo lớp, không cần enrollment. Hệ quả
trực tiếp và bắt buộc: vì cổng duyệt path không kiểm soát được nội dung thêm về sau, **admin phải
list và unpublish được mọi unit đã publish**, kể cả unit do giáo viên tự publish sau khi path đã
duyệt. Không có quyền đó thì "duyệt path một lần" chỉ là hình thức.

### 3. Một path gồm hai loại bài học

- **Unit do giáo viên tự nhập**: từ vựng do giáo viên soạn (`hanzi`, `pinyin`, `meaning`), theo
  đúng shape `LearningWord` đang dùng.
- **Unit tham chiếu**: trỏ tới một `learning_unit` **đã publish** có sẵn. Tham chiếu **không sao
  chép định nghĩa nội dung** — hoàn thành unit đó ghi vào cùng tiến độ cá nhân, đúng ADR-016 §2.

Hai loại trộn trong cùng một path. Quiz không do giáo viên soạn: dùng lại đúng cơ chế sinh quiz
từ `words` đang có (`learningPathQuiz()`), nên không có đường nội dung thứ hai.

### 4. Lưu trữ: metadata quan hệ ở Postgres, nội dung ở Mongo

| Dữ liệu | Nơi lưu | Lý do |
|---|---|---|
| `LearningPath`: chủ sở hữu, trạng thái, audit duyệt, lý do từ chối | Postgres | Cần khoá ngoại tới `User`, audit ai duyệt/lúc nào, và notification trỏ tới được |
| Nội dung bài học (`words`) | Mongo `learning_units` (mở rộng) | `user_learning_progress` đang khoá theo `unitSlug`; không được di chuyển |
| Tiến độ học viên | Mongo `user_learning_progress` | Không đổi |

Đây là tiền lệ đã có: `Assignment` ở Postgres giữ `questionIds[]` trỏ sang Mongo. Kèm theo đúng
cảnh báo của `DEBT-001`: **không có transaction xuyên hai store**, nên thứ tự ghi là bắt buộc —
Postgres trước (trạng thái là nguồn sự thật), Mongo sau; và một path `approved` trỏ vào 0 unit
published phải render trung thực, không được vỡ.

### 5. Hai máy trạng thái

```
LearningPath:  draft ──► pending_review ──► approved ──► suspended
                 ▲             │                ▲            │
                 └── rejected ◄┘                └── restore ─┘

learning_unit:  draft ──► published ──► unpublished
                (chỉ khi path approved)
```

Mọi chuyển trạng thái là **atomic conditional update** trên trạng thái nguồn, đúng pattern đã dùng
cho vòng đời tài khoản (`users.service.ts`). Hai admin duyệt cùng lúc: một thắng, người kia nhận
lỗi chuyển trạng thái không hợp lệ.

### 6. Nội dung đã publish là bất biến

Unit đã publish **không được sửa `words`**. Lý do không phải khẩu vị: `user_learning_progress` lưu
`answers` và `bestScore` gắn với đúng bộ từ tại thời điểm học; sửa từ phía sau làm điểm đã ghi
không còn kiểm chứng được. Sửa nội dung = tạo unit mới (slug mới) + unpublish unit cũ, đúng luật
revision đã có của CLI import.

Đây là ràng buộc tốn kém nhất về trải nghiệm soạn bài và đã được chủ dự án chấp nhận cùng plan.

### 7. Những gì ADR này KHÔNG định nghĩa

Field, table, endpoint, error code và test matrix thuộc về module spec:
`docs/api/modules/teacher/07-learning-catalog.md` (phía giáo viên) và
`docs/api/modules/09-learning-catalog-moderation.md` (phía admin). ADR này chỉ chốt domain: ai tạo,
ai duyệt, phạm vi ai thấy, nội dung bất biến khi nào.

---

## Consequences

**Positive:**
- Đóng ô ⛔ của ADR-016 §2 bằng một quyết định có ghi lại, thay vì để RBAC và thực tế mâu thuẫn.
- Nội dung do giáo viên tạo đi vào đúng chỗ đã có tiến độ, khoá theo `unitSlug` — không sinh hệ
  thống tiến độ thứ hai.
- Học viên nhận thêm nội dung mà không cần một đường publish mới ngoài UI.

**Negative / Trade-offs:**
- Duyệt một lần nghĩa là cổng duyệt **không** kiểm soát nội dung thêm sau đó. Bù lại bằng quyền
  unpublish của admin ở mức unit (cưỡng chế ở bước 2).
- Unit published bất biến làm việc sửa lỗi chính tả tốn một revision mới thay vì một lần sửa.
- Hai store, không transaction chung: lỗi giữa hai bước ghi để lại trạng thái cần dọn tay, phải
  được thiết kế để render trung thực chứ không im lặng.
- Phạm vi toàn nền tảng đặt một giáo viên vào vị trí ảnh hưởng tới mọi học viên — kiểm duyệt là
  hàng rào duy nhất, nên chất lượng hàng rào đó quan trọng hơn trong thiết kế theo lớp.

## Alternatives Considered

| Option | Lý do không chọn |
|--------|-----------------|
| Path thuộc một lớp, chỉ học viên trong lớp thấy | Sát ADR-016 §2 hơn, nhưng chủ dự án chọn phạm vi toàn nền tảng; theo lớp sẽ cần thêm enrollment check ở mọi read và một lớp mất quyền sở hữu khi giáo viên rời lớp |
| Mỗi bài học cũng phải admin duyệt | Kiểm duyệt chặt nhất, nhưng biến admin thành nút cổ chai cho từng bài và giáo viên không dạy được nếu admin chưa xử lý |
| Duyệt path rồi sửa tự do, không có publish từng unit | Đúng nghĩa đen câu yêu cầu, nhưng để admin duyệt một cái vỏ rỗng rồi nội dung bất kỳ vào sau — cổng duyệt mất kiểm soát hoàn toàn |
| Tất cả trong Mongo (path + unit) | Cần audit duyệt, khoá ngoại tới `User` và notification trỏ tới được — Mongo không có các ràng buộc đó; đồng thời phải tự dựng lại quan hệ đã có ở Postgres |
| Giữ nguyên CLI là đường publish duy nhất | Giáo viên không thể tạo nội dung; đúng hiện trạng nhưng không đáp ứng yêu cầu, và `RBAC_MATRIX.md` đã ghi sẵn dòng `author / publish` là việc chưa làm chứ không phải việc bị cấm |
