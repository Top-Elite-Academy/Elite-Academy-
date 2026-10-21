-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "audience" JSONB,
ADD COLUMN     "outcomes" JSONB,
ADD COLUMN     "overview" JSONB,
ADD COLUMN     "teaching_languages" "Locale"[];

-- CreateTable
CREATE TABLE "program_modules" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "week_from" INTEGER NOT NULL,
    "week_to" INTEGER NOT NULL,
    "topics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_modules_program_id_sort_order_key" ON "program_modules"("program_id", "sort_order");

-- AddForeignKey
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
