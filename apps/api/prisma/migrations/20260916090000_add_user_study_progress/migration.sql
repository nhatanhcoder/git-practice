-- Self-study studied-state (02-foundation-grammar.md §1, D2-approved 2026-09-16).
-- Hand-written: `prisma migrate dev` refuses non-interactive shells, and this
-- table is additive (no data rewrite), so the SQL below is exactly what the
-- schema diff mandates. Follows the notifications-table style in
-- 20260905044330 (UUID PK without DB default — Prisma generates the value;
-- snake_case columns; ON DELETE CASCADE to User).
-- CreateTable
CREATE TABLE "user_study_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content_kind" VARCHAR(20) NOT NULL,
    "content_key" VARCHAR(150) NOT NULL,
    "studied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_study_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_study_progress_user_id_content_kind_content_key_key" ON "user_study_progress"("user_id", "content_kind", "content_key");

-- CreateIndex
CREATE INDEX "user_study_progress_user_id_idx" ON "user_study_progress"("user_id");

-- AddForeignKey
ALTER TABLE "user_study_progress" ADD CONSTRAINT "user_study_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
