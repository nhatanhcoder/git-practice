# 📚 Lesson Bank

> Section-based structure for a Lesson. See the ADR: [003-lesson-bank-muc1-embedded.md](../shared/decisions/003-lesson-bank-muc1-embedded.md)

---

## Lesson Structure (Level 1)

```
Lesson {
  _id: ObjectId,
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
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
  items?: VocabItem[]    // for sections with type="vocab"
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

| Type | Purpose | Content Format |
|------|---------|----------------|
| `warmup` | Warm up, activate prior knowledge | Markdown text / open questions |
| `vocab` | New vocabulary in the lesson | Array of VocabItem |
| `grammar` | The main grammar point | Markdown with examples |
| `practice` | Practice exercises | Markdown, links to Questions |
| `wrapup` | Recap, homework hints | Markdown text |

---

## Upgrade Path (Level 3)

- Interactive exercises inside the `practice` section
- Video embedding
- Audio recording submissions
- Per-section progress tracking

---

## Related

- [ENTITY_LESSON.md](../entities/mongodb/ENTITY_LESSON.md)
- [ADR-003](../shared/decisions/003-lesson-bank-muc1-embedded.md)
