# Tiêu chuẩn Workflow làm việc với AI Coding Assistant

> Doc tổng hợp: cấu trúc file, khái niệm nền tảng, quy trình làm việc, setup song song nhiều agent.
>
> ⚠️ Doc này là **convention chung do team định nghĩa**, không phải feature built-in của harness nào.
> Xem [harness-setup.md](./harness-setup.md) để kết nối vào Claude Code / Antigravity.

---

## 1. Nguyên tắc tiết kiệm token / quản lý context

- **Giới hạn phạm vi context**: chỉ đưa file/thư mục liên quan trực tiếp task, loại bỏ `node_modules`, `dist`, `build`, lock file khỏi context.
- **Chia nhỏ task, dọn context**: bắt đầu session mới khi chuyển task không liên quan.
  - Claude Code: dùng `/compact` khi context dài.
  - Antigravity: tự truncate khi context window gần đầy; bắt đầu conversation mới nếu cần reset hoàn toàn.
- **File định hướng dự án**: viết 1 file gốc chứa convention, kiến trúc, script chạy — đọc 1 lần thay vì giải thích lại mỗi session.
  - Claude Code: `CLAUDE.md` ở root project.
  - Antigravity: `AGENTS.md` ở `.agents/` hoặc `~/.gemini/config/`.
- **Chọn model phù hợp task**: việc đơn giản dùng model rẻ/nhanh, việc cần suy luận sâu mới dùng model mạnh.
- **Tránh lặp thông tin**: đưa diff/phần thay đổi thay vì paste lại cả file mỗi lần hỏi tiếp.

---

## 2. Ba thành phần cấu hình agent: Rule / Memory / Skill

| Thành phần | Mục đích | Khi nào load | Ví dụ nội dung |
|---|---|---|---|
| **Rules** | Luật bắt buộc (coding style, quy trình, giới hạn hành vi) | Load ngay đầu session, luôn nằm trong context | "Dùng TypeScript strict. Không dùng `any`. Mọi function public phải có JSDoc." |
| **Memory** | Trạng thái công việc — đã làm tới đâu, quyết định đã chốt | Load đầu session, cập nhật khi có việc mới hoàn thành | "✅ Auth flow xong (PR #42). Đang làm: payment. Quyết định: dùng Stripe." |
| **Skill** | Gói kiến thức chuyên biệt (progressive disclosure) | Chỉ load khi task khớp mô tả skill — không nhồi sẵn vào context | "Hướng dẫn viết DB migration: đặt tên file, rollback, checklist test." |

**⚠️ Lưu ý quan trọng về Memory:**

Memory **không phải feature built-in** của bất kỳ harness nào. Cơ chế memory native:
- **Claude Code**: `claude memory add "..."` → lưu ở `~/.claude/memory.json`, tự load mỗi session.
- **Antigravity**: Knowledge Items (`knowledge/` trong app data), tự load summary đầu session.

Nếu team dùng `MEMORY.md` custom, **phải ghi vào Rule** chỉ dẫn agent đọc/ghi file này. Agent không tự động biết.

**Cấu trúc folder gợi ý (convention chung — cần import/symlink vào path native):**
```
ai/
├── rules/              # convention, không được làm gì
│   └── coding-rules.md
├── context/            # log tiến độ, quyết định đã chốt (thay cho MEMORY.md)
│   └── project-brain.md
├── known-issues/       # bugs, limitations, tech debt
│   └── KNOWN_ISSUES.md
└── skills/
    ├── code-review/SKILL.md
    ├── db-migration/SKILL.md
    └── testing/SKILL.md
```

> Folder `ai/` **không được harness nào tự động nhận diện**. Xem [harness-setup.md](./harness-setup.md) để kết nối.

---

## 3. Khác biệt cơ chế đọc Rule/Skill giữa các harness

### Bảng so sánh chi tiết

