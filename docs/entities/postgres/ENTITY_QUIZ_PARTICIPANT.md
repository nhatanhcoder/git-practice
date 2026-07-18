# ENTITY_QUIZ_PARTICIPANT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| roomId | uuid | no | FK → QuizRoom |
| userId | uuid | no | FK → User (role=student) |
| totalScore | int | no | Cumulative score across all questions (default 0) |
| rank | int | yes | Final rank (null until room finishes) |
| joinedAt | DateTime | no | When student entered the waiting room |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(roomId, userId)` — one slot per student per room

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| room | many-to-one | → QuizRoom |
| user | many-to-one | → User |

## Business Rules

- Created when student joins the room with a valid `code` and `room.status = waiting`
- `totalScore` updated via WebSocket after each question resolves
- Score formula: `basePoints × speedMultiplier` (faster = higher multiplier, TBD)
- Live leaderboard = `SELECT * FROM quiz_participants WHERE roomId = X ORDER BY totalScore DESC`
- `rank` computed and stored when room transitions to `finished`
- Quiz scores are **not** recorded in Attempt / official grade records
