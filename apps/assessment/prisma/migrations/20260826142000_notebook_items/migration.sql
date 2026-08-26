-- Notebook: auto-captured wrong answers + manual bookmarks, with Leitner
-- scheduling columns. Unique (user, question, kind) means re-missing a
-- question refreshes the existing entry instead of duplicating it.
CREATE TYPE "NotebookKind" AS ENUM ('WRONG_ANSWER', 'BOOKMARK');

-- CREATE TABLE
CREATE TABLE "NotebookItem" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "kind" "NotebookKind" NOT NULL,
    "section" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "selectedAnswer" INTEGER,
    "boxLevel" INTEGER NOT NULL DEFAULT 1,
    "nextPracticeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOutcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotebookItem_pkey" PRIMARY KEY ("id")
);

-- CREATE INDEX
CREATE UNIQUE INDEX "NotebookItem_userId_questionId_kind_key" ON "NotebookItem"("userId", "questionId", "kind");

-- CREATE INDEX
CREATE INDEX "NotebookItem_userId_questionId_kind_idx" ON "NotebookItem"("userId", "questionId", "kind");

-- CREATE INDEX
CREATE INDEX "NotebookItem_userId_kind_nextPracticeAt_idx" ON "NotebookItem"("userId", "kind", "nextPracticeAt");
