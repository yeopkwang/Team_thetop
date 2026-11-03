-- 환불 요청 때 관객이 적는 계좌
ALTER TABLE "Refund" ADD COLUMN "refundBank" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Refund" ADD COLUMN "refundAccount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Refund" ADD COLUMN "refundHolder" TEXT NOT NULL DEFAULT '';

-- 작업 기록(최근 순)과 로그인 실패 세기
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_entityId_createdAt_idx" ON "AuditLog"("action", "entityId", "createdAt");
