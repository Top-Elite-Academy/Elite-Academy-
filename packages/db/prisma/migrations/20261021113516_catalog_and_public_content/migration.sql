-- CreateEnum
CREATE TYPE "ProgramLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('open', 'full', 'running', 'finished');

-- CreateEnum
CREATE TYPE "MentorKind" AS ENUM ('instructor', 'career');

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "level" "ProgramLevel" NOT NULL,
    "length_weeks" INTEGER,
    "tags" TEXT[],
    "is_top" BOOLEAN NOT NULL DEFAULT false,
    "top_order" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "price_agorot" INTEGER,
    "instructor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "schedule" JSONB,
    "seats_total" INTEGER NOT NULL,
    "seats_taken" INTEGER NOT NULL DEFAULT 0,
    "status" "CohortStatus" NOT NULL DEFAULT 'open',
    "zoom_series_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "user_id" UUID,
    "kind" "MentorKind" NOT NULL,
    "name" JSONB NOT NULL,
    "role" JSONB NOT NULL,
    "bio" JSONB NOT NULL,
    "languages" "Locale"[],
    "photo_path" TEXT,
    "session_minutes" INTEGER NOT NULL DEFAULT 60,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "program_id" UUID,
    "question" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "success_stories" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "person_name" TEXT NOT NULL,
    "program_label" JSONB NOT NULL,
    "outcome" JSONB,
    "quote" JSONB NOT NULL,
    "photo_path" TEXT,
    "program_id" UUID,
    "consent_id" UUID,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "is_example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug");

-- CreateIndex
CREATE INDEX "cohorts_program_id_start_date_idx" ON "cohorts"("program_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_slug_key" ON "mentor_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faqs_key_key" ON "faqs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "success_stories_key_key" ON "success_stories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "success_stories_consent_id_key" ON "success_stories"("consent_id");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "mentor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
