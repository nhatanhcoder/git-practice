-- CreateEnum
CREATE TYPE "supplement_source_type" AS ENUM ('learning_unit', 'grammar_point');

-- CreateTable
CREATE TABLE "supplemental_practice" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "source_type" "supplement_source_type" NOT NULL,
    "source_key" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplemental_practice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplemental_practice_lesson_id_order_index_idx" ON "supplemental_practice"("lesson_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "supplemental_practice_lesson_id_source_type_source_key_key" ON "supplemental_practice"("lesson_id", "source_type", "source_key");

-- CreateIndex
CREATE UNIQUE INDEX "supplemental_practice_lesson_id_order_index_key" ON "supplemental_practice"("lesson_id", "order_index");

-- AddForeignKey
ALTER TABLE "supplemental_practice" ADD CONSTRAINT "supplemental_practice_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
