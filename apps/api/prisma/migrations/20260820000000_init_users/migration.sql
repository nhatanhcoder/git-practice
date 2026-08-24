-- Base migration: users table only.
-- See the header of prisma/schema.prisma for why nothing else is here yet.

-- citext gives database-enforced case-insensitive email uniqueness.
-- Without this line the migration fails on a fresh database.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'teacher', 'student');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending', 'active', 'suspended');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'pending',
    "nickname" VARCHAR(100),
    "avatar_url" TEXT,
    "hsk_level_goal" INTEGER,
    "bio" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- Constraints Prisma cannot express in schema.prisma.
-- Prisma's diff engine ignores CHECK constraints, so these survive future
-- `prisma migrate dev` runs instead of being dropped.

-- HSK range is 1-9 (DOC-004, resolved 2026-08-11). Never 1-6.
ALTER TABLE "users"
  ADD CONSTRAINT "users_hsk_level_goal_range"
  CHECK ("hsk_level_goal" IS NULL OR ("hsk_level_goal" BETWEEN 1 AND 9));

-- ENTITY_USER.md: hskLevelGoal is meaningful only for students, bio only for
-- teachers. Stating it as a business rule in a doc does not stop an INSERT.
ALTER TABLE "users"
  ADD CONSTRAINT "users_hsk_level_goal_student_only"
  CHECK ("hsk_level_goal" IS NULL OR "role" = 'student');

ALTER TABLE "users"
  ADD CONSTRAINT "users_bio_teacher_only"
  CHECK ("bio" IS NULL OR "role" = 'teacher');

-- nickname is nullable but must not be blank-or-whitespace when present.
ALTER TABLE "users"
  ADD CONSTRAINT "users_nickname_not_blank"
  CHECK ("nickname" IS NULL OR btrim("nickname") <> '');
