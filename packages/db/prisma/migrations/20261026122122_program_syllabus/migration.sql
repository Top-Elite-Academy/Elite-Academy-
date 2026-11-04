-- CreateTable
CREATE TABLE "syllabus_files" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'scanning',
    "scan_signature" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "syllabus_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "syllabus_files_program_id_created_at_idx" ON "syllabus_files"("program_id", "created_at");

-- AddForeignKey
ALTER TABLE "syllabus_files" ADD CONSTRAINT "syllabus_files_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_files" ADD CONSTRAINT "syllabus_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
