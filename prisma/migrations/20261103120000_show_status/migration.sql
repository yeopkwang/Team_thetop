-- 공연 상태를 isActive(공개 여부) 하나에서 준비 중 / 판매 중 / 지난 공연 셋으로 나눈다.
-- 기존에 공개돼 있던 공연은 판매 중으로 옮긴다.
CREATE TYPE "ShowStatus" AS ENUM ('DRAFT', 'ON_SALE', 'ENDED');

ALTER TABLE "Show" ADD COLUMN "status" "ShowStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Show" SET "status" = 'ON_SALE' WHERE "isActive" = true;
ALTER TABLE "Show" DROP COLUMN "isActive";
