# ENTITY_LESSON

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL *(moved from MongoDB — needs JOIN with Class/Assignment)*  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| title | varchar(300) | no | Lesson title |
| description | text | yes | Rich text / markdown description |
| contentType | enum | no | `text` / `video` / `document` / `mixed` |
| contentUrl | varchar | yes | Video URL or document URL (Supabase Storage) |
| orderIndex | int | no | Display order within the class (1-based, unique per class) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(classId, orderIndex)` — no two lessons in same class with same order

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| LessonAssignment[] | one-to-many | Assignments linked to this lesson (join table) |

## Business Rules

- Created/managed exclusively by the teacher who owns the class (T-LESSON-1)
- `orderIndex` determines sequence shown to students (T-LESSON-2)
- To reorder: update `orderIndex` values (transactional swap)
- Assignments linked via `LessonAssignment` join table (M:N) — one assignment can appear in multiple lessons
- Student sees the lesson content + linked assignments (S-LESSON-1, S-LESSON-3)
- Cannot delete lesson if linked assignments have active Attempts

> Note: Originally planned as MongoDB entity. Moved to PostgreSQL to support JOIN queries with Class/Assignment needed for analytics and ordering.
