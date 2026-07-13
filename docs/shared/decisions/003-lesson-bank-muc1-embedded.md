# ADR-003: Lesson Bank Mức 1 — Embedded in MongoDB

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

Platform cần hỗ trợ "Lesson" — đơn vị nội dung bài học có cấu trúc section (warmup, vocab, grammar, practice, wrapup). Cần quyết định: lưu ở đâu và ở mức độ phức tạp nào (Mức 1 = simple, Mức 3 = interactive exercises).

## Decision

**Mức 1 — Embedded document trong MongoDB:**
- Lesson là một MongoDB document với array of sections
- Mỗi section có: `type`, `title`, `content` (markdown hoặc rich text)
- Không có interactive exercises ở Mức 1
- Teacher tạo Lesson như tạo document thông thường

```json
{
  "hskLevel": 3,
  "title": "Bài 5: Đặt đồ ăn",
  "sections": [
    { "type": "warmup",    "title": "Khởi động", "content": "..." },
    { "type": "vocab",     "title": "Từ vựng",   "items": [...] },
    { "type": "grammar",   "title": "Ngữ pháp",  "content": "..." },
    { "type": "practice",  "title": "Luyện tập", "content": "..." },
    { "type": "wrapup",    "title": "Tổng kết",  "content": "..." }
  ]
}
```

## Consequences

**Positive:**
- Schema linh hoạt, không cần migration khi thêm section type
- Fetch 1 document = đủ toàn bộ nội dung bài học
- Phù hợp free tier MongoDB Atlas (512MB)

**Negative:**
- Không có interactive exercises (chỉ text/markdown)
- Không version control nội dung lesson
- Khó search full-text qua sections nếu document lớn

## Alternatives Considered

| Option | Lý do không chọn |
|--------|-----------------|
| PostgreSQL JSONB | Kém linh hoạt hơn, migration phức tạp |
| Mức 3 (interactive) | Quá phức tạp cho MVP, để sprint sau |
