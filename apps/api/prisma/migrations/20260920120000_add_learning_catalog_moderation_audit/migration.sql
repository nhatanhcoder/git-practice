ALTER TABLE "learning_paths"
ADD COLUMN "restored_by_id" UUID,
ADD COLUMN "restored_at" TIMESTAMP(3);

CREATE INDEX "learning_paths_restored_by_id_restored_at_idx"
ON "learning_paths"("restored_by_id", "restored_at");

ALTER TABLE "learning_paths"
ADD CONSTRAINT "learning_paths_restored_by_id_fkey"
FOREIGN KEY ("restored_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
