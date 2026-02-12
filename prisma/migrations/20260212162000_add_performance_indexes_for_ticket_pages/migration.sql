-- Improve latency for auth/session role checks and my ticket queries.
CREATE INDEX IF NOT EXISTS "UserRole_userId_isActive_expiresAt_idx"
ON "UserRole" ("userId", "isActive", "expiresAt");

CREATE INDEX IF NOT EXISTS "Reservation_userId_createdAt_idx"
ON "Reservation" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Ticket_reservationId_status_createdAt_idx"
ON "Ticket" ("reservationId", "status", "createdAt");
