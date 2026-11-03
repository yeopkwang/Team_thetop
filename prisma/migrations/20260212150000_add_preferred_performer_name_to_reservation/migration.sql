-- Add preferred performer name to reservation records.
ALTER TABLE "Reservation"
ADD COLUMN "preferredPerformerName" TEXT NOT NULL DEFAULT '없음';
