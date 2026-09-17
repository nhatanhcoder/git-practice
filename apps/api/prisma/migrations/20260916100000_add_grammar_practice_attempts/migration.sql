-- Grammar reorder-practice attempts (02-foundation-grammar.md §1, option-A port 2026-09-16).
-- Hand-written: `prisma migrate dev` refuses non-interactive shells, and this table is
-- additive (no data rewrite). One row per submitted attempt; the unique index is the
-- retry-deduplication enforcement point (§8). Follows the user_study_progress style
-- (UUID PK without DB default — Prisma generates the value; snake_case; ON DELETE CASCADE).
-- CreateTable
CREATE TABLE "grammar_practice_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "grammar_id" VARCHAR(120) NOT NULL,
    "submission_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grammar_practice_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grammar_practice_attempts_user_id_grammar_id_submission_id_key" ON "grammar_practice_attempts"("user_id", "grammar_id", "submission_id");

-- CreateIndex
CREATE INDEX "grammar_practice_attempts_user_id_grammar_id_idx" ON "grammar_practice_attempts"("user_id", "grammar_id");

-- AddForeignKey
ALTER TABLE "grammar_practice_attempts" ADD CONSTRAINT "grammar_practice_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
