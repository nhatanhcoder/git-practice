-- AlterTable
-- Records when a student who had left a class (status = dropped) enrolled again.
-- NULL for every enrollment that has never been left and re-entered, which is why the
-- column is nullable rather than defaulted: "never rejoined" and "rejoined at time T"
-- must stay distinguishable. joined_at is deliberately left untouched on a rejoin so the
-- original enrollment date survives (INV-CLASS-06 keeps history; overwriting joined_at
-- would erase the gap between leaving and returning).
ALTER TABLE "class_enrollments" ADD COLUMN "rejoined_at" TIMESTAMP(3);
