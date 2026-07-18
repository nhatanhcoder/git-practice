# ENTITY_USER

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| email | varchar(255) | no | Unique, used for login |
| passwordHash | varchar | no | bcrypt hash |
| role | enum | no | `admin` / `teacher` / `student` |
| status | enum | no | `pending` / `active` / `suspended` |
| nickname | varchar(100) | yes | Display name (student); full name (teacher/admin) |
| avatarUrl | varchar | yes | Supabase Storage URL |
| hskLevelGoal | int | yes | Student only (1–6) |
| bio | text | yes | Teacher only |
| lastLoginAt | DateTime | yes | Updated on every successful login (F1.2) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| Class[] | one-to-many | Teacher has many classes (`teacherId`) |
| ClassEnrollment[] | one-to-many | Student enrolled in classes |
| Attempt[] | one-to-many | Student's exam attempts |
| ClassSession[] | one-to-many | Teacher's logged sessions |
| TeacherPayRate[] | one-to-many | Admin sets rates for teacher |
| PayrollPeriod[] | one-to-many | Teacher's payroll periods |
| StudentTuitionRate[] | one-to-many | Admin sets rates for student |
| StudentInvoice[] | one-to-many | Student's invoices |
| Notification[] | one-to-many | All roles receive notifications |
| QuizRoom[] | one-to-many | Teacher hosts quiz rooms |
| QuizParticipant[] | one-to-many | Student joins quiz rooms |

## Business Rules

- `email` must be unique across all roles
- `status = pending` on register; Admin must set `active` before user can login
- `status = suspended` → all JWT tokens rejected (401)
- Only `admin` role can have no class enrollment or session
- `hskLevelGoal` only meaningful for `student` role
- `lastLoginAt` must be updated in AuthService after successful token issuance
