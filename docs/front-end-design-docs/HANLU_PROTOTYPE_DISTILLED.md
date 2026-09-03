---
title: Chưng cất prototype "Hán Lộ" → FE của chúng ta
status: draft
owner: Nhật
last_updated: 2026-09-03
source: D:\PersonalProject\Chinese UI test\ui-claude (frontend/ + backend/data/content)
---

# Chưng cất prototype "Hán Lộ" cho `apps/web`

> Tài liệu này **đọc** bản prototype ở `Chinese UI test/ui-claude` rồi rút gọn thành thứ
> `apps/web` dùng được: token, shell, component, bản đồ màn, hợp đồng dữ liệu, và
> danh sách việc phải quyết trước khi port.
>
> Mọi con số dưới đây lấy từ mã nguồn/dữ liệu thật của prototype, không ước lượng.
> Chỗ nào prototype tự bịa ra so với `docs/entities/` thì ghi ⚠️ chứ không im lặng nuốt vào.
>
> **Đây chưa phải Page Contract.** Khi chốt màn nào thì chạy `flow-mapper` sinh contract riêng
> vào `pages/student-pages/` và ghi một dòng vào [`pages/_INDEX.md`](./pages/_INDEX.md), đúng
> quy trình đang dùng cho Admin và Teacher. Tài liệu này là nguồn *đầu vào* cho bước đó.

---

## 0. Việc quan trọng nhất phải quyết trước: repo đang có **ba thế hệ UI học viên**

| | Thế hệ A — đang nằm trong `apps/web` | Thế hệ B — prototype `ui-claude` | Tài liệu `STUDENT_UI_UX.md` |
|---|---|---|---|
| Hướng thị giác | Tím indigo `#4F46E5` trên nền `#F5F6FC`, sáng, bo tròn `rounded-3xl` | **"Mực & Chu Sa"** — nền mực `#0a0d13` **mặc định tối**, nhấn chu sa `#f0532f`, ngọc bích/vàng cho phần thưởng; theme sáng là "giấy" `#f6f2ea` | không nói màu |
| Chữ | Nunito + DM Sans | Playfair Display (serif) + Sora (display) + Inter (UI) + **Noto Serif SC (chữ Hán)** + JetBrains Mono (số) | — |
| Cách viết style | Tailwind + `sp-*` token trong `tailwind.config.ts` + `student.css` | **CSS thuần**, biến CSS trong `tokens.css`, class ngữ nghĩa `.panel` `.btn--primary` `.node--boss` | — |
| Số màn | 3 màn thật (foundation, grammar, learning-path) + 5 màn "coming soon" | **21 route**, tất cả đều chạy được | 19 màn dự kiến |
| Dữ liệu | mock TS trong `src/lib/student/*` | Express API + 940KB JSON nội dung + bản ghi tiến độ ghi xuống máy chủ | — |
| Điện thoại | mobile-first | rail desktop / rail icon tablet / tab bar + sheet mobile — **ba layout riêng**, không phải desktop bóp nhỏ | mobile-first |

→ **Đây là quyết định của anh, không phải của agent**: giữ hướng indigo hiện có, hay chuyển
`apps/web` sang hướng "Mực & Chu Sa". Hai hướng không trộn được — chúng khác nhau ở nền
(sáng vs tối mặc định), ở font chữ Hán, và ở cả cách viết style.
Phần còn lại của tài liệu này mô tả thế hệ B để nếu chọn thì port được ngay.

---

## 1. Design token (dán được luôn)

Nguồn: `frontend/src/styles/tokens.css` (182 dòng). Cấu trúc: **ramp thương hiệu cố định** →
**vai trò ngữ nghĩa đổi theo theme**. Theme đặt bằng `document.documentElement.dataset.theme`,
lưu ở `localStorage['hanlu-theme']`, **mặc định `dark`**.

### 1.1 Ramp thương hiệu (không đổi theo theme)

