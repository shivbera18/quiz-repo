-- Question-bank admin-list indexes: section+difficulty equality filters,
-- createdAt desc ordering, and per-chapter lookups. Substring search stays a
-- sequential scan on purpose -- ILIKE '%term%' cannot use a btree; adding
-- pg_trgm/GIN requires superuser at init time and is tracked separately.
CREATE INDEX "QuestionBankItem_section_difficulty_idx" ON catalog."QuestionBankItem"("section", "difficulty");

-- CREATE INDEX
CREATE INDEX "QuestionBankItem_createdAt_idx" ON catalog."QuestionBankItem"("createdAt");

-- CREATE INDEX
CREATE INDEX "QuestionBankItem_chapterId_idx" ON catalog."QuestionBankItem"("chapterId");
