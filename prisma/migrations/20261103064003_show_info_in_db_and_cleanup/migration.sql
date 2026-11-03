/*
  Warnings:

  - You are about to drop the column `paymentMarkedAt` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `paymentNote` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReviewStatus` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReviewedAt` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReviewedByUserId` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `coverImage` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Show` table. All the data in the column will be lost.
  - You are about to drop the column `soldQty` on the `ShowSession` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PhotoAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PhotoPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecordPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefundAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoleRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "PhotoAsset" DROP CONSTRAINT "PhotoAsset_photoPostId_fkey";

-- DropForeignKey
ALTER TABLE "PhotoPost" DROP CONSTRAINT "PhotoPost_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "PhotoPost" DROP CONSTRAINT "PhotoPost_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "RecordPost" DROP CONSTRAINT "RecordPost_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "RefundAccount" DROP CONSTRAINT "RefundAccount_refundId_fkey";

-- DropForeignKey
ALTER TABLE "RoleRequest" DROP CONSTRAINT "RoleRequest_handledByUserId_fkey";

-- DropForeignKey
ALTER TABLE "RoleRequest" DROP CONSTRAINT "RoleRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "paymentMarkedAt",
DROP COLUMN "paymentNote",
DROP COLUMN "paymentReviewStatus",
DROP COLUMN "paymentReviewedAt",
DROP COLUMN "paymentReviewedByUserId";

-- AlterTable
ALTER TABLE "Show" DROP COLUMN "content",
DROP COLUMN "coverImage",
DROP COLUMN "description",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "audienceInfo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactTag" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dateLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "introText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "notice" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentBank" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentHolder" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundContact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salesText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "timeLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "timeSubLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "venue" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "venueAddress" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ShowSession" DROP COLUMN "soldQty";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "PhotoAsset";

-- DropTable
DROP TABLE "PhotoPost";

-- DropTable
DROP TABLE "RecordPost";

-- DropTable
DROP TABLE "RefundAccount";

-- DropTable
DROP TABLE "RoleRequest";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "TicketTemplate";

-- DropTable
DROP TABLE "VerificationToken";

-- DropEnum
DROP TYPE "PaymentReviewStatus";

-- DropEnum
DROP TYPE "RoleRequestStatus";

-- DropEnum
DROP TYPE "TicketTemplateScope";
