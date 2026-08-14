# ADR-007: Categorical chart palette

**Status**: Accepted
**Date**: 2026-08-13
**Supersedes**: —

## Context

`root-design-fe.md` §6 specifies chart *types* but only ever assumed a single series
("Fill 20% opacity, 1 màu accent"). The Admin dashboard needs **two series on one chart**
(thu học phí vs chi lương), and no categorical palette existed.

Left unspecified, each screen would invent its own pair — and the obvious instinct,
green for revenue and red for payroll, reuses the reserved status hues.

## Decision

Two-series categorical palette, fixed order:

| Slot | Hex |
|---|---|
| Series 1 | `#2563EB` |
| Series 2 | `#EA580C` |

Validated, not chosen by eye — adjacent-pair separation on a white surface:

- ΔE **31.3** protanopia · **34.6** tritanopia · **39.6** normal vision
- passes lightness band, chroma floor, CVD separation, and 3:1 contrast

**Status colours (`#16A34A`, `#D97706`, `#DC2626`, `#0284C7`, `#64748B`) are reserved for
state and must never be used for a chart series.**

Additional rules, applying to every chart:

- **One y-axis, always.** Two measures of different scale become two charts, never a second axis
- ≥2 series → legend always present, plus direct labels at the final point
- 1 series → no legend; the card title names it
- An incomplete current period renders **dashed** with a note, never a solid line
- `Xem dạng bảng` toggle required (already in §6)

## Consequences

- Teacher and Student dashboards inherit the same pair — no per-screen invention
- A third series is not defined. If one is ever needed, it must be validated the same way
  and added here, not chosen ad hoc
- Green-revenue / red-payroll is explicitly rejected: it makes an ordinary payroll month
  read as an error state
