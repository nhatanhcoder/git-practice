# ENTITY_SESSION_ATTENDANCE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| sessionId | uuid | no | FK → ClassSession |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `present` / `absent_excused` / `absent_unexcused` |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(sessionId, studentId)` — one record per student per session

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| session | many-to-one | → ClassSession |
| student | many-to-one | → User |

## Business Rules

- Created by teacher during or after the session (T-SES-3)
- Teacher marks all students from ClassEnrollment of the class
- `attendanceRate` for a student = `present` count / total sessions in class (computed, not stored)
- Used to fill `attendanceRate` column in T-CLASS-4 after Sprint 6
- Only sessions with `status = approved` are counted for attendance rate calculation