| | Claude Code (CLI) | Antigravity (IDE, Google) |
|---|---|---|
| **File rule** | `CLAUDE.md` ở root project (hoặc `~/.claude/CLAUDE.md` global) | `AGENTS.md` ở `.agents/` (project) hoặc `~/.gemini/config/` (global) |
| **Folder skill** | `.claude/skills/<tên>/` | `.agents/skills/<tên>/SKILL.md` (project) hoặc `~/.gemini/config/skills/<tên>/SKILL.md` (global) |
| **Cách load rule** | Đọc toàn bộ `CLAUDE.md` ngay lúc start, nhồi vào context như system prompt | Tương tự, nhưng tách 2 scope: Global + Project — merge khi load |
| **Cách load skill** | Chỉ đọc metadata (tên + mô tả) lúc start → khi task khớp mô tả mới đọc toàn bộ | Cùng cơ chế "dormant until needed" — quét cả 2 scope (global + project) khi matching |
| **Kiến trúc** | Agent đơn, có thể gọi subagent (Task tool) trong cùng session | Multi-agent gốc: agent chính spawn dynamic subagent, mỗi subagent tự load skill riêng |
| **Memory native** | `claude memory add` → `~/.claude/memory.json` | Knowledge Items (app data), tự load summary đầu session |

### SKILL.md — Yêu cầu format

**Antigravity** bắt buộc YAML frontmatter trong `SKILL.md`:

```markdown
---
name: "Code Review"
description: "Hướng dẫn review code theo team convention"
---

# Nội dung skill...
```

Thiếu `name` + `description` trong frontmatter → agent **không nhận diện** được skill.

**Claude Code** cũng dùng YAML frontmatter tương tự, nhưng có thể linh hoạt hơn về format.

### Lưu ý chung

- 2 harness **không share config/session tự động**. Nếu dùng chung file rule/skill, phải import/symlink cả 2 bên về cùng 1 nguồn.
- Xem [harness-setup.md](./harness-setup.md) để setup cụ thể.

---

## 4. Bảng khái niệm nền tảng AI hiện nay

| Tầng | Khái niệm | Giải thích ngắn |
|---|---|---|
| Model | **Model / LLM** | Bộ trọng số đã train, chỉ dự đoán token tiếp theo |
| Model | **Context window** | Giới hạn token model "nhìn thấy" trong 1 lần gọi |
| Model | **Inference** | Hành động chạy model để sinh output |
| Prompting | **System prompt** | Chỉ dẫn nền định hình hành vi model |
| Prompting | **Context engineering** | Nghệ thuật sắp xếp thông tin nhồi vào context window |
| Agent | **Tool use / Function calling** | Model output lời gọi hàm có cấu trúc để hệ thống thực thi |
| Agent | **Agent** | Model + vòng lặp tự trị: gọi tool → nhận kết quả → tự quyết bước tiếp |
| Agent | **Agentic loop** | Vòng lặp: nhận task → suy luận → gọi tool → nhận kết quả → lặp lại cho đến khi xong |
| Agent | **Harness** | Lớp hạ tầng bọc quanh model, quản lý vòng lặp/tool/context — biến model thành agent (VD: Claude Code, Antigravity) |
| Agent | **Human-in-the-loop** | Điểm bắt buộc có người xác nhận trước khi agent tiếp tục — giảm rủi ro hành động sai |
| Agent | **Planning / Plan mode** | Agent tạo kế hoạch và chờ duyệt trước khi thực thi — pattern quan trọng giảm rủi ro |
| Agent | **Subagent / Orchestration** | Agent chính tách task cho các agent con chạy độc lập, tổng hợp kết quả |
| Integration | **MCP (Model Context Protocol)** | Chuẩn mở kết nối agent với tool/data ngoài (như "USB-C cho AI agent") |
| Integration | **RAG** | Tìm thông tin liên quan rồi nhét vào context trước khi model trả lời |
| Integration | **Code Index / Embeddings** | Cơ chế index codebase để agent tìm code liên quan nhanh hơn grep |
| Memory | **Short-term memory** | Chính là context window trong 1 phiên |
| Memory | **Long-term memory** | Lưu trữ ngoài (file/DB) để nhớ giữa các phiên |
| Nâng cao | **Skill (progressive disclosure)** | Kiến thức chỉ load khi cần, tránh nhồi hết từ đầu |
| Nâng cao | **Guardrail** | Lớp kiểm soát hành vi nguy hiểm/sai lệch của agent |
| Nâng cao | **Sandbox** | Môi trường cô lập để agent chạy code an toàn |

