# ENTITY_CLASS

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| name | varchar(200) | no | Display name of the class |
| hskLevel | int | no | 1–6 |
| enrollmentCode | char(8) | no | Unique, auto-generated, used by students to join |
| status | enum | no | `active` / `archived` |
| description | text | yes | Optional class description |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User (teacherId) |
| ClassEnrollment[] | one-to-many | Students in this class |
| Assignment[] | one-to-many | Assignments assigned to this class |
| Lesson[] | one-to-many | Lessons in this class (ordered by orderIndex) |
| ClassSession[] | one-to-many | Logged teaching sessions |
| QuizRoom[] | one-to-many | Quiz rooms created for this class |

## Business Rules

- `enrollmentCode` must be 8 chars, alphanumeric, unique globally
- Students can only join `active` classes
- Archiving a class does not delete existing enrollments or assignments
- Only the owning teacher can modify the class (`teacherId === req.user.id`)
- `hskLevel` drives which flashcard sets are relevant for students
