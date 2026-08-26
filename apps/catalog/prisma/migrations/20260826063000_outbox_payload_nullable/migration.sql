-- Deletes of subjects/chapters/quizzes are emitted as tombstones on their
-- compacted change topics (Kafka null value, keyed by entity id), so a
-- replay-from-offset-0 rebuild can no longer resurrect deleted entities.
-- The outbox payload column must therefore accept NULL.
ALTER TABLE "Outbox" ALTER COLUMN "payload" DROP NOT NULL;
