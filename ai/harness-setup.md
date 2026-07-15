# Harness Setup — Kết nối folder `ai/` vào Claude Code & Antigravity

> Folder `ai/` là convention riêng của team, KHÔNG được harness nào tự động đọc.
> File này hướng dẫn kết nối vào path native để agent nhận diện đúng.

---

## Tổng quan path native

| Harness | File Rule (tự động load) | Folder Skill (progressive disclosure) |
|---|---|---|
| **Claude Code** | `CLAUDE.md` ở root project | `.claude/skills/<tên>/` |
| | `~/.claude/CLAUDE.md` (global) | |
| **Antigravity** | `.agents/AGENTS.md` (project) | `.agents/skills/<tên>/SKILL.md` (project) |
| | `~/.gemini/config/AGENTS.md` (global) | `~/.gemini/config/skills/<tên>/SKILL.md` (global) |

---

## Setup cho Claude Code

### 1. Tạo `CLAUDE.md` ở root project

```markdown
# Project Rules

> Đọc file rule chi tiết: ai/rules/coding-rules.md
> Đọc context dự án: ai/context/project-brain.md
> Đọc known issues: ai/known-issues/KNOWN_ISSUES.md
> Đọc workflow chuẩn: ai/workflow-standard.md

## Quick Rules
- Luôn đọc ai/context/project-brain.md đầu session để nắm context
- Sau khi hoàn thành task, update ai/context/project-brain.md (current status)
- Không push code khi chưa có dev confirm
- Không coi task hoàn thành nếu chưa update docs tương ứng
```

### 2. Symlink skills (nếu có)

```bash
# Từ root project
mkdir -p .claude/skills

# Symlink từng skill
# Windows (PowerShell, chạy as Admin):
New-Item -ItemType SymbolicLink -Path ".claude/skills/code-review" -Target "ai/skills/code-review"

# Linux/Mac:
ln -s ../../ai/skills/code-review .claude/skills/code-review
```

### 3. Memory native (tùy chọn)

```bash
# Thêm memory persistent qua CLI
claude memory add "Luôn đọc ai/context/project-brain.md đầu mỗi session"
claude memory add "Project: HSK Learning Platform, Stack: Next.js 14 + NestJS + PostgreSQL + MongoDB"
```

---

## Setup cho Antigravity

### 1. Tạo `.agents/AGENTS.md` ở root project

```markdown
# Project Rules

> Đọc file rule chi tiết: ai/rules/coding-rules.md
> Đọc context dự án: ai/context/project-brain.md
> Đọc known issues: ai/known-issues/KNOWN_ISSUES.md
> Đọc workflow chuẩn: ai/workflow-standard.md

## Quick Rules
- Luôn đọc ai/context/project-brain.md đầu session để nắm context
- Sau khi hoàn thành task, update ai/context/project-brain.md (current status)
- Không push code khi chưa có dev confirm
- Không coi task hoàn thành nếu chưa update docs tương ứng
```

### 2. Tạo skills với YAML frontmatter

```bash
mkdir -p .agents/skills
```

Mỗi skill **bắt buộc** có YAML frontmatter:

```markdown
---
name: "Code Review"
description: "Hướng dẫn review code theo team convention, checklist quality gates"
---

# Nội dung skill ở đây...
```

Có 2 cách tổ chức:

**Cách A — Symlink** (tránh duplicate, khuyên dùng):
```bash
# Windows (PowerShell, as Admin):
New-Item -ItemType SymbolicLink -Path ".agents/skills/code-review" -Target "ai/skills/code-review"

# Linux/Mac:
ln -s ../../ai/skills/code-review .agents/skills/code-review
```

**Cách B — Dùng `skills.json`** (nếu symlink gây vấn đề trên Windows):

Tạo file `.agents/skills.json`:
```json
{
  "entries": [
    { "path": "../../ai/skills" }
  ]
}
```

### 3. Knowledge Items (thay cho MEMORY.md)

Antigravity quản lý memory qua Knowledge Items tự động. Không cần tạo file thủ công — agent sẽ tạo knowledge items khi phát hiện pattern quan trọng trong quá trình làm việc.

---

## Setup MCP Server dùng chung

Nếu dùng MCP server (VD: database, search, custom tools):

### Claude Code — `.claude/mcp.json`
```json
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["./mcp-server/index.js"],
      "env": {}
    }
  }
}
```

### Antigravity — Settings IDE
Cấu hình trong IDE Settings hoặc file config tương ứng, trỏ về **cùng 1 server address/command**.

> ⚠️ Hai file config **riêng biệt**, cùng trỏ về 1 server. Không cần chạy 2 instance.

---

## Checklist sau khi setup

- [ ] `CLAUDE.md` hoặc `.agents/AGENTS.md` tồn tại ở root, trỏ đúng về các file trong `ai/`
- [ ] Skills đã được symlink hoặc khai báo qua `skills.json`
- [ ] Mỗi `SKILL.md` có YAML frontmatter với `name` + `description`
- [ ] Test: mở session mới, hỏi agent "đọc project context" — verify agent tìm đúng file
- [ ] MCP config (nếu có) đã khai báo ở cả 2 harness