| Ramp | Giá trị | Dùng cho |
|---|---|---|
| cinnabar (chu sa) | `300 #ff9c86` · `400 #ff7454` · `500 #f0532f` · `600 #d63d1c` · `700 #ad2f14` | accent chính, con dấu, CTA |
| jade (ngọc) | `300 #6fe0bb` · `400 #35c795` · `500 #16a97a` · `600 #0d8763` | đúng / hoàn thành |
| gold | `300 #ffd76e` · `400 #f5b942` · `500 #dc9a1c` | XP, cảnh báo, huy hiệu |
| violet | `300 #b3a6ff` · `400 #8e7cff` · `500 #6f59f0` | "epic" — ải trùm, huy hiệu hiếm |
| sky | `300 #8ccbff` · `400 #48a9f8` · `500 #1f88de` | thông tin |
| rose | `400 #ff6b81` · `500 #e63b56` | sai / nguy hiểm |

### 1.2 Vai trò ngữ nghĩa

Tối (mặc định): `--bg #0a0d13` · `--bg-veil #070910` · `--surface #121722` · `--surface-2 #19202d`
· `--surface-3 #212a3a` · `--line #253044` · `--text #eef2f8` / `--text-2 #a9b4c6` / `--text-3 #77839a`
· `--accent = cinnabar-400` · `--focus #7fd2ff`.

Sáng ("giấy"): `--bg #f6f2ea` · `--surface #ffffff` · `--surface-2 #faf6ef` · `--line #e3dacb`
· `--text #1b1a18` / `--text-2 #58524a` / `--text-3 #857d72` · `--accent = cinnabar-600` · `--focus #1f6feb`.

Mỗi vai trò còn có biến `-soft` (nền chip, `rgba` 10–16%) và `-line`. Bộ đủ:
`accent · success · warn · danger · info · epic`, cộng `--scrim`, `--shadow-1..3`, `--paper-grid`.

### 1.3 Thang chữ, khoảng cách, bo góc, chuyển động

- Type scale: `--step--2 11px` → `--step--1 13` → `--step-0 15` → `--step-1 17` → `--step-2 21`
  → `--step-3 26` → `--step-4 34` → `--step-5 44`.
- Space: `--sp-1 4` → `--sp-12 128` (4/8/12/16/20/24/32/40/56/72/96/128).
- Radius: `--r-xs 6` · `sm 10` · `md 14` · `lg 20` · `xl 28` · `pill 999`.
- Motion: `--ease cubic-bezier(.2,.8,.2,1)` · `--ease-out cubic-bezier(.16,1,.3,1)` ·
  `--dur-1 120ms` → `--dur-4 480ms`.
- Layout: `--rail-w 248px` · `--rail-w-compact 76px` · `--topbar-h 68px` · `--tabbar-h 64px`
  · `--content-max 1320px` · `--sitebar-h 64px`.

### 1.4 Font

```
--font-serif   Playfair Display   → tiêu đề marketing, số liệu lớn
--font-display Sora               → tiêu đề trong app
--font-ui      Inter              → thân
--font-han     Noto Serif SC      → mọi chữ Hán (class .han)
--font-mono    JetBrains Mono     → mọi con số (class .num)
```

⚠️ `.han` và `.num` là hai class hạ tầng dùng khắp nơi — port thiếu chúng thì chữ Hán rơi
về font hệ thống và bảng số bị nhảy cột.

---

## 2. App shell

Nguồn: `components/layout/AppShell.tsx` + `styles/layout.css`. Ba layout riêng, **không phải
một layout co giãn**:

| Khổ | Điều hướng |
|---|---|
| ≥ 1081px | rail cố định 248px bên trái: brand 汉 → 3 nhóm nav → user chip; topbar có breadcrumb + HUD |
| 768–1080px | rail thu còn 76px, chỉ icon |
| ≤ 767px | rail ẩn; `.mobilebar` trên (dấu 汉, tiêu đề trang, toggle hiển thị, streak, theme) + `.tabbar` dưới 5 ô (4 mục chính + "Thêm" mở bottom sheet) |

Breakpoint thực tế dùng trong CSS: `1240 · 1200 · 1080 · 1024 · 900 · 768/767 · 640 · 560`,
cộng `prefers-reduced-motion` và `(hover: none)`.

**Nhóm điều hướng** (3 nhóm, 13 mục):

