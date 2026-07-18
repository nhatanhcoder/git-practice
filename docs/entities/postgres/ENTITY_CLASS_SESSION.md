# ENTITY_CLASS_SESSION

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| scheduledDate | Date | no | Planned date of the session |
| scheduledStart | Time | no | Planned start time |
| scheduledEnd | Time | no | Planned end time |
| actualStart | DateTime | yes | Recorded when teacher begins session |
| actualEnd | DateTime | yes | Recorded when teacher ends session |
| topic | varchar(300) | no | Session topic / lesson summary |
| notes | text | yes | Teacher's additional notes |
| status | enum | no | `scheduled` / `in_progress` / `completed_pending` / `approved` / `rejected` |
| rejectionReason | text | yes | Filled by Admin on reject |
| payrollPeriodId | uuid | yes | FK → PayrollPeriod — set when included in a payroll period |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| SessionAttendance[] | one-to-many | Per-student attendance for this session |
| PayrollPeriod | many-to-one | → PayrollPeriod (nullable until included in payroll) |

## Business Rules

- Status lifecycle: `scheduled → in_progress → completed_pending → approved / rejected`
- Only `approved` sessions are eligible for payroll calculation
- `actualStart` vs `scheduledStart` diff → detect late/early starts
- On `completed_pending` → triggers `session_submitted_for_review` Notification to Admin
- On `approved` → triggers `session_approved` Notification to Teacher
- On `rejected` + `rejectionReason` → triggers `session_rejected` Notification to Teacher
- Only teacher who owns the session can log/submit it
