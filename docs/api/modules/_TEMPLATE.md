# MODULE SPEC TEMPLATE — mandatory, section order must be followed exactly

---
module: <name>
status: accepted | proposed | deferred
blocked_by: <ADR/decision, or ->
owner: <->
last_updated: 2026-08-19
---

## 0. Summary
2-3 sentences: what this module is responsible for, where its boundary lies.

## 1. Tables touched
Table | Read/Write | Notes

## 2. Endpoints
Method | Path | Role | Description | Status (defined/proposed)
Full path, with /api/v1 prefix.

## 3. DTO
### Request
Each field: name · type · required · validation constraint
### Response
Wrapped in { "data": ... }. Lists have "meta".

## 4. Business rules (invariants)
Numbered INV-<MODULE>-01... Each invariant is a statement that always holds.
This is the list that section 15 (test matrix) must fully cover.

## 5. Ownership / RBAC
Check at the service layer, not just role guard. Write the exact predicate.

## 6. State machine
States, valid transitions, one-way gates. Draw as text.

## 7. Transaction boundary
Which operations must be in the SAME transaction. State the isolation level if needed.

## 8. Idempotency & concurrency
What happens on duplicate requests. What happens with two concurrent requests. Which locks, which unique constraints.

## 9. Error → code mapping
Error branch | HTTP | code | Code status (in API_ERROR_CODES.md / proposed)
NEVER invent new codes.

## 10. Side effects & notifications
Which action produces which Notification type, sent to whom.

## 11. Index & query
Indexes needed for filter/sort/pagination. Which queries risk N+1.

## 12. Migration & seed
What this migration adds/changes. What the seed needs for testing.

## 13. Security & rate limit
Limits, sensitive data that must NOT be exposed, audit.

## 14. Observability
What to log, what to measure.

## 15. Test matrix
INV | Test type (service/integration/real DB) | Description
Every INV in section 4 must appear here. This is the invariant gate.

## 16. Unresolved
Question | What it blocks | Owner | Decide by date
