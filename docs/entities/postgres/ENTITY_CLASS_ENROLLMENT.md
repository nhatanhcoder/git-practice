# ENTITY_CLASS_ENROLLMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `active` / `dropped` |
| joinedAt | DateTime | no | Timestamp when student joined |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(classId, studentId)` — a student can only enroll once per class

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| student | many-to-one | → User (role=student) |

## Business Rules

- Created when student submits a valid `enrollmentCode`
- `status = active` on creation
- `status = dropped` when student leaves (soft delete — keep history)
- Student can only view class content when `status = active`
- Teacher sees all students with `status = active` in their class list
- `attendanceRate` is computed from SessionAttendance records (available after Sprint 6)
