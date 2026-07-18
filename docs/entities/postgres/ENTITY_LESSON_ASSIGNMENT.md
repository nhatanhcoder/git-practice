# ENTITY_LESSON_ASSIGNMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> **Type**: Join table (Lesson ↔ Assignment, M:N)  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| lessonId | uuid | no | FK → Lesson |
| assignmentId | uuid | no | FK → Assignment |
| createdAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(lessonId, assignmentId)`

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| lesson | many-to-one | → Lesson |
| assignment | many-to-one | → Assignment |

## Business Rules

- Created by teacher when linking an assignment to a lesson (T-LESSON-3)
- One assignment can be linked to multiple lessons (across the same class)
- Student navigating a lesson sees all linked assignments (S-LESSON-3)
- Deleting the link does not delete the assignment
