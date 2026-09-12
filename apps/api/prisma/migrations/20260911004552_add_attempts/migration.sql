-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('in_progress', 'submitted', 'graded');

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "attempt_status" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "is_official_grade" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attempts_assignment_id_idx" ON "attempts"("assignment_id");

-- CreateIndex
CREATE INDEX "attempts_student_id_idx" ON "attempts"("student_id");

-- CreateIndex
CREATE INDEX "attempts_status_idx" ON "attempts"("status");

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ENTITY_ATTEMPT.md partial unique: one official attempt per assignment.
-- Prisma cannot express a filtered unique index; added by hand.
CREATE UNIQUE INDEX "attempts_official_one_per_assignment" ON "attempts"("assignment_id", "student_id") WHERE "is_official_grade" = true;