**Tóm gọn quan hệ**: Model là bộ não → Harness biến bộ não thành agent hành động → MCP là giác quan/tay chân kết nối ra ngoài → Memory là ký ức dài hạn → Skill là sách tra cứu chỉ mở khi cần.

---

## 5. Setup chạy song song nhiều agent (Claude Code + Antigravity)

### Nguyên tắc nền: Git Worktree
Mỗi agent cần 1 thư mục vật lý riêng (share chung `.git`) để tránh conflict file khi 2 agent cùng động vào 1 working directory.

```bash
cd ~/projects/my-app
git worktree add ../my-app-claude -b feature/backend origin/main
git worktree add ../my-app-antigravity -b feature/frontend origin/main
```

### Chạy agent trong từng worktree

**Claude Code:**
```bash
cd ../my-app-claude
claude -p "task mô tả"    # -p = headless/pipe mode
```
> ⚠️ Worktree phải **tạo thủ công** bằng `git worktree add` trước. Claude Code không tự tạo worktree.

**Antigravity:**
- Mở `File → New Window → Open Folder` trỏ vào đúng thư mục worktree.
- Hoặc Remote-SSH nếu chạy trên VPS.

### Phân việc theo thế mạnh
| Việc | Giao cho |
|---|---|
| Backend, API, automation, CI/CD | Claude Code (scriptable, headless `-p`) |
| UI/UX, task cần xem trực quan, demo non-dev | Antigravity (Activity Feed, preview tích hợp) |

### Chiến lược merge khi song song

- **Phân chia module rõ ràng** — không chỉ "backend/frontend" mà cụ thể đến level file/folder, giảm thiểu conflict.
- **Shared files** (`package.json`, shared types, config) — quy ước 1 agent chịu trách nhiệm chính, agent kia không sửa trực tiếp.
- **Merge vào integration branch** trước (không merge thẳng vào `main`), resolve conflict rồi mới merge tiếp.
- **Review bằng** `git diff main..feature-branch` trước mỗi lần merge.

### Chạy trên laptop (không phải VPS)
- **Máy ≥16GB RAM**: song song OK, giới hạn 2 agent active cùng lúc.
- **Máy yếu hơn**: nên chạy tuần tự, thử quen tay trước khi song song.
- Rủi ro thực tế lớn hơn RAM: **rate limit/quota** bị đốt nhanh gấp đôi, và **attention của người review** bị chia đôi — dễ bỏ sót lỗi hơn.

### MCP Server dùng chung

> "Dùng chung" = **cùng 1 server process**, nhưng **khai báo riêng ở config mỗi harness**.

| Harness | File config MCP |
|---|---|
| Claude Code | `.claude/mcp.json` (project) hoặc `~/.claude/mcp.json` (global) |
| Antigravity | Settings IDE hoặc config file riêng |

Cả 2 file cấu hình trỏ về cùng 1 MCP server address/port. Không cần chạy 2 instance server.

### Checklist tránh lỗi
- ❌ Không symlink `node_modules` giữa các worktree — dùng `pnpm` store chung để tiết kiệm disk an toàn.
- ❌ Không mở cùng 1 worktree ở 2 cửa sổ IDE — lock file sẽ conflict.
- ✅ Giới hạn 3-5 worktree cùng lúc (VPS) / 2 worktree (laptop).
- ✅ Commit thường xuyên theo milestone nhỏ.
- ✅ Review bằng `git diff main..feature-branch` trước khi merge.

---

## 6. Cấu trúc Docs hệ thống (living documentation)

```
docs/
├── SYSTEM_OVERVIEW.md          # bức tranh tổng, ngắn gọn — luôn load
├── features/
│   ├── auth.md                 # chi tiết flow từng feature — chỉ load khi cần
│   ├── payment.md
│   └── order.md
└── CHANGELOG.md                # lịch sử update (dùng Keep a Changelog format)
```

**`SYSTEM_OVERVIEW.md`** (giữ ngắn, <100 dòng): kiến trúc tổng, bảng danh sách feature + trạng thái + API chính, quy tắc chung.

**`features/<tên>.md`** (chi tiết, chỉ load khi liên quan): data liên quan, flow từng bước, checklist test đã pass, quyết định kỹ thuật đã chốt.

