# 💰 PAYROLL_FLOW.md — Luồng Tính Lương Giáo viên

---

## 1. State Machine

```
Teacher dạy xong buổi học
         │
         ▼
ClassSession: SCHEDULED
         │
Teacher ghi lesson topic + attendance
         │
         ▼
Teacher submit session
         │
         ▼
ClassSession: COMPLETED_PENDING
         │
         ▼ Admin review
         │
    ┌────┴────┐
    │         │
  APPROVED  REJECTED ──► Teacher chỉnh sửa và resubmit
    │
    ▼
Admin tạo PayrollPeriod
    │
Tổng hợp tất cả APPROVED sessions trong period
    │
    ▼
PayrollPeriod: DRAFT ──► Admin review numbers
    │
    ▼
PayrollPeriod: FINALIZED ──► Thực hiện thanh toán
    │
    ▼
PayrollPeriod: PAID ──► Sessions status → PAID
```

---

## 2. Teacher Pay Rate

```typescript
// Hai loại rate:
type RateType = 'per_session' | 'per_hour';

// per_session: Trả theo buổi (không quan tâm thời gian)
// Ví dụ: 200,000 VND/buổi

// per_hour: Trả theo giờ (dựa trên actual time)
// Ví dụ: 300,000 VND/giờ
// Actual hours = (actualEndTime - actualStartTime) / 60

// Rate có effectiveFrom → support rate changes over time
// Lấy rate hiệu lực: WHERE effectiveFrom <= periodEndDate ORDER BY effectiveFrom DESC LIMIT 1
```

---

## 3. Calculation Logic

```typescript
// payroll.service.ts
async calculatePeriodAmount(teacherId: string, periodStart: Date, periodEnd: Date) {
  // 1. Lấy pay rate hiệu lực trong period
  const payRate = await this.prisma.teacherPayRate.findFirst({
    where: {
      teacherId,
      effectiveFrom: { lte: periodEnd }
    },
    orderBy: { effectiveFrom: 'desc' }
  });

  // 2. Lấy approved sessions trong period
  const sessions = await this.prisma.classSession.findMany({
    where: {
      class: { teacherId },
      status: 'approved',
      sessionDate: { gte: periodStart, lte: periodEnd }
    },
    include: { class: true }
  });

  // 3. Tính tiền
  let totalAmount = 0;
  const breakdown = [];

  for (const session of sessions) {
    let sessionAmount = 0;

    if (payRate.rateType === 'per_session') {
      sessionAmount = payRate.rateAmount;
    } else {
      // per_hour: round lên 0.5 giờ
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