- *Học tập*: Trang chủ · Lộ trình HSK · Từ vựng Flashcard · Ngữ pháp · Nền tảng
- *Luyện tập*: Phòng thi HSK · Sổ tay lỗi sai · Luyện viết chữ · Ghép câu Lego · Mô phỏng công sở
- *Thành tích*: Bảng xếp hạng · Tiến độ học tập · Kho huy hiệu

**HUD trên topbar**: cặp toggle 拼/译 (hiện Pinyin / hiện nghĩa) · streak 🔥 · XP ⚡ · nút theme.

**A11y đã có sẵn, đừng làm rơi khi port**: `.skip-link` "Bỏ qua điều hướng", `<main id="main"
tabIndex={-1}>`, và `RouteFocus` đưa cuộn/tiêu điểm về đầu khi đổi route (Next.js App Router
làm việc này khác — phải viết lại chứ không copy được).

---

## 3. Kho component

### 3.1 Primitives (`components/ui/Primitives.tsx`)

| Component | Props chính | Class CSS |
|---|---|---|
| `Panel` | `as`, `className` | `.panel` `.panel--pad` `.panel--tight` `.panel__head/body/foot` |
| `SectionHeader` | `title` `sub` `action` `id` | `.section-head` `.section-title` (có `::before` gạch chu sa) `.section-sub` |
| `Chip` | `tone: neutral\|accent\|success\|warn\|danger\|info\|epic` | `.chip` `.chip--{tone}` |
| `Bar` | `value` `tone: accent\|success\|gold\|epic\|info` `size: sm\|md\|lg` | `.bar` `.bar__fill--{tone}` |
| `Ring` | `value` `size` `stroke` `color` + children ở giữa | `.ring` `.ring__track` `.ring__value` |
| `Metric` | `label` `value` `unit` `icon` `color` | `.metric__label/value/unit` |
| `EmptyState` / `ErrorState` | `title` `text` `action` / `onRetry` | `.state` `.state__glyph--danger` |
| `Skeleton` / `SkeletonPanel` | `h` `w` `radius` / `rows` `height` | `.skel` (shimmer, tắt khi reduced-motion) |

`Bar` và `Ring` đều gắn `role="progressbar"` + `aria-valuenow/min/max` đầy đủ.

### 3.2 Controls (`components/ui/Controls.tsx`)

| Component | Ghi chú |
|---|---|
| `Tabs` / `TabPanel` | roving tabindex, phím ←→ Home End, `aria-selected` + `aria-controls` chuẩn |
| `Segmented` | như Tabs nhưng dạng nút gộp |
| `LevelSelector` | chọn HSK 1–9 dạng `role="radiogroup"`, có trạng thái `done` / `locked`, giữ được điểm vào bàn phím khi không có mục nào chọn |
| `AudioButton` | **Web Speech API**, `lang='zh-CN'`, `rate 0.85`, có timeout dự phòng khi `onend` không bắn |
| `Pagination` | cửa sổ 1 … n-1 n, `pageSize` mặc định 24, tự ẩn khi 1 trang |
| `DemoStateSwitcher` | công cụ nội bộ: bật bằng `?demo=1`, nhớ trong localStorage — **không phải UI cho học viên** |
| `LockedTag` | chip khoá |

### 3.3 Overlay (`components/ui/Overlay.tsx`)

Một hook `useOverlay` dùng chung cho cả ba: khoá cuộn `body`, Escape để đóng, **bẫy tiêu điểm
Tab/Shift-Tab**, trả tiêu điểm về nút đã mở. Ba biến thể: `Drawer` (trượt phải, có
eyebrow/subtitle/footer), `Modal` (giữa màn), `Sheet` (bottom sheet mobile). Tất cả render qua
`createPortal` với `role="dialog" aria-modal="true"`.

⚠️ Đây là đoạn đáng port nguyên văn nhất — nó giải quyết đúng phần a11y mà mọi bản viết vội
đều làm sai.

### 3.4 Toast (`components/ui/Toast.tsx`)

Context + portal, `role="status" aria-live="polite"`, giữ tối đa 3 toast, tự tắt sau 2800ms,
4 tone `info/success/warn/danger`.

