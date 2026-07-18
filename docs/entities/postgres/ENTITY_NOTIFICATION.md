# ENTITY_NOTIFICATION

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| userId | uuid | no | FK → User (recipient) |
| type | enum | no | See Notification Types below |
| referenceId | varchar | yes | ID of the referenced entity (e.g. assignmentId, sessionId) |
| referenceType | varchar | yes | Type of the reference (`assignment`/`attempt`/`invoice`/`session`) |
| isRead | bool | no | Default false |
| readAt | DateTime | yes | Null until user reads |
| payload | jsonb | yes | Extra data (e.g. `{ rejectionReason: "..." }`) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Notification Types (enum)

| Type | Recipient | Trigger |
|------|-----------|---------|
| `account_approved` | Teacher / Student | Admin approves pending account |
| `account_suspended` | Teacher / Student | Admin suspends account |
| `new_assignment` | Student | Teacher publishes assignment |
| `deadline_reminder` | Student | Scheduler: dueDate - 24h |
| `graded` | Student | Teacher completes grading |
| `new_invoice` | Student | Admin creates StudentInvoice |
| `session_submitted_for_review` | Admin | Teacher submits ClassSession |
| `session_approved` | Teacher | Admin approves session |
| `session_rejected` | Teacher | Admin rejects session (payload has reason) |
| `new_teacher_registration` | Admin | Teacher registers (status=pending) |
| `new_student_registration` | Admin | Student registers (status=pending) |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| user | many-to-one | → User (recipient) |

## Business Rules

- `referenceId` + `referenceType` allow frontend deep-linking (click → navigate to correct page)
- `payload` stores extra data that doesn't fit in referenceId (e.g. rejection reason text)
- Unread count computed from `isRead = false` for the current user
- Notifications are append-only — never deleted, only marked read
