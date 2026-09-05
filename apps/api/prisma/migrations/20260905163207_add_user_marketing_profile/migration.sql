-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('female', 'male', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "Occupation" AS ENUM ('student', 'office_worker', 'teacher', 'freelancer', 'other');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('study_abroad', 'work', 'certificate', 'hobby', 'other');

-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('email', 'sms', 'zalo');

-- CreateTable
CREATE TABLE "user_marketing_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "birth_year" INTEGER,
    "gender" "Gender",
    "province" VARCHAR(100),
    "phone" VARCHAR(20),
    "occupation" "Occupation",
    "learning_goal" "LearningGoal",
    "current_level" INTEGER,
    "referral_source" VARCHAR(100),
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(150),
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_channels" "MarketingChannel"[],
    "consent_version" VARCHAR(20),
    "consented_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "guardian_consent_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_marketing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_marketing_profiles_user_id_key" ON "user_marketing_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_marketing_profiles_marketing_consent_idx" ON "user_marketing_profiles"("marketing_consent");

-- CreateIndex
CREATE INDEX "user_marketing_profiles_learning_goal_idx" ON "user_marketing_profiles"("learning_goal");

-- AddForeignKey
ALTER TABLE "user_marketing_profiles" ADD CONSTRAINT "user_marketing_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
