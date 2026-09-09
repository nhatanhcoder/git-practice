---
status: draft
updated: 2026-09-06
scope: student-srs-classes-demo-integration
---

# Student — Checklist và prompt code + tự test / test độc lập

> **Trạng thái: DRAFT — backlog giao việc, không phải chứng nhận tính năng đã hoàn thành.**
> Người dùng duyệt đóng gói tài liệu ngày 2026-09-06. Duyệt tạo file không đồng nghĩa duyệt
> triển khai toàn bộ backlog, đổi route, schema, Auth, RBAC, import production hoặc deploy.
> Mốc kiểm tra ban đầu: Hán Lộ đã vào main qua PR #39; SRS thật ở /student/mistakes,
> Flashcards và Classes còn mock. Agent phải xác minh lại HEAD trước mỗi task.
> A00/A01 có thể đang được agent khác thực hiện: đọc PROGRESS, branch, PR và evidence trước
> khi nhận việc. Không chạy lại một task đã hoàn thành; chuyển sang TEST nếu phù hợp.
>
> Đây là đợt **SRS + Lớp học + tách demo**, KHÔNG phải triển khai đủ 24 chức năng Student.
> Các mã A00–A12/T13 là mã task trong tài liệu này, không phải ID issue mới.

<a id="toc"></a>
## Mục lục — bấm để copy đúng việc

