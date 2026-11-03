-- Use in Supabase SQL Editor. This will reset ticket sales status.
BEGIN;

-- 1) Remove dependent records first (FK-safe order)
DELETE FROM "CheckIn";
DELETE FROM "RefundAccount";
DELETE FROM "Refund";
DELETE FROM "Ticket";

-- 2) Remove all reservations (판매/예매 현황 초기화)
DELETE FROM "Reservation";

-- 3) Reset sold count in all sessions
UPDATE "ShowSession"
SET "soldQty" = 0;

COMMIT;
