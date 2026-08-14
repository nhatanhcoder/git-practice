# ADR-008: Rates are append-only

**Status**: Accepted
**Date**: 2026-08-13
**Applies to**: `TeacherPayRate`, `StudentTuitionRate`

## Context

Both rate entities carry `effectiveFrom`, implying history. The UI had no rule for what
happens when a rate changes — edit in place, or add a new record?

A `StudentInvoice` issued in March must stay explainable by the rate that applied in March.
A `PayrollPeriod` already finalized must stay reproducible. Editing a rate in place destroys
both.

## Decision

**Rates are append-only.** Changing a rate creates a **new record with a new
`effectiveFrom`**; the previous record is retained.

- No update endpoint, no delete endpoint
- UI wording is "thiết lập mức mới có hiệu lực từ <ngày>", never "sửa mức"
- Rate screens show full history (drawer/timeline), with the active one marked `Đang áp dụng`
- Resolution at read time: `WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1`

## Consequences

- `/admin/tuition-rates` and `/admin/pay-rates` need list + history endpoints (currently
  **POST only** — see `ai/PROGRESS.md`)
- Rate tables grow monotonically; acceptable at this scale
- A mistyped rate cannot be undone, only superseded. The set-rate modal must therefore
  preview the effect before saving
- `per_hour` billing rounds **up to the nearest 0.5h** (`FLOW_PAYROLL_CYCLE` §3) — a 50-minute
  session bills 1.0h. This must be surfaced at the moment `Theo giờ` is selected, not in a
  tooltip, because it is the most surprising rule in the payroll model
