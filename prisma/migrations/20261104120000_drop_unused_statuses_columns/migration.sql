-- 한 번도 쓰지 않던 상태값과 칸을 지운다.
-- 예매 REQUESTED·REFUND_REQUESTED, 환불 REQUESTED는 코드가 만든 적이 없지만, 혹시 남은 행이 있으면 같은 뜻의 값으로 옮긴다.
UPDATE "Reservation" SET "status" = 'PAYMENT_PENDING' WHERE "status" = 'REQUESTED';
UPDATE "Reservation" SET "status" = 'REFUND_PENDING' WHERE "status" = 'REFUND_REQUESTED';
UPDATE "Refund" SET "status" = 'PENDING' WHERE "status" = 'REQUESTED';

-- 작전명문 4 포스터를 줄인 파일로 바꿨다(5MB PNG → 350KB JPG).
UPDATE "Show" SET "posterUrl" = '/posters/operation-moon-4.jpg' WHERE "posterUrl" = '/uploads/sample-poster.png';

-- AlterEnum
BEGIN;
CREATE TYPE "RefundStatus_new" AS ENUM ('PENDING', 'REFUNDED');
ALTER TABLE "Refund" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus_new" USING ("status"::text::"RefundStatus_new");
ALTER TYPE "RefundStatus" RENAME TO "RefundStatus_old";
ALTER TYPE "RefundStatus_new" RENAME TO "RefundStatus";
DROP TYPE "RefundStatus_old";
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReservationStatus_new" AS ENUM ('PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');
ALTER TABLE "Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus_new" USING ("status"::text::"ReservationStatus_new");
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "ReservationStatus_old";
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'PAYMENT_PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "ipAddress",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'PAYMENT_PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "image";

