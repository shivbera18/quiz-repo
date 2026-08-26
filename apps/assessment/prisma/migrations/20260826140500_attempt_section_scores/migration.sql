-- Per-section breakdown persisted at scoring time so attempt-list reads
-- (history, dashboard, analytics overviews) never need one result fetch per
-- attempt. Nullable: attempts scored before this column existed simply have
-- no breakdown and render without it.
ALTER TABLE "Attempt" ADD COLUMN "sectionScores" JSONB;
