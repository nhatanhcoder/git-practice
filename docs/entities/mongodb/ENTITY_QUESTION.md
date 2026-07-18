# ENTITY_QUESTION

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  skill: 'listening' | 'reading' | 'writing',
  subType: 
    // Listening
    | 'multiple_choice_single' | 'true_false_not_given' | 'short_answer'
    // Reading
    | 'multiple_choice_multi' | 'fill_in_blank' | 'sentence_ordering' | 'matching'
    // Writing
    | 'sentence_construction' | 'essay',
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6,
  difficulty: 'easy' | 'medium' | 'hard',
  content: {
    audioUrl?: string,         // Listening: Supabase Storage URL
    transcript?: string,       // Listening: optional text transcript
    passage?: string,          // Reading: text passage
    prompt?: string,           // Writing: question prompt
    rubric?: string,           // Writing: grading rubric for teacher/AI
  },
  options?: Array<{            // MCQ types only
    id: string,                // e.g. 'A', 'B', 'C', 'D'
    text: string
  }>,
  correctAnswer: string | string[] | null,
  // string for single MCQ; string[] for multi/ordering/matching; null for Writing
  explanation: string | null,  // Shown to student after grading
  createdBy: string,           // PG User uuid (teacher)
  createdAt: Date,
  updatedAt: Date
}
```

## Business Rules

- Questions stored in MongoDB for flexible schema (different structures per subType)
- `_id` (as string) referenced in `Assignment.questionIds[]` and `AttemptAnswer.questionId`
- Teacher can edit/delete own questions unless used in a published Assignment
- `difficulty` field used by Skill Drill (S-DRILL-1) to filter questions
- Audio files stored in Supabase Storage; `content.audioUrl` is the signed URL
- `correctAnswer = null` for writing types — graded manually + AI suggestion
