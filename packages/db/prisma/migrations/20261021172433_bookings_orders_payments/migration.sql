-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('held', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'terms';

-- AlterTable
ALTER TABLE "mentor_profiles" ADD COLUMN     "is_example" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "session_minutes" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'held',
    "hold_expires_at" TIMESTAMP(3),
    "zoom_link" TEXT,
    "credit_id" UUID,
    "order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "amount_agorot" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "provider_txn_id" TEXT,
    "failure_reason" TEXT,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "receipt_file_id" UUID,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_credits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "order_id" UUID,
    "mentor_id" UUID,
    "total" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" UUID,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_slots_mentor_id_idx" ON "availability_slots"("mentor_id");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_mentor_id_start_at_idx" ON "bookings"("mentor_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_provider_txn_id_key" ON "orders"("provider_txn_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "package_credits_user_id_idx" ON "package_credits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider", "event_id");

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "package_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written protections
-- ---------------------------------------------------------------------------

-- One active booking per mentor and start time: two people can never hold or
-- book the same slot, even if they click at the same moment (race-safe).
CREATE UNIQUE INDEX "bookings_one_active_per_slot"
  ON "bookings" ("mentor_id", "start_at")
  WHERE "status" IN ('held', 'confirmed');

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_end_after_start" CHECK ("end_at" > "start_at");
ALTER TABLE "orders" ADD CONSTRAINT "orders_amount_positive" CHECK ("amount_agorot" > 0);
ALTER TABLE "package_credits"
  ADD CONSTRAINT "package_credits_used_valid" CHECK ("used" >= 0 AND "used" <= "total");
ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_weekday_valid" CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "packages"
  ADD CONSTRAINT "packages_values_positive" CHECK ("sessions" > 0 AND "price_agorot" > 0 AND "session_minutes" > 0);