---

## 4. Bốn pattern xuyên suốt — port thiếu là vỡ trải nghiệm

1. **Toggle Pinyin / Nghĩa toàn cục.** `DisplayProvider` ghi
   `html[data-show-pinyin]` và `html[data-show-meaning]`, còn `base.css` ẩn ~20 class con
   (`.charcard__pinyin`, `.wordrow__vi`, `ruby rt`, …) bằng CSS thuần. Không có JS nào ở phía
   trang. Khi port: **giữ nguyên cơ chế thuộc tính trên `<html>`**, chỉ đổi danh sách class.
   Đã lưu server (`PUT /progress/display-settings`) *và* localStorage.
2. **Tiến độ lạc quan có gộp lô.** `ProgressProvider` cập nhật UI ngay, gộp các patch nhỏ
   (XP, phút học, chuỗi) rồi mới đẩy lên máy chủ, có `confirmed` để rollback khi lỗi. Trùng
   ý với quyết định S4 của chúng ta (buffer client flush 10–15s) — dùng lại được ý tưởng.
3. **Bốn trạng thái mỗi trang.** Trang nào cũng có `ready / loading / empty / error` thật, không
   phải chỉ vẽ `ready`. `DemoStateSwitcher` là cách họ duyệt cả bốn.
4. **`.han` / `.num` cho mọi chữ Hán và mọi con số.** Xem §1.4.

---

## 5. Bản đồ màn (21 route)

Nguồn: `App.tsx`. Cột "ta có gì" đối chiếu với `apps/web/src/app/student/`.

| Route prototype | Màn | Khối nội dung chính | `apps/web` hiện tại |
|---|---|---|---|
| `/` | Landing công khai | 8 khối: hero 3D giáo viên (three.js) · số liệu tin cậy · học viên tiêu biểu (modal) · phương pháp · lộ trình HSK · 4 kỹ năng · khu vực học · CTA | ❌ chưa có |
| `/student` | Dashboard | hero + rank + streak tuần · thang HSK 1–9 · hàng đợi ôn hôm nay (drawer + modal phiên ôn nhanh) · hoạt động gần đây · biểu đồ tuần · lối tắt | ✅ đã port (528 dòng, bản indigo) |
| `/student/learning-path` | Bản đồ lộ trình | chọn giáo trình (2 bộ) · chọn cấp · **map dạng đường mòn zigzag** hoặc danh sách · node lesson/side/boss · drawer node | ✅ đã port (641 dòng, bản indigo) |
| `/student/learning-path/:lessonId` | Bài học | 3 bước: Học → Luyện → Hoàn thành; ải trùm cần đạt chuẩn mới qua | ❌ |
| `/student/placement` | Kiểm tra xếp cấp | làm bài → gợi ý cấp | ❌ |
| `/student/grammar` | Ngữ pháp HSK 1–9 | tổng kết thành thạo · bộ lọc · thẻ ngữ pháp · drawer chi tiết · modal 5 dạng bài (mcq/blank/reorder/match/reflex) | ✅ đã port (646 dòng) |
| `/student/foundation` | Nền tảng | 5 tab: Pinyin · Thanh điệu + biến điệu · 214 bộ thủ · Nghe · Nói; cộng 4 PDF tải về | ✅ đã port (778 dòng) |
| `/student/flashcards` | Flashcard từ vựng | chọn cấp · bộ lọc trạng thái · thẻ lật · 3 nút đáp (phím tắt 1/2/3) · danh sách từ mở rộng · phân trang | ❌ |
| `/student/writing` | Luyện viết chữ | tóm tắt · lọc theo bộ thủ/cấp · lưới thẻ chữ | 🔶 stub |
| `/student/writing/:characterId` | Chi tiết chữ | thứ tự nét · **bảng 米字格 vẽ tay + chấm điểm** · tiến độ chữ · từ ghép | ❌ |
| `/student/mistakes` | Sổ tay lỗi sai | tổng quan 5 hộp SRS · bộ lọc · danh sách lỗi | 🔶 stub |
| `/student/mistakes/review` | Phiên ôn lỗi sai | làm lại → verdict → tổng kết phiên | ❌ |
| `/student/exams` | Phòng thi HSK | tổng quan · lọc cấp/loại · danh sách đề · lịch sử thi · modal đếm ngược vào phòng | 🔶 stub |
| `/student/exams/:examId` | **Phòng thi** | thanh đề + đồng hồ (đỏ khi sắp hết) · câu hỏi theo phần · lưới `.qdot` đánh dấu đã làm/gắn cờ/đang ở · xác nhận nộp · hết giờ tự nộp | ❌ |
| `/student/exams/:attemptId/result` | Phiếu điểm | tổng điểm · điểm theo kỹ năng (mốc 60%) · xem lại từng câu · chứng chỉ mô phỏng | ❌ |
| `/student/workplace` | Mô phỏng công sở | tổng quan · lọc · danh sách 6 kịch bản | 🔶 stub |
| `/student/workplace/:scenarioId` | Kịch bản | màn bối cảnh + chuẩn bị từ vựng → hội thoại nhiều lượt, soạn thảo, chấm điểm mô phỏng theo từ khoá, cột tiêu chí/từ vựng/mẫu câu | ❌ |
| `/student/lego` | Ghép câu Lego | 7 trạm · kéo khối theo vai trò ngữ pháp (S/T/P/A/V/O/C/Q) · sao mỗi ván · bảng màu vai trò | ❌ |
| `/student/leaderboard` | Bảng xếp hạng | lọc tuần/tháng/all · bục vinh danh top 3 · hạng của bạn · bảng đầy đủ | 🔶 stub |
| `/student/progress` | Tiến độ | tổng quan · **lưới nhiệt chuỗi ngày** · XP theo tháng · 4 kỹ năng · thang HSK 1–9 | ❌ |
| `/student/badges` | Kho huy hiệu | tổng quan · lọc theo nhóm/độ hiếm · lưới · drawer chi tiết | ❌ |
| `/admin` | Duyệt tài khoản | danh sách học viên, approve/reject/delete | có khu admin riêng, khác hẳn |

