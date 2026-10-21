-- CreateEnum
CREATE TYPE "ProgramSubject" AS ENUM ('web', 'data', 'ai', 'devops');

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "subject" "ProgramSubject" NOT NULL DEFAULT 'web';
