-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('scheduled', 'in_progress', 'completed_pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('present', 'absent_excused', 'absent_unexcused');

-- CreateEnum
CREATE TYPE "pay_rate_type" AS ENUM ('per_session', 'per_hour');

-- CreateEnum
CREATE TYPE "payroll_status" AS ENUM ('draft', 'finalized', 'paid');

-- CreateEnum
CREATE TYPE "tuition_billing_cycle" AS ENUM ('monthly');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('unpaid', 'partially_paid', 'paid', 'void');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('account_approved', 'account_suspended', 'new_assignment', 'deadline_reminder', 'graded', 'new_invoice', 'session_submitted_for_review', 'session_approved', 'session_rejected', 'new_teacher_registration', 'new_student_registration');

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_start" VARCHAR(10) NOT NULL,
    "scheduled_end" VARCHAR(10) NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "topic" VARCHAR(300) NOT NULL,
    "notes" TEXT,
    "status" "session_status" NOT NULL DEFAULT 'scheduled',
    "rejection_reason" TEXT,
    "payroll_period_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_attendances" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "attendance_status" NOT NULL DEFAULT 'present',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_pay_rates" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "rate_type" "pay_rate_type" NOT NULL,
    "rate_amount" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "teacher_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "payroll_status" NOT NULL DEFAULT 'draft',
    "total_sessions" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_tuition_rates" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "rate_amount" DECIMAL(12,2) NOT NULL,
    "billing_cycle" "tuition_billing_cycle" NOT NULL DEFAULT 'monthly',
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_tuition_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_invoices" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "student_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "invoice_status" NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" VARCHAR(50) NOT NULL,
    "transaction_reference" VARCHAR(200),
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "reference_id" VARCHAR(100),
    "reference_type" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_sessions_class_id_idx" ON "class_sessions"("class_id");

-- CreateIndex
CREATE INDEX "class_sessions_teacher_id_idx" ON "class_sessions"("teacher_id");

-- CreateIndex
CREATE INDEX "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE INDEX "class_sessions_payroll_period_id_idx" ON "class_sessions"("payroll_period_id");

-- CreateIndex
CREATE INDEX "class_sessions_scheduled_date_idx" ON "class_sessions"("scheduled_date");

-- CreateIndex
CREATE INDEX "session_attendances_session_id_idx" ON "session_attendances"("session_id");

-- CreateIndex
CREATE INDEX "session_attendances_student_id_idx" ON "session_attendances"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_attendances_session_id_student_id_key" ON "session_attendances"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "teacher_pay_rates_teacher_id_idx" ON "teacher_pay_rates"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_pay_rates_teacher_id_effective_from_key" ON "teacher_pay_rates"("teacher_id", "effective_from");

-- CreateIndex
CREATE INDEX "payroll_periods_teacher_id_idx" ON "payroll_periods"("teacher_id");

-- CreateIndex
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_teacher_id_period_start_period_end_key" ON "payroll_periods"("teacher_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "student_tuition_rates_student_id_idx" ON "student_tuition_rates"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_tuition_rates_student_id_effective_from_key" ON "student_tuition_rates"("student_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "student_invoices_code_key" ON "student_invoices"("code");

-- CreateIndex
CREATE INDEX "student_invoices_student_id_idx" ON "student_invoices"("student_id");

-- CreateIndex
CREATE INDEX "student_invoices_status_idx" ON "student_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_invoices_student_id_period_start_period_end_key" ON "student_invoices"("student_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "tuition_payments_invoice_id_idx" ON "tuition_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "tuition_payments_recorded_by_idx" ON "tuition_payments"("recorded_by");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_pay_rates" ADD CONSTRAINT "teacher_pay_rates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_tuition_rates" ADD CONSTRAINT "student_tuition_rates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_invoices" ADD CONSTRAINT "student_invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_payments" ADD CONSTRAINT "tuition_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "student_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_payments" ADD CONSTRAINT "tuition_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom Check Constraints
ALTER TABLE "class_sessions" ADD CONSTRAINT "chk_sessions_actual_times" CHECK ("actual_end" IS NULL OR "actual_start" IS NULL OR "actual_end" > "actual_start");
ALTER TABLE "student_invoices" ADD CONSTRAINT "chk_invoices_amounts" CHECK ("total_amount" > 0 AND "paid_amount" >= 0 AND "paid_amount" <= "total_amount");
ALTER TABLE "student_invoices" ADD CONSTRAINT "chk_invoices_period" CHECK ("period_end" >= "period_start" AND "due_date" >= "period_start");
ALTER TABLE "tuition_payments" ADD CONSTRAINT "chk_payments_amount" CHECK ("amount" > 0);
ALTER TABLE "teacher_pay_rates" ADD CONSTRAINT "chk_pay_rates_amount" CHECK ("rate_amount" > 0);
ALTER TABLE "student_tuition_rates" ADD CONSTRAINT "chk_tuition_rates_amount" CHECK ("rate_amount" > 0);
ALTER TABLE "payroll_periods" ADD CONSTRAINT "chk_payroll_amounts" CHECK ("total_amount" >= 0 AND "total_sessions" >= 0);
ALTER TABLE "payroll_periods" ADD CONSTRAINT "chk_payroll_period" CHECK ("period_end" >= "period_start");

