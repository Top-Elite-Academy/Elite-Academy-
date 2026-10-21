/*
  Warnings:

  - You are about to drop the column `failed_login_count` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locked_until` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "failed_login_count",
DROP COLUMN "locked_until",
ADD COLUMN     "totp_last_step" INTEGER;
