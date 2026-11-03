-- Speed up admin reservation list ordering and pagination.
CREATE INDEX IF NOT EXISTS "Reservation_createdAt_id_idx"
ON "Reservation" ("createdAt", "id");
