# ENTITY_ATTEMPT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| assignmentId | uuid | no | FK → Assignment |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `in_progress` / `submitted` / `graded` |
| startedAt | DateTime | no | When student clicked "Bắt đầu" |
| submittedAt | DateTime | yes | When submitted (manual or auto) |
| gradedAt | DateTime | yes | When teacher finishes grading |
| totalScore | float | yes | Null until graded; sum of all AttemptAnswer scores |
| maxScore | float | yes | Maximum possible score for this assignment |
| isOfficialGrade | bool | no | `true` for teacher-assigned; `false` for Skill Drill |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(assignmentId, studentId)` where `isOfficialGrade = true` — one official attempt per assignment

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| assignment | many-to-one | → Assignment |
| student | many-to-one | → User |
| AttemptAnswer[] | one-to-many | Per-question answers |

## Business Rules

- Created when student clicks "Bắt đầu" — status = `in_progress`
- Auto-save via `AttemptAnswer` upserts every 2s (no Attempt update needed)
- `submitted` → locked, no further edits to AttemptAnswer
- MCQ answers: `autoScore` calculated on submit; `totalScore` updated immediately for MCQ-only assignments
- Writing answers: `totalScore` null until teacher completes grading (`graded`)
- Mock test: if `timeLimitMinutes` elapsed → system auto-submits (scheduler or client-side trigger)
- On `graded` → triggers `graded` Notification to student
- Skill Drill attempts use `isOfficialGrade = false`, no unique constraint → multiple attempts allowed