---

## 6. Hợp đồng dữ liệu prototype ↔ entity của ta

Prototype tách đôi rất sạch, đây là ý tưởng nên giữ:

- **`Content`** — nội dung cố định, chỉ đọc, máy chủ phục vụ: `learningPath · grammar ·
  foundation · writing · exams · workplace · lego · levels · leaderboard`.
- **`Progress`** — tất cả những gì học viên *làm*: `student · mistakes · attempts · examStatus ·
  activity · week · streakHistory · skills · xpMonths · foundationMastery · writingMastery ·
  grammarMastery · legoStars · workplaceProgress · earnedBadges · unlockedNodes ·
  completedLessons · counters · displaySettings`.

Quy tắc họ theo: **trạng thái của học viên không bao giờ nằm trong định nghĩa nội dung**
(`Exam` không chứa `status`; `GrammarPoint` không chứa `mastery`; ghép lại lúc render bằng
`withGrammarMastery`, `examStatus(exam, progress)`…). Quy tắc này khớp với cách `docs/entities/`
của ta tách `Question` (Mongo) khỏi `AttemptAnswer` (PG) — giữ nguyên khi port.

### 6.1 Đối chiếu với entity của ta

| Prototype | Entity của ta | Ghi chú |
|---|---|---|
| `ExamAttempt` | `Attempt` + `AttemptAnswer` | ⚠️ prototype **chấm điểm ngay trên trình duyệt** (`ExamRoom.tsx`) và đồng hồ chạy từ `durationMin` phía client. Trái thẳng với **ADR-005** (server-authoritative, `expiresAt` do server tính, `questionSnapshot`). Port giao diện thì được; port cách chấm thì **không**. |
| `MistakeItem` + 5 hộp Leitner | `UserFlashcardState` (SM-2) | ⚠️ hai thuật toán khác nhau. Prototype: đúng lên 1 hộp, sai về hộp 1, khoảng 10 phút/1 ngày/3 ngày/1 tuần/1 tháng. Ta đã chốt SM-2 ở S5. Phải chọn một. |
| `Exam`, `ExamQuestion`, `ExamPaper` | `Assignment` + `Question` | prototype không có khái niệm lớp/giáo viên giao bài — đề là nội dung tĩnh |
| `StudentProfile` (`xp`, `rank`, `streakDays`, `currentLevel`) | `User` | ⚠️ `xp` / `rank` / `streakDays` **chưa có trong `docs/entities/`** |
| `SkillScore` | `SkillScore` | ta có tên entity nhưng **chưa có file spec** (đã ghi trong HANDOFF) — prototype cho sẵn một hình dạng dùng được |
| `Curriculum` (2 bộ: `hsk-standard`, `han-ngu`) | — | ⚠️ chưa có |
| `Badge` / `LegoStation` / `Scenario` / `Radical` / `WritingChar` | — | ⚠️ hoàn toàn chưa có |

