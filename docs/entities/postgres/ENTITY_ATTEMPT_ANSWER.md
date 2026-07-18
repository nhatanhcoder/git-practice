# ENTITY_ATTEMPT_ANSWER

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| attemptId | uuid | no | FK → Attempt |
| questionId | varchar | no | MongoDB Question `_id` (string reference) |
| selectedOptions | text[] | yes | For MCQ types — array of selected option IDs |
| writtenAnswer | text | yes | For Writing types — student's text |
| autoScore | float | yes | Auto-calculated on submit (MCQ); null for Writing |
| teacherScore | float | yes | Manually entered by teacher |
| aiSuggestedScore | float | yes | Gemini-suggested score for Writing (T-GRADE-3) |
| aiFeedback | text | yes | Gemini reasoning / feedback |
| teacherFeedback | text | yes | Teacher's written comment |
| isCorrect | bool | yes | Null for Writing; true/false for MCQ |
| savedAt | DateTime | yes | Last auto-save timestamp |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(attemptId, questionId)` — one answer record per question per attempt

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| attempt | many-to-one | → Attempt |

## Business Rules

- Created/upserted via auto-save every 2s while `Attempt.status = in_progress`
- `autoScore` computed on `Attempt` submit for MCQ; Writing leaves it null
- `aiSuggestedScore` filled when teacher clicks "AI Suggest" (calls Gemini API)
- `teacherScore` is the final authoritative score; AI score is suggestion only
- When teacher saves all answers → `Attempt.status = graded`, `Attempt.totalScore` = sum of final scores
- `isCorrect` used for MCQ analytics (score charts, weak student detection)
