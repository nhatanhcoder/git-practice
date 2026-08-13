# ADR-003: Lesson Bank Level 1 — Embedded in MongoDB

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

The platform needs to support "Lessons" — units of teaching content structured into sections (warmup, vocab, grammar, practice, wrapup). We had to decide where to store them and at what level of complexity (Level 1 = simple, Level 3 = interactive exercises).

## Decision

**Level 1 — embedded document in MongoDB:**
- A Lesson is a single MongoDB document with an array of sections
- Each section has: `type`, `title`, `content` (markdown or rich text)
- No interactive exercises at Level 1
- Teachers author a Lesson the same way they would author an ordinary document

> Example content below is left in Vietnamese — it is sample end-user data for a
> Vietnamese-language audience, not documentation prose.

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
- Flexible schema — no migration needed when a new section type is added
- Fetching one document returns the entire lesson
- Fits the MongoDB Atlas free tier (512MB)

**Negative:**
- No interactive exercises (text/markdown only)
- No version control over lesson content
- Full-text search across sections is awkward once a document grows large

## Alternatives Considered

| Option | Why it was not chosen |
|--------|-----------------|
| PostgreSQL JSONB | Less flexible, migrations are more complex |
| Level 3 (interactive) | Too complex for the MVP; deferred to a later sprint |
