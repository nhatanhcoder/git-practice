# HANDOFF.md — Ghi chú cuối phiên

> Đọc mục **mới nhất** (trên cùng) đầu tiên khi bắt đầu 1 phiên mới.
> Khác với `docs/roadmap/SPRINT_PLAN.md` (checklist task theo sprint) và `docs/shared/decisions/` (ADR dài hạn) — file này chỉ chứa thứ **tạm thời, dễ quên**: đang dở ở đâu, vì sao dở, quyết định tạm nào cần giữ nguyên.
>
> Giữ tối đa 5 mục gần nhất — cũ hơn xoá bớt (lịch sử xa đã có trong git log + ADR).
> 2+ agent chạy song song: mỗi agent thêm mục riêng, ghi rõ tên trong tiêu đề.

---

## Template

```
## [YYYY-MM-DD] — <việc đang làm> — <Claude Code / Antigravity / thủ công>

**Đã xong**:
-

**Đang dở**:
-

**Quyết định tạm cần giữ nguyên** (nếu có):
-

**Blocker / cần hỏi lại**:
-

**Tiếp theo nên làm**:
-
```

---

## [2026-07-19] — Setup entry point cho AI agent — thủ công

**Đã xong**:
- Thêm `CLAUDE.md` + `AGENTS.md` ở root, trỏ vào `ai/context/project-brain.md` (trước đó project-brain.md có sẵn nhưng không nằm ở vị trí Claude Code/Antigravity tự tìm)
- Archive 3 file lỗi thời (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) vào `archive/`
- Confirm HSK level = **1–9**, khớp toàn bộ `docs/entities/`, `GLOSSARY.md`, `DATABASE_SCHEMA.md` — không đổi gì
- Bổ sung link `ai/rules/`, `ai/known-issues/` còn thiếu vào bảng Key Docs trong `project-brain.md`

**Đang dở**:
- Chưa code gì — dự án đang ở trạng thái "docs xong, code chưa bắt đầu" (đúng như project-brain.md ghi)

**Tiếp theo nên làm**:
- Bắt đầu Sprint 0 theo `docs/roadmap/SPRINT_PLAN.md`
