# AI_CHAT_LOG.md — Log làm việc với AI chat (Claude, ChatGPT, Gemini...)

> Khác với **HANDOFF.md** (dành cho coding agent có quyền đọc/sửa repo — Claude Code, Antigravity), file này dùng để log các phiên **chat thuần** (Claude.ai, ChatGPT, Gemini, hoặc chat của Claude Code/Antigravity nhưng không đụng code) — nơi bạn brainstorm ý tưởng, hỏi tư vấn kiến trúc, nhờ debug logic, so sánh giải pháp...
>
> **Vấn đề file này giải quyết**: các phiên chat kiểu này *không tự động* biết về nhau. Hỏi Claude.ai hôm nay, hỏi ChatGPT hôm sau về cùng 1 vấn đề mà không ghi lại → dễ nhận 2 câu trả lời khác nhau và không biết cái nào đã áp dụng, hoặc lặp lại câu hỏi đã có đáp án.
>
> **Nguyên tắc quan trọng nhất**: mọi kết luận có giá trị lâu dài từ đây phải được **chuyển vào DECISIONS.md / PROGRESS.md** — bản thân AI chat (Claude.ai, ChatGPT...) không đọc được file này ở phiên sau nếu không có tính năng nhớ liên tục, nên đừng để quyết định chỉ nằm im ở đây.

---

## Cách ghi 1 dòng log

| Ngày | Tool | Chủ đề hỏi | Kết luận / quyết định rút ra | Đã chuyển vào DECISIONS/PROGRESS? | Link (nếu share được) |
|---|---|---|---|---|---|
| 2026-07-18 | Claude.ai | Thiết kế bộ file tracking cho dự án | Tạo AGENTS.md, CLAUDE.md, DECISIONS.md, PROGRESS.md, HANDOFF.md, AI_CHAT_LOG.md | ✅ (chính các file này) | — |
| | | | | | |

**Cách điền cột "Tool"**: ghi rõ tên + phiên bản nếu nhớ được (vd `Claude Opus 4.8`, `ChatGPT-5.2`, `Gemini 3 Pro`) — vì các model khác nhau, câu trả lời có thể khác nhau, hữu ích khi cần đối chiếu lại sau này.

**Cách điền cột "Đã chuyển vào DECISIONS/PROGRESS?"**:
- `✅` + số mục — vd `✅ DECISIONS #7` nếu đã ghi thành quyết định chính thức
- `🟡 Chưa` — nếu kết luận này còn cần suy nghĩ thêm/chưa đủ tin cậy để chốt, nhưng vẫn đáng lưu lại để không quên mất
- `➖ Không cần` — nếu chỉ là câu hỏi kiến thức chung, không ảnh hưởng tới quyết định dự án

---

## Khi nào NÊN log vào đây

- Hỏi so sánh giải pháp kiến trúc/thư viện (vd "NestJS Guard vs Interceptor cho rate limit AI" hỏi ở nhiều tool để đối chiếu)
- Nhờ 1 AI review lại quyết định của AI khác (vd đưa DECISIONS.md cho ChatGPT/Gemini review chéo)
- Brainstorm tính năng mới chưa có trong features.md/PROJECT_KNOWLEDGE.md
- Debug 1 lỗi logic phức tạp qua chat (không phải coding agent tự sửa file)

## Khi nào KHÔNG cần log

- Câu hỏi kiến thức chung, không đặc thù cho dự án này (vd "cú pháp Prisma migration là gì")
- Phiên làm việc của coding agent có quyền sửa file trực tiếp → dùng HANDOFF.md thay vì file này
