-- Rename the two camelCase columns missed in the previous migration so every
-- column follows the repo snake_case convention (matching all other tables).
ALTER TABLE "attempts" RENAME COLUMN "totalScore" TO "total_score";
ALTER TABLE "attempts" RENAME COLUMN "maxScore" TO "max_score";
