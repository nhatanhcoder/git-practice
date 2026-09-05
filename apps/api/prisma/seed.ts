/**
 * Seed data for local development.
 *
 * Covers:
 *   - Auth cast list (01-auth.md §12)
 *   - Classes and enrollments
 *   - Teacher pay rates (ADR-008 append-only, ADR-012)
 *   - Student tuition rates for ALL active students (ADR-008, ADR-013)
 *   - Class sessions with all 5 statuses: scheduled, in_progress, completed_pending, approved, rejected
 *   - Session attendances
 *   - Payroll period (draft)
 *   - Student invoice and payment sample
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  ClassStatus,
  EnrollmentStatus,
  SessionStatus,
  AttendanceStatus,
  PayRateType,
  PayrollStatus,
  InvoiceStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const SEED_PASSWORD = 'Password123!';

type SeedUser = {
  email: string;
  role: UserRole;
  status: UserStatus;
  nickname: string;
  hskLevelGoal?: number;
  bio?: string;
  neverLoggedIn?: boolean;
  note: string;
};

const users: SeedUser[] = [
  {
    email: 'admin@hsk.local',
    role: UserRole.admin,
    status: UserStatus.active,
    nickname: 'Admin One',
    note: 'primary admin',
  },
  {
    email: 'admin2@hsk.local',
    role: UserRole.admin,
    status: UserStatus.active,
    nickname: 'Admin Two',
    note: 'second admin — register fan-out must be a bulk insert',
  },
  {
    email: 'teacher@hsk.local',
    role: UserRole.teacher,
    status: UserStatus.active,
    nickname: 'Teacher Active',
    bio: 'Teaches HSK 4-6. Seeded account.',
    note: 'happy-path teacher',
  },
  {
    email: 'teacher.pending@hsk.local',
    role: UserRole.teacher,
    status: UserStatus.pending,
    nickname: 'Teacher Pending',
    bio: 'Awaiting admin approval.',
    note: 'login must be rejected until an admin approves',
  },
  {
    email: 'student@hsk.local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Student Active',
    hskLevelGoal: 4,
    note: 'happy-path student',
  },
  {
    email: 'student.suspended@hsk.local',
    role: UserRole.student,
    status: UserStatus.suspended,
    nickname: 'Student Suspended',
    hskLevelGoal: 3,
    note: 'every JWT must be rejected with 401',
  },
  {
    email: 'never.logged.in@hsk.local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Never Logged In',
    hskLevelGoal: 1,
    neverLoggedIn: true,
    note: 'lastLoginAt stays null — INV-AUTH-24',
  },
  {
    email: 'MiXeD.CaSe@HSK.Local',
    role: UserRole.student,
    status: UserStatus.active,
    nickname: 'Mixed Case Email',
    hskLevelGoal: 9,
    note: 'stored as typed; citext makes lookup case-insensitive',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);
  const now = new Date();

  console.log('--- Seeding Users ---');
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        status: u.status,
        nickname: u.nickname,
        hskLevelGoal: u.hskLevelGoal ?? null,
        bio: u.bio ?? null,
        lastLoginAt: u.neverLoggedIn ? null : now,
      },
    });
    console.log(`  ${u.status.padEnd(9)} ${u.role.padEnd(7)} ${u.email}  — ${u.note}`);
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@hsk.local' } });
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: 'teacher@hsk.local' } });
  const student1 = await prisma.user.findUniqueOrThrow({ where: { email: 'student@hsk.local' } });
  const student2 = await prisma.user.findUniqueOrThrow({ where: { email: 'never.logged.in@hsk.local' } });
  const student3 = await prisma.user.findUniqueOrThrow({ where: { email: 'MiXeD.CaSe@HSK.Local' } });

  console.log('\n--- Seeding Classes & Enrollments ---');
  let sampleClass = await prisma.class.findFirst({ where: { enrollmentCode: 'HSK4A001' } });
  if (!sampleClass) {
    sampleClass = await prisma.class.create({
      data: {
        teacherId: teacher.id,
        name: 'Lớp HSK 4 Cơ Bản - Khóa 2026',
        hskLevel: 4,
        enrollmentCode: 'HSK4A001',
        status: ClassStatus.active,
        description: 'Lớp luyện thi HSK cấp độ 4 cho người mới bắt đầu trung cấp.',
      },
    });
    console.log(`  Created class: ${sampleClass.name} (${sampleClass.enrollmentCode})`);
  }

  // Enrollments
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: sampleClass.id, studentId: student1.id } },
    update: {},
    create: {
      classId: sampleClass.id,
      studentId: student1.id,
      status: EnrollmentStatus.active,
    },
  });
  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: sampleClass.id, studentId: student2.id } },
    update: {},
    create: {
      classId: sampleClass.id,
      studentId: student2.id,
      status: EnrollmentStatus.active,
    },
  });
  console.log('  Enrolled students in class.');

  console.log('\n--- Seeding Teacher Pay Rates (ADR-008, ADR-012) ---');
  await prisma.teacherPayRate.upsert({
    where: {
      teacherId_effectiveFrom: {
        teacherId: teacher.id,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      rateType: PayRateType.per_session,
      rateAmount: 350000,
    },
    create: {
      teacherId: teacher.id,
      rateType: PayRateType.per_session,
      rateAmount: 350000,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  console.log(`  Set pay rate 350,000 VND / session for ${teacher.email}`);

  console.log('\n--- Seeding Student Tuition Rates (ADR-008, ADR-013) ---');
  const activeStudentsWithRates = [
    { student: student1, amount: 1500000 },
    { student: student2, amount: 1200000 },
    { student: student3, amount: 1800000 },
  ];

  for (const item of activeStudentsWithRates) {
    await prisma.studentTuitionRate.upsert({
      where: {
        studentId_effectiveFrom: {
          studentId: item.student.id,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
      update: {
        rateAmount: item.amount,
      },
      create: {
        studentId: item.student.id,
        rateAmount: item.amount,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    console.log(`  Set tuition rate ${item.amount.toLocaleString('vi-VN')} VND for ${item.student.email}`);
  }

  console.log('\n--- Seeding Class Sessions & Attendances ---');
  // 1. Scheduled session
  let sScheduled = await prisma.classSession.findFirst({
    where: { classId: sampleClass.id, topic: 'Buổi 1: Ngữ pháp Bổ ngữ kết quả (Scheduled)' },
  });
  if (!sScheduled) {
    sScheduled = await prisma.classSession.create({
      data: {
        classId: sampleClass.id,
        teacherId: teacher.id,
        scheduledDate: new Date('2026-09-10T00:00:00.000Z'),
        scheduledStart: '18:00',
        scheduledEnd: '19:30',
        topic: 'Buổi 1: Ngữ pháp Bổ ngữ kết quả (Scheduled)',
        notes: 'Chuẩn bị bài tập trang 45',
        status: SessionStatus.scheduled,
      },
    });
    console.log(`  Created session [scheduled]: ${sScheduled.topic}`);
  }

  // 2. In progress session
  let sInProgress = await prisma.classSession.findFirst({
    where: { classId: sampleClass.id, topic: 'Buổi 2: Luyện nghe hội thoại HSK4 (In Progress)' },
  });
  if (!sInProgress) {
    sInProgress = await prisma.classSession.create({
      data: {
        classId: sampleClass.id,
        teacherId: teacher.id,
        scheduledDate: new Date('2026-09-05T00:00:00.000Z'),
        scheduledStart: '09:00',
        scheduledEnd: '10:30',
        actualStart: new Date('2026-09-05T02:00:00.000Z'),
        topic: 'Buổi 2: Luyện nghe hội thoại HSK4 (In Progress)',
        notes: 'Đang diễn ra',
        status: SessionStatus.in_progress,
      },
    });
    console.log(`  Created session [in_progress]: ${sInProgress.topic}`);
  }

  // 3. Completed Pending session (Pending approval for Admin)
  let sPending = await prisma.classSession.findFirst({
    where: { classId: sampleClass.id, topic: 'Buổi 3: Cấu trúc câu chữ Ba 把 (Completed Pending)' },
  });
  if (!sPending) {
    sPending = await prisma.classSession.create({
      data: {
        classId: sampleClass.id,
        teacherId: teacher.id,
        scheduledDate: new Date('2026-09-04T00:00:00.000Z'),
        scheduledStart: '18:00',
        scheduledEnd: '19:30',
        actualStart: new Date('2026-09-04T11:00:00.000Z'),
        actualEnd: new Date('2026-09-04T12:30:00.000Z'),
        topic: 'Buổi 3: Cấu trúc câu chữ Ba 把 (Completed Pending)',
        notes: 'Đã hoàn thành toàn bộ bài tập và điểm danh đầy đủ',
        status: SessionStatus.completed_pending,
      },
    });
    await prisma.sessionAttendance.createMany({
      data: [
        { sessionId: sPending.id, studentId: student1.id, status: AttendanceStatus.present },
        { sessionId: sPending.id, studentId: student2.id, status: AttendanceStatus.present },
      ],
      skipDuplicates: true,
    });
    console.log(`  Created session [completed_pending]: ${sPending.topic}`);
  }

  // 4. Approved session
  let sApproved = await prisma.classSession.findFirst({
    where: { classId: sampleClass.id, topic: 'Buổi 4: Đọc hiểu và từ vựng mở rộng (Approved)' },
  });
  if (!sApproved) {
    sApproved = await prisma.classSession.create({
      data: {
        classId: sampleClass.id,
        teacherId: teacher.id,
        scheduledDate: new Date('2026-08-28T00:00:00.000Z'),
        scheduledStart: '18:00',
        scheduledEnd: '19:30',
        actualStart: new Date('2026-08-28T11:00:00.000Z'),
        actualEnd: new Date('2026-08-28T12:30:00.000Z'),
        topic: 'Buổi 4: Đọc hiểu và từ vựng mở rộng (Approved)',
        notes: 'Lớp học sôi nổi, phát biểu tốt',
        status: SessionStatus.approved,
      },
    });
    await prisma.sessionAttendance.createMany({
      data: [
        { sessionId: sApproved.id, studentId: student1.id, status: AttendanceStatus.present },
        { sessionId: sApproved.id, studentId: student2.id, status: AttendanceStatus.absent_excused },
      ],
      skipDuplicates: true,
    });
    console.log(`  Created session [approved]: ${sApproved.topic}`);
  }

  // 5. Rejected session
  let sRejected = await prisma.classSession.findFirst({
    where: { classId: sampleClass.id, topic: 'Buổi 5: Thực hành viết luận ngắn (Rejected)' },
  });
  if (!sRejected) {
    sRejected = await prisma.classSession.create({
      data: {
        classId: sampleClass.id,
        teacherId: teacher.id,
        scheduledDate: new Date('2026-08-25T00:00:00.000Z'),
        scheduledStart: '18:00',
        scheduledEnd: '19:30',
        actualStart: new Date('2026-08-25T11:00:00.000Z'),
        actualEnd: new Date('2026-08-25T11:45:00.000Z'),
        topic: 'Buổi 5: Thực hành viết luận ngắn (Rejected)',
        notes: 'Bị gián đoạn',
        status: SessionStatus.rejected,
        rejectionReason: 'Thời lượng thực tế chỉ 45 phút, chưa đạt tiêu chuẩn buổi học 90 phút.',
      },
    });
    console.log(`  Created session [rejected]: ${sRejected.topic}`);
  }

  console.log('\n--- Seeding Payroll Period & Invoices ---');
  // Payroll period
  const payrollCode = 'PAY-202608-001';
  let payrollPeriod = await prisma.payrollPeriod.findFirst({ where: { code: payrollCode } });
  if (!payrollPeriod) {
    payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        code: payrollCode,
        teacherId: teacher.id,
        periodStart: new Date('2026-08-01T00:00:00.000Z'),
        periodEnd: new Date('2026-08-31T00:00:00.000Z'),
        status: PayrollStatus.draft,
        totalSessions: 1,
        totalAmount: 350000,
      },
    });
    // Link approved session to this payroll period
    await prisma.classSession.update({
      where: { id: sApproved.id },
      data: { payrollPeriodId: payrollPeriod.id },
    });
    console.log(`  Created PayrollPeriod [draft]: ${payrollCode} with 1 approved session.`);
  }

  // Student Invoice
  const invoiceCode = 'INV-202608-0001';
  let invoice = await prisma.studentInvoice.findUnique({ where: { code: invoiceCode } });
  if (!invoice) {
    invoice = await prisma.studentInvoice.create({
      data: {
        code: invoiceCode,
        studentId: student1.id,
        periodStart: new Date('2026-08-01T00:00:00.000Z'),
        periodEnd: new Date('2026-08-31T00:00:00.000Z'),
        dueDate: new Date('2026-09-10T00:00:00.000Z'),
        totalAmount: 1500000,
        paidAmount: 500000,
        status: InvoiceStatus.partially_paid,
      },
    });
    await prisma.tuitionPayment.create({
      data: {
        invoiceId: invoice.id,
        amount: 500000,
        paymentMethod: 'bank_transfer',
        transactionReference: 'VNPAY-20260815-9988',
        recordedBy: admin.id,
      },
    });
    console.log(`  Created StudentInvoice ${invoiceCode} for ${student1.email} with 500,000 VND partial payment.`);
  }

  console.log('\n=== Seed Complete ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
