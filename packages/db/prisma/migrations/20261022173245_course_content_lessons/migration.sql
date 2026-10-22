-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('uploading', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "LessonFileKind" AS ENUM ('material', 'exercise');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('scanning', 'clean', 'infected', 'failed');

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "module_id" UUID,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "status" "LessonStatus" NOT NULL DEFAULT 'draft',
    "available_from_week" INTEGER,
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_videos" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_video_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "duration_sec" INTEGER,
    "status" "VideoStatus" NOT NULL DEFAULT 'uploading',
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_files" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "kind" "LessonFileKind" NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'scanning',
    "scan_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "position_sec" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("user_id","lesson_id")
);

-- CreateIndex
CREATE INDEX "lessons_program_id_position_idx" ON "lessons"("program_id", "position");

-- CreateIndex
CREATE INDEX "lesson_videos_lesson_id_position_idx" ON "lesson_videos"("lesson_id", "position");

-- CreateIndex
CREATE INDEX "lesson_files_lesson_id_idx" ON "lesson_files"("lesson_id");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "program_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_videos" ADD CONSTRAINT "lesson_videos_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: rules the database enforces too (the API validates the same).
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_title_length" CHECK (char_length("title") BETWEEN 1 AND 200),
  ADD CONSTRAINT "lessons_about_length" CHECK (char_length("about") <= 5000),
  ADD CONSTRAINT "lessons_position_positive" CHECK ("position" >= 1),
  ADD CONSTRAINT "lessons_week_positive" CHECK ("available_from_week" IS NULL OR "available_from_week" >= 1);
ALTER TABLE "lesson_videos"
  ADD CONSTRAINT "lesson_videos_size_positive" CHECK ("size_bytes" > 0);
ALTER TABLE "lesson_files"
  ADD CONSTRAINT "lesson_files_size_valid" CHECK ("size_bytes" > 0 AND "size_bytes" <= 104857600);
ALTER TABLE "lesson_progress"
  ADD CONSTRAINT "lesson_progress_position_valid" CHECK ("position_sec" >= 0);
