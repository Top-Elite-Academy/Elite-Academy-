-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('student', 'mentor');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'session_booked';
ALTER TYPE "NotificationType" ADD VALUE 'session_cancelled';
ALTER TYPE "NotificationType" ADD VALUE 'session_rescheduled';
ALTER TYPE "NotificationType" ADD VALUE 'session_notes';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" "CancelledBy",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "notes_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mentor_profiles" ADD COLUMN     "break_minutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "min_notice_hours" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "refund_requested_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mentor_time_off" (
    "id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_time_off_mentor_id_end_date_idx" ON "mentor_time_off"("mentor_id", "end_date");

-- AddForeignKey
ALTER TABLE "mentor_time_off" ADD CONSTRAINT "mentor_time_off_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: rules the database enforces too.
ALTER TABLE "mentor_profiles"
  ADD CONSTRAINT "mentor_profiles_break_valid" CHECK ("break_minutes" BETWEEN 0 AND 120),
  ADD CONSTRAINT "mentor_profiles_notice_valid" CHECK ("min_notice_hours" BETWEEN 0 AND 336);
ALTER TABLE "mentor_time_off"
  ADD CONSTRAINT "mentor_time_off_range_valid" CHECK ("end_date" >= "start_date");
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_notes_length" CHECK ("notes" IS NULL OR char_length("notes") <= 2000);
