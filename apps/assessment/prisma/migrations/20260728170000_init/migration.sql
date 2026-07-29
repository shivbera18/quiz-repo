-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'ABANDONED');

-- CreateTable
CREATE TABLE "AttemptSnapshot" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "quizTitle" TEXT NOT NULL,
    "quizVersion" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL,
    "timeLimitSec" INTEGER NOT NULL,
    "negativeMarking" BOOLEAN NOT NULL,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL,
    "sections" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "isReconstructed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submitSource" TEXT,
    "clientIdemKey" TEXT,
    "rawScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "correctCount" INTEGER,
    "wrongCount" INTEGER,
    "unansweredCount" INTEGER,
    "negativeMarking" BOOLEAN NOT NULL,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL,
    "timeSpentMs" INTEGER,
    "scoringVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "selectedOption" INTEGER,
    "markedForReview" BOOLEAN NOT NULL DEFAULT false,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3),
    "clientSeq" BIGINT NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN,
    "awarded" DOUBLE PRECISION,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateTable (legacy: pre-Attempt scoring design, kept for its historical data only)
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScore" INTEGER NOT NULL,
    "sections" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "timeSpent" INTEGER NOT NULL,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" BIGSERIAL NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSnapshot_quizId_contentHash_key" ON "AttemptSnapshot"("quizId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_clientIdemKey_key" ON "Attempt"("userId", "clientIdemKey");

-- CreateIndex
CREATE INDEX "Attempt_userId_submittedAt_idx" ON "Attempt"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "Attempt_quizId_totalScore_idx" ON "Attempt"("quizId", "totalScore");

-- CreateIndex (hand-written, not expressible as a Prisma @@index -- enforces
-- "one live attempt per user per quiz" at the database level, not just in
-- the findFirst()-then-create() application check, which a concurrent
-- double-click can race past)
CREATE UNIQUE INDEX "attempt_one_inflight" ON "Attempt" ("userId", "quizId") WHERE "status" = 'IN_PROGRESS';

-- CreateIndex (hand-written -- the sweeper's only query. Stays tiny because
-- SUBMITTED/EXPIRED/ABANDONED attempts drop out of it entirely.)
CREATE INDEX "attempt_sweeper" ON "Attempt" ("expiresAt") WHERE "status" = 'IN_PROGRESS';

-- CreateIndex
CREATE INDEX "QuizResult_userId_date_idx" ON "QuizResult"("userId", "date");

-- CreateIndex
CREATE INDEX "QuizResult_quizId_idx" ON "QuizResult"("quizId");

-- CreateIndex (hand-written, same rationale as identity-svc's migration)
CREATE INDEX "outbox_unpublished" ON "Outbox" ("id") WHERE "publishedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AttemptSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
