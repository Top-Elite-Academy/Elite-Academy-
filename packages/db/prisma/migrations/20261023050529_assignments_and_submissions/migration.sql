-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('submitted', 'returned');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'submission_returned';

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "due_week" INTEGER NOT NULL,
    "rubric" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cohort_id" UUID NOT NULL,
    "repo_url" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "scores" JSONB,
    "feedback" TEXT NOT NULL DEFAULT '',
    "score" INTEGER,
    "graded_by_id" UUID,
    "graded_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_files" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'scanning',
    "scan_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignments_lesson_id_key" ON "assignments"("lesson_id");

-- CreateIndex
CREATE INDEX "submissions_cohort_id_status_idx" ON "submissions"("cohort_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignment_id_user_id_key" ON "submissions"("assignment_id", "user_id");

-- CreateIndex
CREATE INDEX "submission_files_submission_id_idx" ON "submission_files"("submission_id");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_graded_by_id_fkey" FOREIGN KEY ("graded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity checks the schema language cannot express
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_due_week_check" CHECK ("due_week" BETWEEN 1 AND 104);
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_rubric_check" CHECK (jsonb_typeof("rubric") = 'array');
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_returned_check" CHECK ("status" <> 'returned' OR ("score" IS NOT NULL AND "returned_at" IS NOT NULL));
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_size_check" CHECK ("size_bytes" > 0);