**`CHANGELOG.md`** — dùng format [Keep a Changelog](https://keepachangelog.com/):
```markdown
## [Unreleased]
### Added
- Feature X: mô tả ngắn

### Changed
- Thay đổi Y

## [1.0.0] - 2025-01-15
### Added
- Initial release
```

**Lý do chia nhỏ**: áp dụng progressive disclosure — agent chỉ đọc overview (luôn nhỏ) + đúng 1-2 file feature liên quan, giữ token tiêu thụ ổn định khi hệ thống lớn dần, thay vì phình to theo thời gian.

---

## 7. Quy trình làm việc chuẩn (Docs → Plan → Code → Test → Confirm → Push)

```
1. Đọc docs & rule
   → SYSTEM_OVERVIEW.md + CLAUDE.md / AGENTS.md

2. Hỏi data/file liên quan
   → Xác nhận với dev trước khi code

3. ★ Lập kế hoạch implementation (với task phức tạp)
   → Tạo plan → Dev duyệt trước khi code

4. Code chức năng
   → Theo rule đã đọc

5. Test unit + API
   → Tự chạy, tự kiểm tra

6. Test đạt?
   ├─ Không đạt → quay lại bước 4 (Code chức năng)
   └─ Đạt → tiếp tục

7. Dev kiểm tra & confirm
   → Review thủ công (bắt buộc có con người)

8. Update docs
   → Feature file + SYSTEM_OVERVIEW.md

9. Push git
```

### Lưu ý khi viết thành rule cho agent

- **Bước 2**: giới hạn hỏi 1 lần đầu task; nếu thiếu thông tin giữa chừng, agent nên tự suy luận hợp lý + ghi rõ giả định, tránh hỏi lặp lại nhiều vòng.
- **Bước 3 (MỚI)**: Cả Claude Code (plan mode) và Antigravity (planning mode) đều hỗ trợ tạo plan trước khi code. Phê duyệt kế hoạch trước giảm rủi ro agent đi sai hướng lớn, tiết kiệm token so với revert. Có thể skip bước này cho task đơn giản.
- **Bước 6**: định nghĩa rõ "đạt" trong rule (coverage tối thiểu bao nhiêu %, hay chỉ cần pass hết case đã viết) để agent đánh giá nhất quán.
- **Bước 7**: điểm **human-in-the-loop** bắt buộc — không để agent tự động push sau khi tự test pass, vì unit/API test không bắt được hết vấn đề logic nghiệp vụ.
- **Bước 8**: tách riêng khỏi bước code, ghi rõ trong rule: *"Không được coi task hoàn thành nếu chưa update file docs tương ứng."*

---

## 8. Khi nào KHÔNG nên dùng AI agent

- **Task bảo mật cao** (xử lý secret, crypto logic, auth flow nhạy cảm) — AI có thể tạo code trông đúng nhưng có vulnerability. Cần review kỹ hơn bình thường.
- **Task chưa có spec rõ** — agent sẽ hallucinate requirement, tốn token vô ích. Viết spec trước, code sau.
- **Refactor lớn cross-cutting** — agent hay mất context giữa chừng, kết quả inconsistent giữa các file. Nên chia thành nhiều task nhỏ hơn.
- **Debug production issue phức tạp** — agent không có access vào logs/metrics runtime. Cần người phân tích trước, rồi mới giao fix cụ thể cho agent.

---

## 9. Checklist review nhanh (dùng khi audit lại setup)

- [ ] Đã có `CLAUDE.md` / `AGENTS.md` tương ứng ở đúng path native, ngắn gọn, không lặp thông tin
- [ ] Đã tách skill riêng theo domain, dùng progressive disclosure, có YAML frontmatter (`name` + `description`)
- [ ] Đã có `SYSTEM_OVERVIEW.md` + `docs/features/*.md` tách nhỏ
- [ ] Quy trình 9 bước (bao gồm Planning) đã được ghi rõ trong rule cho agent
- [ ] Có bước dev confirm (human-in-the-loop) bắt buộc trước khi push git
- [ ] Nếu chạy song song nhiều agent: đã setup git worktree, không dùng chung working directory
- [ ] MCP server (nếu có) đã khai báo ở config riêng mỗi harness, cùng trỏ về 1 server process
- [ ] Nếu dùng folder `ai/` custom: đã có symlink/import vào path native của harness đang dùng
