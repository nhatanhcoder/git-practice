# 📚 Lesson Bank

> Cấu trúc section-based cho bài học (Lesson). Xem ADR: [003-lesson-bank-muc1-embedded.md](../shared/decisions/003-lesson-bank-muc1-embedded.md)

---

## Lesson Structure (Mức 1)

```
Lesson {
  _id: ObjectId,
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6,
  title: string,
  createdBy: string,     // teacher userId (PostgreSQL UUID)
  sections: Section[],
  createdAt: Date,
  updatedAt: Date
}

Section {
  type: "warmup" | "vocab" | "grammar" | "practice" | "wrapup",
  title: string,
  content?: string,      // markdown text
  items?: VocabItem[]    // cho section type="vocab"
}

VocabItem {
  chinese: string,
  pinyin: string,
  meaning: string,
  exampleSentence?: string
}
```

---

## Section Types

| Type | Mục đích | Content Format |
|------|---------|----------------|
| `warmup` | Khởi động, kích hoạt prior knowledge | Markdown text / câu hỏi mở |
| `vocab` | Từ vựng mới trong bài | Array of VocabItem |
| `grammar` | Điểm ngữ pháp chính | Markdown với ví dụ |
| `practice` | Bài tập luyện tập | Markdown, link tới Questions |
| `wrapup` | Tổng kết, homework hint | Markdown text |

---

## Upgrade Path (Mức 3)

- Interactive exercises trong section `practice`
- Video embedding
- Audio recording submission
- Progress tracking per section

---

## Liên quan

- [ENTITY_LESSON.md](../entities/mongodb/ENTITY_LESSON.md)
- [ADR-003](../shared/decisions/003-lesson-bank-muc1-embedded.md)
