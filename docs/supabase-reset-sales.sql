-- Supabase SQL Editor에서 실행한다. 예매·티켓·검표·환불 기록을 모두 지운다.
-- 회원, 관리자 계정, 공연 정보는 남는다. 되돌릴 수 없으니 실행 전에 꼭 확인할 것.
BEGIN;

-- 참조하는 쪽부터 지운다
DELETE FROM "CheckIn";
DELETE FROM "Refund";
DELETE FROM "Ticket";
DELETE FROM "Reservation";

COMMIT;
