# 📝 QUESTION_TYPES.md — HSK Question Types

> **Nguồn**: Chuẩn thi HSK mới (HSK 3.0, 2021)  
> **Storage**: MongoDB (flexible schema)

---

## 1. Tổng quan Question Types

| Skill | Sub-type | Mô tả | Auto-grade |
|-------|---------|-------|-----------|
| **Listening** | `listen_mcq` | Nghe và chọn đáp án | ✅ |
| **Listening** | `listen_true_false` | Nghe và phán đoán đúng/sai | ✅ |
| **Listening** | `listen_dialogue_mcq` | Nghe hội thoại, chọn đáp án | ✅ |
| **Reading** | `read_mcq` | Đọc đoạn văn, chọn đáp án | ✅ |
| **Reading** | `read_true_false` | Đọc và phán đoán | ✅ |
| **Reading** | `read_gap_fill` | Điền từ vào chỗ trống (word bank) | ✅ |
| **Reading** | `read_sentence_order` | Sắp xếp câu | ✅ (array comparison) |
| **Writing** | `write_short` | Viết câu ngắn (1-2 câu) | ❌ Manual |
| **Writing** | `write_paragraph` | Viết đoạn văn | ❌ Manual |

---

## 2. MongoDB Schema theo Type

### 2.1 Listening MCQ (`listen_mcq`)

```json
{
  "_id": "ObjectId",
  "hskLevel": 3,
  "skill": "listening",
  "subType": "listen_mcq",
  "content": {
    "instruction": "请听下面的对话，然后选出正确答案",
    "audioUrl": "https://cloudinary.com/hsk-platform/audio/q001.mp3",
    "audioDuration": 45,
    "transcript": "男：你好，请问图书馆怎么走？..."  // Hidden from student
  },
  "options": [
    { "key": "A", "text": "向左转" },
    { "key": "B", "text": "向右转" },
    { "key": "C", "text": "直走" },
    { "key": "D", "text": "乘电梯" }
  ],
  "correctAnswer": "C",
  "explanation": "对话中男生说'一直走到红绿灯'",
  "pointValue": 1,
  "createdBy": "user-uuid",
  "tags": ["directions", "hsk3-vocab"]
}
```

### 2.2 Reading with Passage (`read_mcq`)

```json
{
  "hskLevel": 4,
  "skill": "reading",
  "subType": "read_mcq",
  "content": {
    "passage": "随着科技的发展，手机已经成为人们生活中不可缺少的工具...",
    "question": "根据这段话，手机的主要作用是什么？"
  },
  "options": [
    { "key": "A", "text": "娱乐工具" },
    { "key": "B", "text": "生活必需品" },
    { "key": "C", "text": "通讯工具" },
    { "key": "D", "text": "学习工具" }
  ],
  "correctAnswer": "B",
  "explanation": "...",
  "pointValue": 1
}
```

### 2.3 Gap Fill (`read_gap_fill`)

```json
{
  "hskLevel": 2,
  "skill": "reading",
  "subType": "read_gap_fill",
  "content": {
    "passage": "我每天早上_____点起床，然后_____早饭。",
    "blanks": ["blank_1", "blank_2"],
    "wordBank": ["吃", "七", "喝", "八", "做"]
  },
  "correctAnswer": {
    "blank_1": "七",
    "blank_2": "吃"
  },
  "pointValue": 2
}
```

### 2.4 Sentence Ordering (`read_sentence_order`)

```json
{
  "hskLevel": 3,
  "skill": "reading",
  "subType": "read_sentence_order",
  "content": {
    "instruction": "请排列下面的句子，使它们成为一段完整的话",
    "sentences": [
      { "id": "A", "text": "所以我决定减肥" },
      { "id": "B", "text": "医生说我太胖了" },
      { "id": "C", "text": "我去体检了" },
      { "id": "D", "text": "现在我每天跑步" }
    ]
  },
  "correctAnswer": ["C", "B", "A", "D"],  // Thứ tự đúng
  "pointValue": 2
}
```

