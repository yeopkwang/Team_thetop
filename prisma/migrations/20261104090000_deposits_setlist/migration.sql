-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cancelReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "depositorName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "paymentHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "setlist" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "setlistPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");

