## [2026-08-19] — Backend module specs cho toàn bộ Admin — claude (Cowork) — branch `chore/fast-verify-rule`

**Done**:
- `docs/api/modules/` — 8 module spec + `_INDEX.md` + `_TEMPLATE.md`, ~3.900 dòng
- `docs/BACKEND_PLAN.md` — kế hoạch backend độc lập cho người mới, qua 3 vòng phản biện
- `ai/rules/working-rules.md` — Skill Rules · FE iterate · fast verify lane · sơ đồ 8 bước
  có vòng lặp 5↔6 và tách `/design-promote` ra ngoài
- `AGENTS.md` + `CLAUDE.md` — viết lại Skill precedence (giống hệt nhau)
- `.agents/skills/design-promote/` + `.agents/skills/build-screen/` — 2 skill mới
- `root-design-fe.md` + `pages/_INDEX.md` + 3 spec — bootstrap `design_baseline: v1`
- `KNOWN_ISSUES.md` — 6 issue mới: API-002/003/004, DOC-005/006/007
- `PROGRESS.md` — sửa doc drift 5 quyết định + thêm mục Backend module spec

- **Vòng 2 (sau khi người dùng hỏi "ko update handoff các thứ à?")**:
  - `PROGRESS.md` · `HANDOFF.md` · `KNOWN_ISSUES.md` (6 issue mới) · session file này ·
    `AGENTS.md` + `CLAUDE.md` trỏ tới `docs/api/modules/`
  - Phát hiện **doc drift**: 5 quyết định nghiệp vụ đã duyệt 2026-08-16 trong HANDOFF nhưng
    PROGRESS vẫn ghi "chưa chốt" suốt 3 ngày
- **Vòng 3 (sau khi người dùng hỏi rule thiếu gì)**: sửa chính cái rule đã bị bỏ qua —
  bảng "Hai loại task" trong § The flow · session file vào DoD mục 4 · index bộ doc vào mục 5 ·
  CI step `Record step was not skipped` · khôi phục rule fast-verify đã mất

**In progress** (và vì sao chưa xong):
- `PR_BODY.md` nằm ở root repo, PR **chưa được tạo** — `device_bash` phía máy người dùng
  chết giữa session, không chạy được git từ agent

**Contract/temporary decisions to preserve**:
- Template module spec = **16 mục cố định**, mục 4 (invariant) và mục 15 (test matrix) là
  một cặp — mọi invariant phải có test. Đây là invariant gate, thay coverage %.
- Spec **không tự quyết** khi tài liệu nguồn mâu thuẫn — ghi nguyên trạng vào mục 16.
- Không bịa mã lỗi. Nhánh lỗi thiếu mã đánh ⛔ ở mục 9.
- Module chia theo **transaction boundary**, không theo bảng.
- Fast verify lane là mặc định; full lane bắt buộc cho auth · tiền · component dùng chung ·
  production/migration.

**Needs from the other lane**: —

**Blocker / needs follow-up**:
- Biểu diễn tiền (ADR-010) chưa từng được hỏi — chặn module 05, 06
- SCOPE-01 Classes/Enrollment — chặn module 03, 04, 05
- API-002 hai công thức đọc rate — chặn mọi phép tính tiền
- 5 quyết định 16/08 chưa thành ADR
- Working tree còn nhiều thay đổi chưa commit, chưa tách branch
- **Bài học**: rule fast-verify mất vì viết xong không commit ngay. Commit từng phần, đừng
  gom cuối session.

**Next steps**:
1. ADR-010 → ADR-014
2. Chốt SCOPE-01 và API-002
3. Phase 1 hạ tầng, rồi Phase 2 Auth (`01-auth.md` là module duy nhất `accepted`)
