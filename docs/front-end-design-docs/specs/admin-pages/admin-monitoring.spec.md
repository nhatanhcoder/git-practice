---
page: Admin · System Monitoring
route: /admin/monitoring
contract: ../../pages/admin-pages/admin-monitoring.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · System Monitoring

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

Gemini API consumption, so AI grading does not silently fail on an exhausted quota. Read-only. **This screen has no backend yet** — the mockup exists to reserve the layout.

## 2. Access

admin. No ownership rule. Read-only screen. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Everything | ⛔ `GET /api/v1/admin/monitoring/gemini` **does not exist** | — | — |

⛔ **This screen has no backend at all.** Beyond the missing endpoint, two things must be
settled first:
1. T-GRADE-3 (AI suggested score) must actually be running, or the numbers are meaningless
2. The Gemini key model — one shared key or one per teacher — is undecided (`UC-A-005`),
   and it changes what "quota remaining" even means

Specced now only to reserve the route and nav slot. `Empty` is the expected state.

---

## 4. Page structure

1. **Title row** — `h1` `Giám sát hệ thống` + range selector (`Ngày` / `Tuần` / `Tháng`)
2. **Alert banner** — only when quota is below threshold
3. **KPI row** — 3 tiles
4. **Usage chart** — calls over time
5. **Breakdown table** — by feature

## 5. Component specs

### Alert banner

Full width, above the KPI row. Background `#DC2626` @ 8%, left border `3px #DC2626`,
`alert-circle` 20px, bold headline + one body line. Not dismissible.

### KPI tiles (3)

| # | Label | Value | Extra |
|---|---|---|---|
| 1 | TỔNG LƯỢT GỌI | `1.284` | `trong 7 ngày` sub-label |
| 2 | QUOTA CÒN LẠI | `18%` | a **meter** below: 6px track `#E2E8F0`, fill `#DC2626` when < 20%, `#D97706` when < 50%, else `#2563EB` |
| 3 | CACHE HIT RATIO | `62%` | meter, fill always `#2563EB` — higher is better, no threshold colouring |

Tile 2's fill is the one place on this screen where status colour is correct: it encodes
a threshold, not a category.

### Usage chart

Single-series line, calls per day over the selected range.

- Line `#2563EB`, 2px, no fill, no gradient
- **One y-axis.** 4 ticks, `#475569` 12px
- Horizontal gridlines only, `1px #E2E8F0`. No vertical gridlines, no plot border
- Markers 8px on hover only; crosshair + tooltip showing date and call count
- **No legend** — a single series is named by the card title
- `Xem dạng bảng` toggle in the card header, same as the dashboard chart

### Breakdown table

| Column | Content | Align |
|---|---|---|
| Tính năng | `Chấm điểm AI (Writing)` | left |
| Lượt gọi | `1.284` | right |
| Từ cache | `796` | right |
| Gọi API thật | `488` | right |

## 6. Data — use these exact values

```json
{
  "range": "7 ngày",
  "kpi": { "totalCalls": 1284, "quotaRemainingPct": 18, "cacheHitPct": 62 },
  "series": [
    {"date":"05/08","calls":142},{"date":"06/08","calls":198},{"date":"07/08","calls":165},
    {"date":"08/08","calls":221},{"date":"09/08","calls":94},{"date":"10/08","calls":178},
    {"date":"11/08","calls":286}
  ],
  "breakdown": [ {"feature":"Chấm điểm AI (Writing)","calls":1284,"cached":796,"live":488} ]
}
```

Quota at 18% deliberately triggers the alert banner, so that state is visible by default.

## 7. States

Switcher: `Empty (default) · Ready · Ready: quota alert · Loading · Partial · Error · Mobile`

| State | Appearance |
|---|---|
| **Empty** | **The expected state today, and the default the mockup should open in.** Centred `activity` icon 15% opacity, `Chưa có dữ liệu`, body `Tính năng chấm điểm AI chưa hoạt động. Số liệu sẽ xuất hiện sau khi có lượt chấm đầu tiên.` **Do not render zeroes** — `0 lượt gọi, 0% quota` reads as a broken integration rather than an unused feature |
| **Loading** | KPI + chart skeleton |
| **Ready** | Data above, without the alert |
| **Ready: quota alert** | Same plus the red banner |
| **Partial** | KPI resolved, chart still skeleton |
| **Error** | Inline retry in the chart card; KPI tiles stay |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Giám sát hệ thống` |
| Range | `Ngày` · `Tuần` · `Tháng` |
| KPI labels | `TỔNG LƯỢT GỌI` · `QUOTA CÒN LẠI` · `CACHE HIT RATIO` |
| Chart title | `Lượt gọi Gemini API` |
| Alert headline | `Quota Gemini sắp hết` |
| Alert body | `Còn 18% quota trong kỳ. Chấm điểm AI có thể ngừng hoạt động.` |
| Breakdown columns | `Tính năng` · `Lượt gọi` · `Từ cache` · `Gọi API thật` |
| Empty | `Chưa có dữ liệu` |
| Table toggle | `Xem dạng bảng` / `Xem biểu đồ` |

## 9. Interactions

- Range selector → refetch; in the mockup it just reflows the same series
- Chart hover → crosshair + tooltip
- Below 768px: KPI 3→1 column, chart height 200px

## 10. Constraints — do NOT

- Do not render zeroes for the empty state
- Do not use a gauge, speedometer or donut for quota — flat meter only
- Do not add a second y-axis, or a second series
- Do not add any action that changes quota — this screen is read-only
- Do not hardcode a threshold number as if it were decided; 20% is a placeholder
