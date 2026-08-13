# 💰 PAYROLL_FLOW.md — Teacher Salary Calculation Flow

---

## 1. State Machine

```
Teacher finishes teaching a session
         │
         ▼
ClassSession: SCHEDULED
         │
Teacher records the lesson topic + attendance
         │
         ▼
Teacher submits the session
         │
         ▼
ClassSession: COMPLETED_PENDING
         │
         ▼ Admin review
         │
    ┌────┴────┐
    │         │
  APPROVED  REJECTED ──► Teacher edits and resubmits
    │
    ▼
Admin creates a PayrollPeriod
    │
Aggregates every APPROVED session in the period
    │
    ▼
PayrollPeriod: DRAFT ──► Admin reviews the numbers
    │
    ▼
PayrollPeriod: FINALIZED ──► Payment is made
    │
    ▼
PayrollPeriod: PAID ──► Session statuses → PAID
```

---

## 2. Teacher Pay Rate

```typescript
// Two rate types:
type RateType = 'per_session' | 'per_hour';

// per_session: paid per session (duration is irrelevant)
// Example: 200,000 VND per session

// per_hour: paid by the hour (based on actual time)
// Example: 300,000 VND per hour
// Actual hours = (actualEndTime - actualStartTime) / 60

// Rates carry an effectiveFrom → supports rate changes over time
// Fetch the effective rate: WHERE effectiveFrom <= periodEndDate ORDER BY effectiveFrom DESC LIMIT 1
```

---

## 3. Calculation Logic

```typescript
// payroll.service.ts
async calculatePeriodAmount(teacherId: string, periodStart: Date, periodEnd: Date) {
  // 1. Fetch the pay rate in effect for the period
  const payRate = await this.prisma.teacherPayRate.findFirst({
    where: {
      teacherId,
      effectiveFrom: { lte: periodEnd }
    },
    orderBy: { effectiveFrom: 'desc' }
  });

  // 2. Fetch approved sessions in the period
  const sessions = await this.prisma.classSession.findMany({
    where: {
      class: { teacherId },
      status: 'approved',
      sessionDate: { gte: periodStart, lte: periodEnd }
    },
    include: { class: true }
  });

  // 3. Compute the amount
  let totalAmount = 0;
  const breakdown = [];

  for (const session of sessions) {
    let sessionAmount = 0;

    if (payRate.rateType === 'per_session') {
      sessionAmount = payRate.rateAmount;
    } else {
      // per_hour: round up to the nearest half hour
      const minutes = differenceInMinutes(session.actualEndTime, session.actualStartTime);
      const hours = Math.ceil(minutes / 30) * 0.5;  // Round up to nearest 0.5h
      sessionAmount = hours * payRate.rateAmount;
    }

    totalAmount += sessionAmount;
    breakdown.push({
      sessionId: session.id,
      sessionDate: session.sessionDate,
      className: session.class.name,
      duration: payRate.rateType === 'per_hour'
        ? `${differenceInMinutes(session.actualEndTime, session.actualStartTime)} phút`
        : null,
      amount: sessionAmount
    });
  }

  return { sessions, totalAmount, breakdown, currency: 'VND' };
}
```

---

## 4. Teacher View

> Mockup shows the Vietnamese UI as built ("Thu nhập" = Income, "buổi" = session, "phút" = minutes).

```
Teacher Dashboard → Payroll
┌──────────────────────────────────────────────────────┐
│ 💰 Thu nhập tháng 7/2026                             │
│                                                       │
│ Pay rate: 250,000 VND/buổi                           │
│                                                       │
│ Buổi đã được duyệt:                                  │
│ ┌─────────────────────────────────────────────────┐  │
│ │ 05/07 - HSK 2 (Group A) - 90 phút - 250,000đ  │  │
│ │ 08/07 - HSK 3 (Group B) - 90 phút - 250,000đ  │  │
│ │ 12/07 - HSK 2 (Group A) - 90 phút - 250,000đ  │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Tổng tháng này: 750,000 VND                          │
│ Trạng thái: Đang chờ chốt lương                      │
└──────────────────────────────────────────────────────┘
```
