-- CreateEnum
CREATE TYPE "assignment_type" AS ENUM ('homework', 'mock_test');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "type" "assignment_type" NOT NULL,
    "due_date" TIMESTAMP(3),
    "time_limit_minutes" INTEGER,
    "status" "assignment_status" NOT NULL DEFAULT 'draft',
    "question_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_assignments" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_class_id_idx" ON "assignments"("class_id");

-- CreateIndex
CREATE INDEX "assignments_teacher_id_idx" ON "assignments"("teacher_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "lesson_assignments_assignment_id_idx" ON "lesson_assignments"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_assignments_lesson_id_assignment_id_key" ON "lesson_assignments"("lesson_id", "assignment_id");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assignments" ADD CONSTRAINT "lesson_assignments_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_assignments" ADD CONSTRAINT "lesson_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