### 2.5 Writing - Short (`write_short`)

```json
{
  "hskLevel": 2,
  "skill": "writing",
  "subType": "write_short",
  "content": {
    "instruction": "根据图片写一句话描述你看到的内容",
    "imageUrl": "https://cloudinary.com/.../image.jpg",  // Optional
    "prompt": "请用'因为...所以...'写一个句子"
  },
  "correctAnswer": null,  // No auto-grade
  "maxScore": 5,
  "rubric": "词汇准确(2分), 语法正确(2分), 表达自然(1分)"
}
```

### 2.6 Writing - Paragraph (`write_paragraph`)

```json
{
  "hskLevel": 4,
  "skill": "writing",
  "subType": "write_paragraph",
  "content": {
    "instruction": "请写一段80-100字的短文",
    "prompt": "介绍你最喜欢的节日，包括：时间、活动、你的感受",
    "keywords": ["节日", "传统", "家人", "快乐"]  // Gợi ý từ cần dùng
  },
  "correctAnswer": null,
  "maxScore": 10,
  "rubric": "内容完整(3分), 词汇丰富(3分), 语法正确(2分), 字数符合(2分)"
}
```

---

## 3. Frontend Rendering theo Type

| subType | Component | Input type |
|---------|-----------|-----------|
| `listen_mcq` | `ListeningQuestion` | Radio buttons + Audio player |
| `listen_true_false` | `TrueFalseQuestion` | True/False buttons |
| `read_mcq` | `ReadingQuestion` | Radio buttons |
| `read_true_false` | `TrueFalseQuestion` | True/False buttons |
| `read_gap_fill` | `GapFillQuestion` | Drag-and-drop hoặc dropdown |
| `read_sentence_order` | `SentenceOrderQuestion` | Drag-and-drop |
| `write_short` | `WritingQuestion` | Textarea (max 200 chars) |
| `write_paragraph` | `WritingQuestion` | Textarea (max 500 chars) |

---

## 4. Auto-grade Logic per Type

```typescript
// attempts.service.ts
function autoGrade(question: Question, studentAnswer: any): boolean | null {
  switch (question.subType) {
    case 'listen_mcq':
    case 'listen_true_false':
    case 'read_mcq':
    case 'read_true_false':
      return studentAnswer === question.correctAnswer;

    case 'read_gap_fill':
      // correctAnswer là object: { blank_1: "七", blank_2: "吃" }
      return JSON.stringify(studentAnswer) === JSON.stringify(question.correctAnswer);

    case 'read_sentence_order':
      // correctAnswer là array: ["C", "B", "A", "D"]
      return Array.isArray(studentAnswer) &&
        studentAnswer.join('') === question.correctAnswer.join('');

    case 'write_short':
    case 'write_paragraph':
      return null;  // Manual grading required

    default:
      return null;
  }
}
```

---

## 5. Teacher Create Question Flow

```
Teacher mở form tạo câu hỏi
│
├── 1. Chọn Skill: [Listening] [Reading] [Writing]
│
├── 2. Chọn Sub-type (tùy theo skill):
│   Listening → [MCQ] [True/False] [Dialogue MCQ]
│   Reading   → [MCQ] [True/False] [Gap Fill] [Sentence Order]
│   Writing   → [Short] [Paragraph]
│
├── 3. Chọn HSK Level: [1] [2] [3] [4] [5] [6]
│
└── 4. Form fields thay đổi theo sub-type:
    listen_mcq:
    - Upload audio file (Cloudinary)
    - Nhập transcript (hidden)
    - Nhập 4 options A/B/C/D
    - Chọn correct answer
    
    write_paragraph:
    - Nhập instruction
    - Nhập prompt
    - Nhập rubric
    - Chọn maxScore (5 hoặc 10)
```
