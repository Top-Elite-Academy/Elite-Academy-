-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('direct', 'support', 'payments');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "kind" "ConversationKind" NOT NULL,
    "student_id" UUID NOT NULL,
    "staff_id" UUID,
    "subject" TEXT NOT NULL DEFAULT '',
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'scanning',
    "scan_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_reads" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateIndex
CREATE INDEX "conversations_staff_id_last_message_at_idx" ON "conversations"("staff_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_kind_last_message_at_idx" ON "conversations"("kind", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_student_id_kind_staff_id_key" ON "conversations"("student_id", "kind", "staff_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One Support and one Payments thread per student (NULL staff ids are distinct in the unique index above)
CREATE UNIQUE INDEX "conversations_student_team_key" ON "conversations"("student_id", "kind") WHERE "staff_id" IS NULL;
-- Direct threads have a staff member; team threads do not
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_staff_check" CHECK (("kind" = 'direct') = ("staff_id" IS NOT NULL));
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_not_self_check" CHECK ("staff_id" IS NULL OR "staff_id" <> "student_id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_check" CHECK (char_length("body") <= 2000);
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 10485760);