### 6.2 API prototype (tham khảo khi thiết kế endpoint student)

`GET /api/content` · `GET|PATCH /api/progress` và, khi đã đăng nhập, mọi thứ nằm dưới
`/api/learners/:id/progress/...`:
`PUT /mistakes/:id` · `POST /attempts` · `POST /nodes/:id/unlock` · `POST /activity` ·
`PUT /grammar/:id` · `PUT /writing/:id` · `PUT /lego/:stationId` · `PUT /badges` · `PUT /week` ·
`PUT /xp-months` · `PUT /streak-history` · `POST /lessons/:nodeId/complete` ·
`PUT /workplace/:scenarioId` · `PUT /foundation/{sounds,radicals,speaking,listening,progress}` ·
`PUT /display-settings` · `POST /reset`.

So với `docs/api/API_STUDENT.md` của ta: **trùng ý** ở flashcards/attempts/progress, **thiếu hẳn**
ở foundation / writing / lego / workplace / badges / activity.

---

## 7. Luật chơi đã cài sẵn (rút từ `data/rules.ts` + `labels.ts`)

| Luật | Giá trị |
|---|---|
| Hộp SRS | 5 hộp: 10 phút · 1 ngày · 3 ngày · 1 tuần · 1 tháng. Đúng → +1 hộp (tối đa 5); sai → về hộp 1 |
| Đạt chuẩn viết chữ | `WRITING_PASS_SCORE = 80` |
| Sao Lego | xong ván = 1 sao · đúng ≥ 50% = 2 sao · đúng ≥ 80% = 3 sao. Trạm 5 chỉ mở khi trạm 4 đủ 3 sao |
| Mở khoá cưỡng bức | `FORCE_UNLOCK_COST = 100` XP |
| Danh hiệu | suy ra từ XP (6 bậc trong `levels.json`), **không lưu** — `rankFromXp()` |
| Chuỗi ngày | tính theo `lastStudyDate` giờ địa phương; có ngày được "khiên" giữ chuỗi |
| Chấm mô phỏng công sở | so khớp từ khoá của lượt (`scoreReply`) |
| Xếp cấp | ⚠️ `placementLevel(..., maxLevel = 6)` — **kẹt ở HSK 6**. Theo `CLAUDE.md`, thấy 1–6 là lỗi tồn đọng phải sửa về 1–9. Đây là bug của prototype, chỉ có ở `rules.ts:587`; phần còn lại (`levels.json` có đủ `hsk[9]`, `LevelSelector` HSK 1–9) đều đúng |

---

## 8. Kho nội dung có sẵn — 940KB, seed được ngay

`backend/data/content/`:

| Tệp | Nội dung |
|---|---|
| `foundation.json` (52K) | 21 thanh mẫu · 36 vận mẫu · 4 thanh điệu · 6 quy tắc biến điệu · **214 bộ thủ** · 6 thẻ nghe · 6 thẻ nói · 4 PDF |
| `writing.json` (380K) | **587 chữ** kèm pinyin/nghĩa/từ ghép |
| `strokes.json` (136K) | thứ tự nét của 60 chữ |
| `exams.json` (208K) | 11 đề + đề bài đã sinh sẵn |
| `grammar.json` (44K) | 76 điểm ngữ pháp |
| `lego.json` (36K) | 40 câu / 7 trạm |
| `workplace.json` (40K) | 6 kịch bản nhiều lượt |
| `learning-path.json` (20K) | 2 giáo trình · 4 nhiệm vụ phụ · 3 ải trùm |
| `levels.json` (8K) | **HSK 1–9** · 6 bậc danh hiệu · 6 cột mốc chuỗi |
| `badges.json` (8K) | 20 huy hiệu |
| `leaderboard.json` (4K) | 20 đối thủ mẫu |

