# ENTITY_QUIZ_ROOM

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| code | char(6) | no | Unique join code shown to students |
| hostId | uuid | no | FK → User (role=teacher, who created the room) |
| classId | uuid | yes | FK → Class (nullable — open rooms allowed) |
| status | enum | no | `waiting` / `active` / `finished` |
| questionIds | text[] | no | Ordered array of MongoDB Question `_id` strings |
| timeLimitPerQuestion | int | no | Seconds per question (countdown) |
| startedAt | DateTime | yes | When host clicks "Start" |
| finishedAt | DateTime | yes | When last question completes |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| host | many-to-one | → User (teacher) |
| class | many-to-one | → Class (optional) |
| QuizParticipant[] | one-to-many | Students in this room |

## Business Rules

- Created by teacher (host) — generates unique 6-char `code`
- Students join by entering `code` while `status = waiting`
- Host starts room → `status = active`, questions pushed via WebSocket to all participants
- Questions shown simultaneously to all participants; server-side timer per question
- Speed bonus: faster correct answers = higher points (formula TBD)
- `status = finished` after last question — leaderboard finalized
- Room expires / cleans up after 24h if never started
- **Requires WebSocket infrastructure** (Sprint 8)