- [Cách dùng](#usage)
- [Checklist và phụ thuộc](#checklist)
- [Quy tắc chung CODE + tự test](#code-common)
- [Quy tắc chung TEST độc lập](#test-common)
- [Nguồn chung](#sources)
- [A00 — Contract, route và ranh giới demo](#a00)
- [A01 — Đúng tài khoản Student](#a01)
- [A02 — Cô lập demo và tiến độ local](#a02)
- [A03 — Giao diện SRS thật theo Hán Lộ](#a03)
- [A04 — Tải/chấm thẻ và thống kê an toàn](#a04)
- [A05 — Hợp nhất route và link SRS](#a05)
- [A06 — Danh sách lớp thật](#a06)
- [A07 — Tham gia lớp thật](#a07)
- [A08 — Chi tiết lớp thật](#a08)
- [A09 — Rời lớp thật](#a09)
- [A10 — Kiểm kê nguồn từ vựng](#a10)
- [A11 — Importer từ vựng](#a11)
- [A12 — Dọn UI cũ sau tích hợp](#a12)
- [T13 — Nghiệm thu toàn đợt](#t13)
- [Prompt trả lỗi về agent code](#fix-loop)

<a id="usage"></a>
## Cách dùng

1. Chọn **một** task trong mục lục. Kiểm tra dependency và trạng thái hiện tại.
2. Mở task code: copy khối **quy tắc chung CODE**, **nguồn chung**, rồi khối **CODE Axx**.
3. Agent trình plan → người dùng duyệt đúng phạm vi → agent triển khai và tự test.
4. Nhận commit SHA, danh sách file, bằng chứng, test chưa chạy và PR.
5. Mở task kiểm thử khác: copy **quy tắc chung TEST**, **nguồn chung**, rồi **TEST Axx**;
   thay placeholder SHA bằng commit thật. Không test server/build từ commit cũ.
6. FAIL thì trả về agent code. Kiểm lại trên SHA mới trước khi chuyển task phụ thuộc.
7. Không chạy hai agent trong cùng checkout. Không tự merge/deploy.

**Không dùng “36 test cũ pass” thay cho “TEST A03 pass”.**
Test phải kiểm đúng hành vi thay đổi. Network mock được dùng để ép lỗi, nhưng không chứng
minh backend, quyền sở hữu hoặc persistence. “Production build” ở đây là Next build/start
trên môi trường test; không phải quyền thử nghiệm trên dữ liệu production.

**Cách copy ngắn khi agent đọc được repo:** có thể dùng mẫu dưới đây, thay mã và SHA:

~~~text
Đọc D:/PersonalProject/Real/docs/prompts/student-integration-checklist.md.
Chỉ thực hiện A03: áp dụng quy tắc CODE + tự test, nguồn chung và toàn bộ mục A03.
Kiểm tra dependency/current branch trước; không chạy các prompt task khác.
Trình plan rồi dừng chờ duyệt theo quy tắc repo.
~~~

~~~text
Đọc D:/PersonalProject/Real/docs/prompts/student-integration-checklist.md.
Chỉ thực hiện TEST A03 trên commit [SHA].
Áp dụng quy tắc TEST độc lập, nguồn chung và checklist TEST A03.
Không sửa code; báo bằng chứng PASS/FAIL/BLOCKED/NOT RUN/NOT IMPLEMENTED.
~~~

Nếu repo nằm trong worktree khác, thay đường dẫn root bằng đường dẫn checkout đang được
giao. Không tự chuyển branch trong checkout của agent khác.

<a id="checklist"></a>
## Checklist và phụ thuộc

Các ô trống là mẫu theo dõi, không khẳng định task chưa được agent khác làm.
Nguồn trạng thái thực tế vẫn là PROGRESS + commit/PR + kiểm thử đúng commit.

| Xong | Mã | Việc | Phụ thuộc | Điều kiện hoàn thành |
|---|---|---|---|---|
| ✅ | A00 | Chốt contract, route, demo | — | Route/API/states và quyết định được ghi rõ — PR #42 |
| ✅ | A01 | Đúng danh tính | A00 | Không tên mẫu ở khu vực tài khoản — PR #41 (+races: #43), giải WEB-015 |
| ✅ | A02 | Cô lập demo | A00, A01 | Không dùng progress local làm dữ liệu thật — PR #46, giải WEB-016 |
| ✅ | A03 | SRS theo Hán Lộ | A00 | Đổi presentation, giữ API thật — PR #44 |
| ✅ | A04 | Cứng hóa SRS | A03 | Không race, gửi trùng, fake-success — PR #45 |
| ✅ | A05 | Route SRS chính | A04 | Điều hướng tới SRS thật, route cũ xử lý rõ — PR #47 |
| ✅ | A06 | List lớp | A00 | Lớp đúng tài khoản từ API — cùng PR #48 |
| ✅ | A07 | Join lớp | A06 | Enrollment tồn tại sau reload — PR #48 |
| 🔶 | A08 | Detail lớp | A06 | Dữ liệu thật; không bịa lesson/bài tập — PR #52 (mở, kèm QC) |
| 🔶 | A09 | Leave lớp | A07, A08 | Trạng thái server phản ánh đúng sau reload — PR #52; **QC độc lập 2026-09-09: 7/7 pass** (cancel 0 DELETE · dropped không xóa row · API-down giữ lớp + lỗi thật · deep-link forbidden · rejoin reactivate giữ joinedAt · double-click 1 DELETE); thấy DEBT-006 về suite structural |
| ⬜ | A10 | Audit nguồn vocabulary | — | Nguồn, mapping, quyền sử dụng và import plan được duyệt |
| ⬜ | A11 | Importer | A10 | Dry-run, chạy lặp an toàn, giữ SRS state |
| ⬜ | A12 | Cleanup UI cũ | A02, A05–A09 | Chỉ bỏ phần không còn consumer |
| ⬜ | T13 | Nghiệm thu | A00–A12 hoặc ghi rõ phần bị chặn | Bằng chứng UI → API → persisted data → reload |

> Trạng thái cập nhật 2026-09-09 đối chiếu GitHub: PR #41–#48 đã merge vào `main`; A00–A07
> flip ✅ theo PR thật (trước đó cả bảng còn `⬜` dù đã merge — lỗi record mà `working-rules.md`
> § Definition of Done tồn tại để ngăn). A08/A09 🔶 vì PR #52 chưa merge. Không ô nào được ✅
> khi màn hình vẫn chạy mock — A02/QC từng phát hiện lớp lỗi "trông hoạt động".

Thứ tự khuyên dùng: **A00 → A01 → A02 → A03 → A04 → A05 → A06 → A07 → A08 → A09
→ A10 → A11 → A12 → T13.** Có thể làm A10 sớm; không cần đợi UI.
Không chặn self-test SRS bởi catalog production chưa có: dùng fixture được sở hữu trong DB
test riêng và ghi rõ; catalog production vẫn chưa hoàn thành.

<a id="code-common"></a>
## Quy tắc chung CODE + tự test — copy cùng task

~~~text
Repo mặc định: D:/PersonalProject/Real. Nếu được giao worktree riêng, dùng root đó.
Chỉ thực hiện task được ghi bên dưới. Không tự mở rộng sang task tiếp theo.

STARTUP:
- Đọc AGENTS.md, đủ 5 always-loaded files và session mới nhất.
- Báo việc còn dở, loại CODE/DOCS và có thay đổi DB schema/Auth/RBAC/tiền không.
- Kiểm tra branch, SHA, dirty files, PROGRESS và code hiện tại.
- Nếu task đã được làm: xác minh commit/evidence, không triển khai trùng.
- Không sửa/commit thay đổi của người khác; agent song song phải có checkout riêng.

WORKFLOW:
- CODE: branch → claim PROGRESS 🔶 → plan → DỪNG CHỜ DUYỆT
  → implement → verify → RECORD → PR.
- DOCS: branch → plan → DỪNG CHỜ DUYỆT → edit → check:docs → RECORD → PR.
- Branch codex/<task-name>, từ main mới; dependency chưa vào main thì báo,
  không âm thầm lấy feature branch khác làm base.
- DB schema/Auth/RBAC/tiền: phải có duyệt rõ đúng phạm vi trước mọi thay đổi.
- UI: dùng flow-mapper → Page Contract → page-designer → spec → mockup → code
  theo repo. Dùng lại contract/spec đã có nếu phù hợp; không tự chế phần thiếu.
- Không đổi root-design-fe.md/_DESIGN-SYSTEM.md hoặc chạy /design-promote.
- Không merge/deploy/cài skill mới.

IMPLEMENT + SELF-TEST:
- Đọc nguồn chung và nguồn riêng của task. Chọn entity từ entity index.
- Field/DTO/error code/endpoint phải có contract; thiếu thì ⛔.
- Entity spec thắng feature doc khi mâu thuẫn; ghi nhận mismatch.
  Các conflict khác không tự chọn bên.
- Viết regression test thực thi hành vi, không chỉ grep chuỗi source.
- CODE frontend: chạy pnpm --filter web build; tuyệt đối không root build.
- Chạy node --test apps/web/scripts/*.test.mjs và test mục tiêu của task.
- DOCS-only: check-docs + kiểm links/anchors/nội dung; không cần web build.
- UI: kiểm production build đúng SHA, desktop và 375px; chụp và tự đọc ảnh,
  kiểm console/network, nêu trạng thái chưa quan sát.
- Phân biệt MOCKED UI test với integration backend thật.
- Không chạy API suite/seed vào DB dùng chung hoặc production.
  Xác nhận DB test riêng, chỉ tạo/dọn fixture thuộc task.
- Không lưu token/secret vào tài liệu, screenshot, log hoặc Git.
- Môi trường thiếu: BLOCKED/NOT RUN. Endpoint thiếu: NOT IMPLEMENTED.
  Không gộp các trường hợp này vào PASS.

RECORD:
- Commit từng đơn vị logic; node scripts/check-docs.mjs trước mỗi commit.
- Cập nhật ai/PROGRESS.md; append ai/known-issues/KNOWN_ISSUES.md;
  session <date>-<task-name>.md; status/index của tài liệu liên quan.
- Kiểm ID trên active branches trước khi cấp ID mới, không tái sử dụng/renumber.
- Báo files, SHA, lệnh/output, self-tests, mock vs real, việc còn dở và PR.
- Kết thúc đúng 4 dòng:
Done:
Recorded in:
Blocked by:
You need to:
~~~

<a id="test-common"></a>
## Quy tắc chung TEST độc lập — copy cùng task

~~~text
Repo: D:/PersonalProject/Real hoặc worktree test được giao.
Task: [MÃ TASK]
Commit cần kiểm: [SHA TỪ TASK CODE]

Kiểm thử độc lập, không phải yêu cầu sửa code.
- Đọc startup bắt buộc theo AGENTS.md.
- Xác nhận đúng SHA và đúng server/build; không kiểm server cũ.
- Đọc contract/source; báo cáo của người code không phải bằng chứng PASS.
- Không sửa tracked files, commit, PR hoặc tự fix.
  Muốn thêm test lâu dài vào repo: đề xuất task CODE riêng.
- Có thể chạy kiểm thử với dữ liệu tổng hợp trong môi trường test riêng
  đã xác nhận; không dùng tài khoản thật/reset/seed DB dùng chung.
- Chỉ dọn fixture của task; che token/secret trong mọi evidence.
- Kiểm happy path, negative path và regression.
- Network mock để ép lỗi phải ghi MOCKED; không chứng minh persistence/RBAC.
- Thiếu endpoint: NOT IMPLEMENTED. Thiếu môi trường: BLOCKED.
  Chưa chạy: NOT RUN. Không tính vào PASS.
- FAIL: severity, file:line, reproduce, expected/actual, screenshot/network/log,
  hướng sửa; không tự sửa.
- Bảng báo cáo: Test ID | Case | Expected | Actual | Kết quả | Bằng chứng.
- Kết luận chỉ trong phạm vi task; không tuyên bố toàn Student hoàn thành.
- Kết thúc đúng 4 dòng Done / Recorded in / Blocked by / You need to.
~~~

<a id="sources"></a>
## Nguồn chung — copy cùng prompt hoặc mở tại repo

~~~text
D:/PersonalProject/Real/AGENTS.md
D:/PersonalProject/Real/docs/actors/student/FEATURES_STUDENT.md
D:/PersonalProject/Real/docs/actors/student/PERMISSIONS_STUDENT.md
D:/PersonalProject/Real/docs/shared/RBAC_MATRIX.md
D:/PersonalProject/Real/docs/api/API_STUDENT.md
D:/PersonalProject/Real/docs/api/API_CONVENTIONS.md
D:/PersonalProject/Real/docs/api/API_ERROR_CODES.md
D:/PersonalProject/Real/docs/entities/_INDEX.md
D:/PersonalProject/Real/docs/shared/decisions/016-combined-student-learning-domain.md
D:/PersonalProject/Real/docs/front-end-design-docs/pages/_INDEX.md
D:/PersonalProject/Real/docs/testing/TEST_STRATEGY.md
D:/PersonalProject/Real/PROJECT_KNOWLEDGE.md
~~~

Đọc đủ nguồn có liên quan, không chỉ danh sách tên. Nếu giao việc cho agent khác,
gửi cả nguồn chung, nguồn riêng và trích đoạn contract cần dùng. Không giả định
agent mới đã đọc cuộc chat. File/contract có thể thay đổi sau bản checklist này.

<a id="a00"></a>
## A00 — Chốt contract, route và ranh giới demo

**Loại:** DOCS. **Đạt khi:** mỗi route/action có nguồn, trạng thái và quyết định được duyệt.

### CODE A00 + tự kiểm tra tài liệu

~~~text
TASK A00 — Chốt contract Student cho đợt SRS + Classes + tách demo. DOCS, chưa code UI.

Đọc nguồn chung và:
- D:/PersonalProject/Real/docs/front-end-design-docs/pages/student-pages/student-srs.md
- D:/PersonalProject/Real/docs/front-end-design-docs/pages/student-pages/student-flow.md
- D:/PersonalProject/Real/docs/front-end-design-docs/specs/student-pages/student-srs.spec.md
- D:/PersonalProject/Real/apps/web/src/app/student
- D:/PersonalProject/Real/apps/api/src/classes/student-classes.controller.ts
- D:/PersonalProject/Real/apps/api/src/flashcards/student-flashcards.controller.ts

Trước tiên kiểm tra A00 có commit/PR đã làm chưa. Nếu có, audit phần còn thiếu, không viết lại.

Plan và chờ duyệt:
1. Bảng route → mục đích → nguồn dữ liệu → endpoint đã triển khai.
2. Đề xuất /student/flashcards là SRS chính nếu chưa có quyết định ghi nhận.
3. Xử lý /student/mistakes và /student/mistakes/review: không đánh đồng
   sổ lỗi sai với ôn từ vựng, không tự redirect khi chưa duyệt.
4. Ma trận route mock ở dev/demo và trạng thái production tương ứng.
5. Kiểm tra/bổ sung contract Classes list/join/detail/leave.
6. Chốt states, response mapping, lỗi, empty vs unavailable.
7. Chốt “ôn thẻ này”, bắt đầu phiên và kết thúc phiên SRS.

Sau duyệt chỉ sửa docs thuộc phạm vi, flow/index/status.
Đối chiếu endpoint với controller/service và API docs.
Bất đồng phải ghi lại, không hợp thức hóa code bằng cách tự sửa spec.
~~~

### TEST A00

~~~text
TEST A00 — Audit contract, không sửa file.

1. Mỗi route có mục đích, nguồn dữ liệu và trạng thái rõ.
2. Flashcards và sổ lỗi sai không bị nhập thành chức năng không có spec.
3. Request có endpoint/DTO/error thật; không lấy mock model làm DTO.
4. Classes có đủ list/join/detail/leave và states cần thiết.
5. Production không trình bày progress mock như dữ liệu thật.
6. Redirect/ẩn route có phê duyệt, không suy diễn.
7. Endpoint chỉ liệt kê trong API doc nhưng chưa có controller:
   NOT IMPLEMENTED, không đánh dấu đã nối được.
8. check-docs và audit conflict semantic checker không phát hiện.
~~~

[↑ Mục lục](#toc)

<a id="a01"></a>
## A01 — Đúng tài khoản Student

**Phụ thuộc:** A00. **Đạt khi:** không còn tên mẫu ở greeting/sidebar/profile/mobile.

### CODE A01 + tự test

~~~text
TASK A01 — Student shell/dashboard hiển thị đúng tài khoản.

Đọc nguồn chung và:
- D:/PersonalProject/Real/apps/web/src/components/student/student-shell.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/page.tsx
- D:/PersonalProject/Real/apps/web/src/lib/student/store.ts
- D:/PersonalProject/Real/apps/web/src/lib/auth/auth-store.ts

1. Lấy tên/initials từ user session hiện có, đúng field contract.
2. Bỏ tên mock khỏi greeting/sidebar/profile panel/mobile shell.
3. Session chưa sẵn sàng không thoáng hiện người mẫu.
4. Thiếu tên: fallback trung tính, không bịa profile.
5. Không sửa login/refresh/token/guard/backend Auth.
   Nếu cần thay các phần đó, dừng xin duyệt riêng.

Tự test hai Student khác nhau, reload, tên tiếng Việt dài,
session loading, logout rồi đăng nhập tài khoản khác.
Nếu A01 đã được agent khác claim/triển khai, không thực hiện trùng.
~~~

### TEST A01

~~~text
TEST A01 — Danh tính hiển thị.

1. A: greeting/sidebar/profile/mobile đều đúng A.
2. Logout/login B cùng browser: không tên A/fixture.
3. Hard reload lúc restore session: không lóe tên mẫu.
4. Tên dài/có dấu: không vỡ layout 375px.
5. Thiếu display name: fallback trung tính.
6. Diff không thay Auth/guard/token ngoài phạm vi.
Mock auth store không phải bằng chứng đăng nhập thật hoạt động.
~~~

[↑ Mục lục](#toc)

<a id="a02"></a>
## A02 — Cô lập demo và tiến độ local

**Phụ thuộc:** A00, A01. **Đạt khi:** production không lấy dữ liệu demo làm kết quả thật.

### CODE A02 + tự test

~~~text
TASK A02 — Tách demo khỏi dữ liệu Student production.

Đọc nguồn chung và:
- D:/PersonalProject/Real/apps/web/src/lib/student/store.ts
- D:/PersonalProject/Real/apps/web/src/components/student/controls.tsx
- D:/PersonalProject/Real/apps/web/src/components/student/student-shell.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/(app)

Thực hiện đúng ma trận đã duyệt trong A00:
1. Không lấy hanlu-student làm nguồn XP/streak/điểm/progress tài khoản thật.
2. Tách preference UI khỏi progress demo; không gọi local preference là
   đồng bộ đa thiết bị.
3. Production không bật demo bằng ?demo=1 hoặc storage flag.
4. Route thiếu backend dùng unavailable state đã duyệt;
   không fake hoàn thành/nộp bài/đạt điểm bằng local state.
5. Mở khóa nội dung bằng XP chỉ có trong demo đã cô lập.
6. Không xóa localStorage hàng loạt/âm thầm xóa dữ liệu cũ.
   Đề xuất giữ/di trú storage, chờ duyệt nếu cần.
7. Không đổi Auth/RBAC, không xây API progress.

Tự test production/dev, storage cũ, hai tài khoản và direct URL.
~~~

### TEST A02

~~~text
TEST A02 — Ranh giới demo/production.

1. Production + ?demo=1 + storage demo vẫn không fake-ready.
2. XP/điểm cũ không biến thành progress thật của A/B.
3. Direct URL route chưa triển khai: unavailable rõ.
4. Không chấm/nộp/mở khóa XP giả trong production.
5. Demo vẫn chạy ở môi trường được phép, có nhãn rõ.
6. Theme/preference dùng được; không mất storage ngoài phạm vi.
7. API tắt không xuất hiện fixture thay thế.
~~~

[↑ Mục lục](#toc)

<a id="a03"></a>
## A03 — Giao diện SRS thật theo Hán Lộ

**Phụ thuộc:** A00. **Đạt khi:** API/logic thật được giữ, presentation dùng Hán Lộ.

### CODE A03 + tự test

~~~text
TASK A03 — Restyle SRS production bằng component/token Hán Lộ.

Chưa đổi route; giữ vị trí SRS hiện hành tới A05.
Nếu code đã chuyển route, dùng route thực tế và báo thay đổi dependency.

Đọc nguồn chung, contract/spec SRS đã duyệt và:
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/mistakes/page.tsx
- D:/PersonalProject/Real/apps/web/src/lib/student/flashcards-service.ts
- D:/PersonalProject/Real/apps/web/src/components/student/primitives.tsx
- D:/PersonalProject/Real/apps/web/src/components/student/controls.tsx
- D:/PersonalProject/Real/apps/web/src/styles/hanlu

1. Thay component/style SRS cũ bằng Hán Lộ, không tạo palette thứ ba.
2. Giữ service/API thật, không copy Leitner từ Flashcards mock.
3. Giữ browse HSK 1–9, due queue, flip, 4 rating và stats.
4. Đủ loading/empty/error/submitting và states contract yêu cầu.
5. Ví dụ/audio chỉ từ dữ liệu thật; thiếu thì không giả nội dung/âm thanh.
6. Không đổi SM-2/schema/payload/design baseline.

Tự test request trước/sau không đổi; desktop/mobile, theme,
keyboard và reduced-motion nếu dùng animation.
~~~

### TEST A03

~~~text
TEST A03 — SRS giữ chức năng thật sau restyle.

1. Browse HSK 1 và 9 gửi đúng cấp.
2. Due queue dùng endpoint due, không lọc fixture local.
3. Flip đúng nghĩa/ví dụ của thẻ.
4. Đủ 4 rating; không Leitner 3 nút/cộng XP demo.
5. Loading/empty/error không mất sau restyle.
6. Desktop/375px/theme: chữ rõ, nút không tràn, focus thấy được.
7. So network/diff service: không thay contract/backend.
8. Landing/login không bị CSS mới làm hỏng.
~~~

[↑ Mục lục](#toc)

<a id="a04"></a>
## A04 — Tải/chấm thẻ và thống kê an toàn

**Phụ thuộc:** A03. **Đạt khi:** kết quả server quyết định UI, không fake-success/race.

### CODE A04 + tự test

~~~text
TASK A04 — Cứng hóa tải/chấm SRS, không đổi thuật toán backend.

Đọc nguồn chung, nguồn SRS của A03 và API client hiện hành.
1. Đổi cấp/mode nhanh: response cũ không ghi đè lựa chọn mới.
2. Chỉ chấm sau flip; khóa submit đang xử lý.
3. Again=0, Hard=3, Good=4, Easy=5.
4. Chỉ chuyển thẻ sau POST review thành công.
5. POST lỗi: giữ thẻ, retry rõ, không báo đã lưu.
6. POST thành công nhưng GET stats lỗi: không gửi lại POST để sửa stats.
7. Mất response: không tự replay mutation khi contract chưa bảo đảm
   idempotency; không tự thêm field/endpoint.
8. Hoàn tất phiên khác catalog rỗng; có next CTA đã duyệt.
9. Missing/null stats không đổi thành số giả;
   không tự tính streak khi calendar rule chưa duyệt.

Regression tests: response đảo thứ tự, double-click, POST fail,
POST success + stats fail, hoàn tất phiên.
~~~

### TEST A04

~~~text
TEST A04 — Thử phá luồng SRS.

1. Response HSK 1 chậm hơn HSK 9: cuối cùng vẫn HSK 9.
2. Chuyển browse/due khi tải: queue không trộn.
3. Click liên tục: một hành động chỉ phát một POST.
4. POST 4xx/5xx: không chuyển thẻ/tăng số ôn giả.
5. POST 200 + stats 500: retry GET, không tăng totalReviews lần nữa.
6. Kiểm payload 4 mức và state reload từ backend thật.
7. Thẻ cuối: kết quả phiên, không báo catalog chưa nhập.
8. Null streak khác 0; error khác empty.
9. Mất response không gây auto-replay mutation thiếu bảo đảm.
Báo riêng giới hạn idempotency backend nếu contract chưa bảo đảm.
~~~

[↑ Mục lục](#toc)

<a id="a05"></a>
## A05 — Hợp nhất route và link SRS

**Phụ thuộc:** A04. **Đạt khi:** menu Flashcards mở SRS thật và deep link cũ không mở mock.

### CODE A05 + tự test

~~~text
TASK A05 — Đưa SRS thật vào route canonical được duyệt trong A00.

Đọc nguồn chung, nguồn A03 và:
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/flashcards/page.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/mistakes/review/page.tsx
- D:/PersonalProject/Real/apps/web/src/components/student/student-shell.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/layout.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/layout.tsx

1. Chuyển SRS thật sang /student/flashcards theo A00.
2. Sửa sidebar/dashboard/mobile nav/CTA ôn tập.
3. Route mistakes và mistakes/review theo A00, không tự đánh đồng
   sổ lỗi sai và vocabulary SRS.
4. Deep link không mở lại review mock production.
5. Learner routes giữ trong (app), landing vẫn public.
6. Không đổi quyền; nếu phải đổi guard/RBAC, xin duyệt riêng.
7. Không xóa component/dữ liệu còn dùng; cleanup để A12.

Tự test direct URL, reload, back/forward, link cũ và login return path.
~~~

### TEST A05

~~~text
TEST A05 — Điều hướng đúng SRS.

1. Dashboard tới SRS thật trong tối đa 2 click.
2. Sidebar/mobile/CTA cùng tới đúng nơi.
3. URL canonical trực tiếp và reload không 404.
4. URL cũ đúng A00, không redirect loop.
5. mistakes/review không mở queue demo production.
6. Anonymous không vào learner area; landing public, không sidebar.
7. Back/forward không đưa về Flashcards mock.
8. Network trang canonical gọi API SRS thật.
~~~

[↑ Mục lục](#toc)

<a id="a06"></a>
## A06 — Danh sách lớp thật

**Phụ thuộc:** A00. **Đạt khi:** list đúng tài khoản từ API, không fallback.

### CODE A06 + tự test

~~~text
TASK A06 — Nối GET danh sách lớp Student.

Đọc nguồn chung, Classes contracts từ A00 và:
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/classes/page.tsx
- D:/PersonalProject/Real/apps/web/src/lib/api-client.ts
- D:/PersonalProject/Real/apps/api/src/classes/student-classes.controller.ts
- D:/PersonalProject/Real/apps/api/src/classes/classes.service.ts
- D:/PersonalProject/Real/docs/api/modules/03-classes-enrollment.md

1. Tạo/tái dùng FE service theo transport thật của GET student/classes.
2. Thay studentClasses fixture bằng response tài khoản hiện tại.
3. Đủ loading/empty/forbidden/error/retry.
4. Chỉ render field thật, không chế số bài tập/điểm/attendance.
5. Link chi tiết dùng ID thật.
6. Join/leave chưa nối phải unavailable, không giữ fake-success.
7. Không thay backend.

Tự test có lớp/rỗng/lỗi, hai student và reload.
~~~

### TEST A06

~~~text
TEST A06 — List lớp theo tài khoản.

1. A có lớp/B không có: list đúng.
2. Reload không về fixture.
3. 500/offline không hiện lớp mẫu hoặc empty-success.
4. Link dùng ID lớp thật.
5. Không lộ enrollment code/roster hoặc dữ liệu ngoài response Student.
6. Không tạo số bài tập/điểm mặc định để lấp chỗ trống.
7. Retry phục hồi khi API hoạt động lại.
~~~

[↑ Mục lục](#toc)

<a id="a07"></a>
## A07 — Tham gia lớp thật

**Phụ thuộc:** A06. **Đạt khi:** thành công tồn tại sau reload, teacher roster kiểm chứng được.

### CODE A07 + tự test

~~~text
TASK A07 — Form tham gia lớp với POST student/classes/join.

Đọc nguồn chung, nguồn Classes A06 và JoinClassDto thực tế.
1. Validate enrollmentCode theo DTO approved, không tự đặt regex.
2. Gửi payload enrollmentCode qua API client hiện có.
3. Disable đang gửi; chống double-click.
4. Chỉ success khi server xác nhận; refetch list.
5. Lỗi mã sai/đã tham gia/archived theo registry thực tế.
6. Request fail giữ input, không thêm lớp local giả.
7. Rejoin theo backend/spec đã chốt.
8. Không sửa schema/quyền.

Tự test class/account fixture riêng; xác nhận enrollment và reload.
~~~

### TEST A07

~~~text
TEST A07 — Join lớp.

1. Mã hợp lệ → server success → list có lớp → reload còn.
2. Sai/thiếu/sai format → lỗi đúng, không enrollment.
3. Đã tham gia → đúng contract, không duplicate.
4. Archived không báo join thành công.
5. Double-click/request chậm không tạo duplicate.
6. Offline giữ input, không success toast.
7. Teacher roster thấy fixture student vừa join.
8. Student không đọc enrollment code từ list/detail response.
~~~

[↑ Mục lục](#toc)

<a id="a08"></a>
## A08 — Chi tiết lớp thật

**Phụ thuộc:** A06. **Đạt khi:** UUID thật dùng được và không chế lesson/bài tập.

### CODE A08 + tự test

~~~text
TASK A08 — Nối GET detail lớp Student.

Đọc nguồn chung, Classes service/contract A06 và:
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/classes/[classId]/page.tsx
- D:/PersonalProject/Real/apps/web/src/app/student/(app)/classes/[classId]/lessons/[lessonId]/page.tsx

1. Lấy classId từ route; gọi API Student detail.
2. Render thông tin/lesson metadata mà response thực sự có.
3. Không tra UUID lớp/lesson thật trong lms-data fixture.
4. ID sai/không tồn tại/không quyền: state theo contract, không bịa code.
5. Lesson detail/assignment thiếu endpoint approved+implemented:
   CTA unavailable; không thêm endpoint/body fixture.
6. Back về list hoạt động.

Tự test direct URL, lớp không/có lesson, quyền và reload.
~~~

### TEST A08

~~~text
TEST A08 — Detail và quyền đọc.

1. Lớp đã join đúng response.
2. UUID thật không not-found vì tra fixture.
3. Không lesson: empty đúng.
4. A mở lớp chỉ B tham gia: không lộ nội dung trái contract.
5. ID malformed/nonexistent đúng state, không crash.
6. Lesson/assignment chưa triển khai không mẫu/fake start.
7. Back/list/reload đúng lớp.
Chỉ dùng fixture riêng, không quét ID tài khoản thật.
~~~

[↑ Mục lục](#toc)

<a id="a09"></a>
## A09 — Rời lớp thật

**Phụ thuộc:** A07, A08. **Đạt khi:** leave/cancel/failure/rejoin đúng server.

### CODE A09 + tự test

~~~text
TASK A09 — Nối DELETE student/classes/:id/leave.

Đọc nguồn chung và nguồn Classes A06–A08.
1. Confirmation rõ tên lớp/hệ quả theo spec.
2. Cancel không request.
3. Confirm một request, khóa khi pending.
4. Chỉ đổi UI sau success; invalidate/refetch dữ liệu liên quan.
5. Server fail giữ lớp, báo lỗi thật.
6. Rejoin theo accepted rule; không hard-delete enrollment.
7. Không sửa backend/RBAC/schema để làm test pass.

Tự test leave/cancel/fail/reload/deep link sau leave/rejoin.
~~~

### TEST A09

~~~text
TEST A09 — Leave và rejoin.

1. Cancel: 0 DELETE.
2. Confirm: server đúng, list đúng sau reload.
3. Enrollment dropped theo spec, không xóa hàng.
4. DELETE fail không làm lớp biến mất giả.
5. Detail sau leave đúng quyền contract.
6. Rejoin giữ/reactivate row theo approved rule, không row trùng.
7. Double-click không làm state UI bất nhất.
Chỉ đọc/ghi fixture task, không dữ liệu thật.
~~~

[↑ Mục lục](#toc)

<a id="a10"></a>
## A10 — Kiểm kê nguồn từ vựng

**Loại:** READ-ONLY trước; DOCS sau duyệt. **Đạt khi:** có nguồn/mapping/import plan approved.

### Thực hiện A10 + tự kiểm tra

~~~text
TASK A10 — Xác minh vocabulary và thiết kế import.

Đọc nguồn chung, entity Flashcard/SRS từ entity index và:
- D:/PersonalProject/Chinese UI test/ui-claude/backend/data/content
- D:/PersonalProject/Real/apps/api/src/mongodb/schemas
- D:/PersonalProject/Real/apps/api/src/flashcards

READ-ONLY:
1. Có vocabulary thật không? Không suy grammar.json là vocabulary.
2. Đếm mỗi HSK 1–9; field, Unicode, duplicate, ví dụ, audio.
3. Ghi provenance/tình trạng quyền sử dụng; chưa rõ thì BLOCKED.
4. Mapping schema hiện có, không tự thêm field/schema.
5. Đề xuất source repository-owned, validate/dry-run/khóa định danh/
   chạy lặp/update/rollback và bảo vệ review state.
6. Chưa copy data hoặc ghi DB.

Trình plan DOCS, chờ duyệt trước khi ghi thiết kế/manifest.
Không tự duyệt nội dung sư phạm/quyền sử dụng.
~~~

### TEST A10

~~~text
TEST A10 — Nguồn và import plan.

1. Tự đếm lại từng HSK, phân biệt total rows và unique valid cards.
2. Kiểm mẫu Hanzi/Pinyin/nghĩa, field thiếu.
3. Duplicate theo khóa đề xuất; cùng Hanzi chưa chắc trùng nghĩa.
4. Mapping không âm thầm mất thông tin.
5. Provenance/quyền sử dụng chưa rõ vẫn BLOCKED.
6. Deploy không phụ thuộc ổ D developer.
7. Audit không đổi DB/data.
8. Import plan bảo vệ ID và review state học viên.
~~~

[↑ Mục lục](#toc)

<a id="a11"></a>
## A11 — Importer từ vựng

**Phụ thuộc:** A10 approved. **Đạt khi:** import an toàn, không reset lịch ôn.

### CODE A11 + tự test

~~~text
TASK A11 — Import theo A10 approved.

Đọc nguồn chung, thiết kế/manifest A10 và entity/runtime Flashcard/SRS.
Chỉ bắt đầu khi source, mapping, strategy được duyệt.
1. Validator + dry-run mặc định, không write.
2. Báo valid/invalid/duplicate/create/update, lỗi từng record.
3. Apply rõ ràng, DB đích đã xác nhận.
4. Chạy lại input không duplicate/đổi ID được tham chiếu.
5. Không reset/xóa review state/lịch ôn cá nhân.
6. Không drop collection/reset DB/production import.
7. Failure giữa chừng và rerun theo semantics A10; không hứa transaction
   khi implementation/storage không cung cấp.
8. Nếu cần schema/index change: dừng xin duyệt đúng phạm vi.

Tự test fixture repository-owned trên DB riêng:
valid/invalid/Unicode/duplicate/dry-run/apply hai lần/update/failure recovery.
~~~

### TEST A11

~~~text
TEST A11 — An toàn importer.

1. Dry-run không thay DB.
2. Invalid input đúng A10; lỗi truy được record.
3. Apply hai lần: count/ID ổn định theo khóa approved.
4. Update nội dung không reset SRS state.
5. Hanzi/Pinyin/tiếng Việt không lỗi encoding.
6. Lỗi giữa chừng + rerun không duplicate/mất data.
7. Chạy được khi không có thư mục Chinese UI test.
8. Catalog test vừa nhập đọc được qua API và màn SRS thật.
9. Evidence không dùng production connection/drop/reset.
~~~

[↑ Mục lục](#toc)

<a id="a12"></a>
## A12 — Dọn UI cũ sau tích hợp

**Phụ thuộc:** A02, A05–A09. **Đạt khi:** chỉ bỏ dead code/style, không mở rộng redesign.

### CODE A12 + tự test

~~~text
TASK A12 — Dọn code/style cũ hết consumer.

Đọc nguồn chung, tìm mọi import/usage:
- D:/PersonalProject/Real/apps/web/src/components/student/ui.tsx
- D:/PersonalProject/Real/apps/web/tailwind.config.ts
- D:/PersonalProject/Real/apps/web/src/styles/hanlu
- D:/PersonalProject/Real/apps/web/src/app
- D:/PersonalProject/Real/apps/web/src/components

1. Liệt kê component/token/class còn và không còn dùng.
2. Chỉ xóa khi chứng minh hết consumer, kể cả dynamic classes.
3. Màn đã migrate dùng chung Hán Lộ hiện hành.
4. Không xóa mock corpus/local progress/route ngoài phạm vi.
5. Không đổi baseline/Admin/Teacher palette/business logic.
6. Sửa comment/import stale trong phạm vi.

Tự test build/screenshots/navigation Student, landing, login/register;
Admin/Teacher không bị ảnh hưởng CSS.
~~~

### TEST A12

~~~text
TEST A12 — Cleanup regression.

1. Không import trỏ file đã xóa.
2. Màn migrated không lệ thuộc sp-* hoặc style cũ bị bỏ.
3. Theme/text/background/button contrast đúng.
4. Landing/login/register đúng cả sau client-side navigation.
5. Admin/Teacher không đổi ngoài ý muốn.
6. Desktop/375px không overflow mới.
7. Diff không xóa content/user data hoặc đổi baseline.
8. Build + regression tests, không kết luận từ compilation đơn thuần.
~~~

[↑ Mục lục](#toc)

<a id="t13"></a>
## T13 — Nghiệm thu toàn đợt

**TEST-only**, phát hiện lỗi trả về đúng task, không tự sửa.
Nếu A11 bị chặn, có thể nghiệm thu integration bằng fixture riêng nhưng phải ghi rõ
production catalog chưa đủ điều kiện và không đánh dấu toàn đợt hoàn thành.

~~~text
TEST T13 — Student SRS + Enrollment sau tích hợp.

Áp dụng quy tắc TEST độc lập và nguồn chung.
Commit cuối đã xác nhận, production web build, backend test thật.

Chuỗi 1 — Account:
Login A → tên đúng → logout → login B → không lẫn identity/progress.

Chuỗi 2 — SRS:
Browse HSK → ôn → flip → 4 rating → kết thúc → reload → API/state lưu.
B có lịch ôn riêng dù cùng vocabulary catalog.

Chuỗi 3 — Enrollment:
Teacher tạo lớp fixture → Student join → list → detail →
Teacher thấy enrollment → Student leave → reload → rejoin đúng contract.

Chuỗi 4 — Failure:
Offline/500, chậm/đảo response, double-click,
stats fail sau review success, session hết hạn.
Không fake success/fallback fixture/mutation trùng.

Chuỗi 5 — Routes/UI:
Direct/old URLs, back/forward, anonymous guard, public landing,
desktop/375px, theme, console/network.

Chuỗi 6 — Chưa triển khai:
Assignments/Attempts/self-study/progress/gamification thiếu backend
phải NOT IMPLEMENTED/unavailable; mock không tính hoàn thành.

Báo kết quả từng chuỗi và A00–A12.
Mỗi FAIL: reproduction + expected/actual + evidence + task cần trả về.
Không sửa/merge/deploy.
~~~

[↑ Mục lục](#toc)

<a id="fix-loop"></a>
## Prompt trả lỗi về agent code

~~~text
Task [Axx] có findings từ TEST [Axx] trên commit [SHA]:
[DÁN FINDINGS + BẰNG CHỨNG]

Chỉ sửa trong phạm vi plan đã duyệt của task này.
Nếu fix cần đổi contract/schema/Auth/RBAC/tiền/phần ngoài scope:
dừng và xin duyệt rõ, không tự mở rộng.
Thêm regression test tái hiện lỗi trước fix, tự test lại sau fix.
Không làm test pass bằng bỏ assertion, đổi expected trái contract hoặc thêm fallback mock.
Commit/RECORD theo quy tắc repo, báo SHA mới và evidence để kiểm thử độc lập lại.
~~~

**Không tự chọn merge khi test xanh.** Human review/approval vẫn là bước riêng.