→ Đây là thứ giá trị nhất và dễ bị bỏ quên nhất khi chỉ nhìn giao diện. Nó bù đúng vào chỗ
`SPRINT_PLAN.md` S5 ghi "seed HSK 1–9" mà chưa có dữ liệu.

---

## 9. Những gì **không** nên bê nguyên

1. **Chấm thi ở client** (`ExamRoom.tsx`) — trái ADR-005. Bê giao diện phòng thi, viết lại phần chấm ở server.
2. **Đồng hồ tính từ `durationMin` phía client** — ADR-005 yêu cầu lấy `expiresAt` từ server.
3. **Đăng nhập bằng tên hồ sơ, không mật khẩu** — prototype tự nhận là prototype. Ta đã có JWT access/refresh.
4. **`react-router-dom`** — App Router dùng file-based routing; `RouteFocus` phải viết lại.
5. **Web Speech API làm nguồn phát âm** — chất lượng phụ thuộc giọng của máy người dùng.
   Kiến trúc của ta đã chốt audio nằm ở Supabase Storage. Giữ `AudioButton` như *fallback*, không làm nguồn chính.
6. **Ghi tiến độ kiểu last-write-wins, không transaction** — chấp nhận được cho prototype, không cho Postgres.

---

## 10. Đề xuất thứ tự port

**Bước 0 — quyết định (chặn mọi thứ phía sau)**
- [ ] Chọn hướng thị giác: giữ indigo hiện tại hay chuyển "Mực & Chu Sa"?
- [ ] Chọn CSS thuần + biến CSS, hay dịch token sang Tailwind như `apps/web` đang làm?
- [ ] Chọn thuật toán ôn tập: 5 hộp Leitner (prototype) hay SM-2 (kế hoạch S5)?
- [ ] Có nhận các tính năng prototype tự thêm không (XP · danh hiệu · chuỗi ngày · huy hiệu ·
      Lego · Công sở · Bộ thủ · Xếp cấp)? Nếu có thì phải bổ sung entity, và `SPRINT_PLAN.md`
      cần một sprint riêng — hiện S0–S9 không có chỗ cho chúng.

**Bước 1 — nền (không phụ thuộc quyết định nội dung)**
`tokens.css` → shell 3 tầng → `Panel/Chip/Bar/Ring/Metric/State/Skeleton` → `Overlay` (port
nguyên văn) → `Toast` → `DisplayProvider`.

**Bước 2 — màn khớp sprint hiện tại**
Flashcards + Sổ tay lỗi sai (S5) · Phòng thi + Phiếu điểm (S4, chấm ở server) · Tiến độ (S5).

**Bước 3 — màn của tính năng mới, chỉ khi bước 0 duyệt**
Lego · Công sở · Huy hiệu · Bảng xếp hạng · Xếp cấp · Luyện viết chữ · Landing.

---

## 11. Tệp cần đọc khi bắt tay port

| Cần | Đọc |
|---|---|
| Token | `frontend/src/styles/tokens.css` |
| Shell | `components/layout/AppShell.tsx` + `styles/layout.css` |
| Component | `components/ui/{Primitives,Controls,Overlay,Toast}.tsx` + `styles/components.css` |
| Kiểu dữ liệu | `data/types.ts` (668 dòng — đọc trước khi thiết kế endpoint student) |
| Luật | `data/rules.ts` (660 dòng) · `data/labels.ts` |
| Đồng bộ tiến độ | `data/ProgressProvider.tsx` |
| Nội dung seed | `backend/data/content/*.json` |
| Chính tác giả prototype dặn gì | `ui-claude/AGENTS.md` · `ui-claude/docs/remaining-work.md` |
