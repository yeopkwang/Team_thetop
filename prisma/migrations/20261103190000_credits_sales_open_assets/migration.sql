-- 크레딧(공연자 명단), 티켓 오픈 일시, 관리자가 올리는 포스터 이미지 저장소.
-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "credits" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salesOpenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

