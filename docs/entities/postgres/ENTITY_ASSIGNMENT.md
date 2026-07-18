# ENTITY_ASSIGNMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| title | varchar(300) | no | Display name |
| type | enum | no | `homework` / `mock_test` |
| dueDate | DateTime | yes | Deadline; null = no deadline |
| timeLimitMinutes | int | yes | Only for `mock_test`; null = no limit |
| status | enum | no | `draft` / `published` |
| questionIds | text[] | no | Ordered array of MongoDB Question `_id` strings |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| Attempt[] | one-to-many | Student attempts on this assignment |
| LessonAssignment[] | one-to-many | Lessons this assignment is linked to |

## Business Rules

- Only `published` assignments are visible to students
- `timeLimitMinutes` required when `type = mock_test`
- Cannot delete/edit assignment that has at least 1 `Attempt`
- `questionIds` references MongoDB `Question._id` — ordering matters (determines question display order)
- When published → triggers `new_assignment` Notification for all active enrolled students
- Submission count & pending grading count computed from `Attempt` records
