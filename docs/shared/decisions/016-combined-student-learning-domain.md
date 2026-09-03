# ADR-016: Kết hợp LMS với self-study và dùng SM-2

**Status**: Accepted
**Date**: 2026-09-03
**Decider**: Project owner
**Applies to**: Student learning domain, SRS, curriculum practice, gamification, Student/Teacher RBAC
**Related**: `SCOPE-02`, `DOC-011`, ADR-005

## Context

Tài liệu hiện tại mô tả hai nửa sản phẩm:

- LMS nhiều vai trò: giáo viên quản lý lớp, bài học và Assignment; học sinh làm bài và nhận
  kết quả chính thức; Admin quản lý vận hành và học phí.
- Hệ tự học Hán Lộ: lộ trình giáo trình, nền tảng phát âm, ngữ pháp, luyện chữ, Lego, mô phỏng
  công sở, thi thử, XP, chuỗi ngày, huy hiệu và bảng xếp hạng.

`SCOPE-02` từng coi đây là hai sản phẩm loại trừ nhau. FE Student hiện đã chứng minh chúng có
thể dùng chung một trải nghiệm, nhưng chưa có quyết định domain về quan hệ giữa nội dung tự học,
giáo trình của lớp và Assignment. FE cũng dùng Leitner 5 hộp để mô phỏng lịch ôn, trong khi entity,
flow, API và roadmap đã mô tả SM-2.

## Decision

### 1. Một sản phẩm, hai lane học tập

HSK Learning Platform kết hợp cả hai lane:

1. **Class learning** — giáo viên tổ chức lớp, bài học và Assignment. Attempt trong lane này là
   kết quả chính thức, tuân theo grading, deadline và quyền truy cập của lớp.
2. **Self-study** — platform cung cấp catalog bài học và bài luyện HSK 1–9. Học sinh tự học,
   tiến độ thuộc về cá nhân và không tự động trở thành điểm chính thức của lớp.

Hai lane dùng chung danh tính học sinh, content primitives và analytics, nhưng không nhập nhằng
giữa `practice completion` và `graded Attempt`.

### 2. Nội dung tự học là bài bổ trợ theo giáo trình của giáo viên

Giáo viên có thể chọn một learning unit trong catalog self-study làm bài bổ trợ cho lớp, gắn nó
với ngữ cảnh giáo trình/bài học đang dạy. Quy tắc domain:

- catalog gốc vẫn là nội dung platform quản lý;
- việc giao cho lớp chỉ tham chiếu learning unit, không sao chép định nghĩa nội dung;
- hoàn thành bài bổ trợ được ghi vào tiến độ cá nhân;
- chỉ khi giáo viên bọc nội dung trong một Assignment thì kết quả mới đi qua Attempt và có thể
  trở thành kết quả chính thức;
- giáo viên chỉ được xem completion của bài bổ trợ đã giao cho học sinh đang active trong lớp
  mình quản lý; lịch sử tự học không liên quan vẫn riêng tư.

⛔ Cách giáo viên author/publish catalog, cardinality và transport contract chưa được duyệt.
ADR này không định nghĩa field, table hay endpoint.

### 3. SM-2 là thuật toán SRS chính thức

Production dùng SM-2 trên `UserFlashcardState`. UI có bốn lựa chọn, ánh xạ sang recall quality:

| UI rating | SM-2 quality |
|---|---:|
| Again | 0 |
| Hard | 3 |
| Good | 4 |
| Easy | 5 |

Quality 1–2 không có nút riêng nhưng vẫn là giá trị hợp lệ nội bộ khi import hoặc hiệu chỉnh.
Leitner 5 hộp trong FE mockup không phải contract production và phải được thay trước khi nối API.

### 4. Gamification và learning modules là domain chính thức

Các concept sau được nhận vào product domain: curriculum learning path, placement, grammar,
foundation, character writing, Lego, workplace practice, mock exams, XP, ranks, streaks, badges
và leaderboard. Chúng không còn là trang trang trí chỉ thuộc FE.

Việc nhận vào domain **không** phê duyệt schema được đề xuất trong `PROJECT_KNOWLEDGE.md` §8.9.
Storage, aggregate boundaries, event rules, XP curve và API vẫn phải được thiết kế contract-first.
⛔ Đặc biệt, chưa có quyết định cho phép tiêu XP để bỏ qua khóa nội dung; hành vi force-unlock
100 XP hiện tại vẫn chỉ là demo.

### 5. Nguồn content vẫn bị chặn riêng

Quyết định product không đóng `DOC-011`. Kho JSON nguồn chưa nằm trong repo nên số lượng, chất
lượng và chiến lược import/seed vẫn chưa được xác nhận.

## Consequences

**Positive:**

- `SCOPE-02` được đóng: LMS và self-study là hai lane bổ sung trong cùng sản phẩm.
- Giáo viên có thể dùng catalog Hán Lộ làm bài bổ trợ mà không biến mọi hoạt động tự học thành
  Assignment chính thức.
- SRS có một thuật toán production duy nhất, khớp entity, API, flow và roadmap.
- XP, badge và các module học có quyền được thiết kế domain/backend thay vì tồn tại vĩnh viễn
  như mock data.

**Negative / trade-offs:**

- Cần domain/module specs mới cho catalog, progress và gamification trước khi code backend.
- Analytics phải phân biệt practice metrics với official grade metrics.
- Teacher visibility cần ownership checks theo active enrollment và assigned learning unit.
- FE mockup hiện tại có nhiều behavior phải thay: Leitner, client scoring, simulated leaderboard,
  localStorage persistence và force-unlock bằng XP.

## Alternatives considered

| Option | Lý do không chọn |
|---|---|
| Chỉ giữ LMS | Bỏ toàn bộ trải nghiệm tự học HSK đã được chấp nhận và đang có FE mockup. |
| Chỉ giữ self-study | Bỏ class, Assignment, grading, attendance và billing đã là lõi của repo. |
| Giữ hai app tách rời | Nhân đôi danh tính, content, progress và navigation; giáo viên không giao được bài bổ trợ. |
| Leitner production | Dễ triển khai nhưng kém cá nhân hóa và mâu thuẫn với entity/flow/API/roadmap hiện tại. |
