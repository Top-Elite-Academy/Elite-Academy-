-- AlterTable
ALTER TABLE "mentor_profiles" ADD COLUMN     "skills" JSONB;

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "MentorKind" NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price_agorot" INTEGER NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");
