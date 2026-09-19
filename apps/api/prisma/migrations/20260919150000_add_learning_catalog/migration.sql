-- Teacher-authored Learning Catalog (ADR-017, modules teacher/07 + admin/09).
-- This migration is additive: it creates the path metadata/audit table and
-- extends the existing notification enum for the four catalog transitions.

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'learning_path_submitted';
ALTER TYPE "notification_type" ADD VALUE 'learning_path_approved';
ALTER TYPE "notification_type" ADD VALUE 'learning_path_rejected';
ALTER TYPE "notification_type" ADD VALUE 'learning_path_suspended';

-- CreateEnum
CREATE TYPE "learning_path_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'suspended');

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "curriculum_key" TEXT NOT NULL,
    "status" "learning_path_status" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "suspended_by_id" UUID,
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_curriculum_key_key" ON "learning_paths"("curriculum_key");

-- CreateIndex
CREATE INDEX "learning_paths_owner_id_status_idx" ON "learning_paths"("owner_id", "status");

-- CreateIndex
CREATE INDEX "learning_paths_status_idx" ON "learning_paths"("status");

-- CreateIndex
CREATE INDEX "learning_paths_reviewed_by_id_reviewed_at_idx" ON "learning_paths"("reviewed_by_id", "reviewed_at");

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_suspended_by_id_fkey" FOREIGN KEY ("suspended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
