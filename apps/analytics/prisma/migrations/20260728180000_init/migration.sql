-- CreateTable
CREATE TABLE "DimUser" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL,
    "registeredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DimUser_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DimQuiz" (
    "quizId" TEXT NOT NULL,
    "quizVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "chapterId" TEXT,
    "subjectId" TEXT,
    "questionCount" INTEGER NOT NULL,
    "sectionNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DimQuiz_pkey" PRIMARY KEY ("quizId")
);

-- CreateTable
CREATE TABLE "DimChapter" (
    "chapterId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DimChapter_pkey" PRIMARY KEY ("chapterId")
);

-- CreateTable
CREATE TABLE "DimSubject" (
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DimSubject_pkey" PRIMARY KEY ("subjectId")
);

-- CreateTable
CREATE TABLE "AttemptFact" (
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "chapterId" TEXT,
    "subjectId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "submittedDate" TIMESTAMP(3) NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "wrongCount" INTEGER NOT NULL,
    "unansweredCount" INTEGER NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,
    "submitSource" TEXT NOT NULL,
    "scoringVersion" INTEGER NOT NULL,

    CONSTRAINT "AttemptFact_pkey" PRIMARY KEY ("attemptId")
);

-- CreateTable
CREATE TABLE "AttemptSectionFact" (
    "attemptId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "subjectId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "unanswered" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "scorePct" DOUBLE PRECISION NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,

    CONSTRAINT "AttemptSectionFact_pkey" PRIMARY KEY ("attemptId","section")
);

-- CreateTable
CREATE TABLE "QuestionStat" (
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "wrong" INTEGER NOT NULL DEFAULT 0,
    "unanswered" INTEGER NOT NULL DEFAULT 0,
    "sumTimeMs" BIGINT NOT NULL DEFAULT 0,
    "optionCounts" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionStat_pkey" PRIMARY KEY ("quizId","questionId")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "sumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumTimeMs" BIGINT NOT NULL DEFAULT 0,
    "bestScore" DOUBLE PRECISION,
    "avgScore" DOUBLE PRECISION,
    "last20Scores" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "last20Avg" DOUBLE PRECISION,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "QuizStats" (
    "quizId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "abandonCount" INTEGER NOT NULL DEFAULT 0,
    "sumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumTimeMs" BIGINT NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "avgTimeMs" INTEGER,
    "bestScore" DOUBLE PRECISION,
    "passCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizStats_pkey" PRIMARY KEY ("quizId")
);

-- CreateTable
CREATE TABLE "DailyRollup" (
    "bucketDate" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL DEFAULT '__all__',
    "subjectId" TEXT NOT NULL DEFAULT '__all__',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "sumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumTimeMs" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "DailyRollup_pkey" PRIMARY KEY ("bucketDate","quizId","subjectId")
);

-- CreateTable
CREATE TABLE "UserDailyActivity" (
    "userId" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sumTimeMs" BIGINT NOT NULL DEFAULT 0,
    "bestScore" DOUBLE PRECISION,

    CONSTRAINT "UserDailyActivity_pkey" PRIMARY KEY ("userId","activityDate")
);

-- CreateTable
CREATE TABLE "QuizUserSeen" (
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "QuizUserSeen_pkey" PRIMARY KEY ("quizId","userId")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "objectKey" TEXT,
    "rowCount" INTEGER,
    "bytes" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "eventId" TEXT NOT NULL,
    "consumerGroup" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "BackfillState" (
    "job" TEXT NOT NULL,
    "lastCursor" TEXT,
    "doneRows" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackfillState_pkey" PRIMARY KEY ("job")
);

-- CreateIndex
CREATE INDEX "AttemptFact_userId_submittedAt_idx" ON "AttemptFact"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "AttemptFact_quizId_submittedAt_idx" ON "AttemptFact"("quizId", "submittedAt");

-- CreateIndex
CREATE INDEX "AttemptFact_submittedDate_idx" ON "AttemptFact"("submittedDate");

-- CreateIndex
CREATE INDEX "AttemptFact_quizId_totalScore_idx" ON "AttemptFact"("quizId", "totalScore");

-- CreateIndex
CREATE INDEX "AttemptSectionFact_userId_section_submittedAt_idx" ON "AttemptSectionFact"("userId", "section", "submittedAt");

-- CreateIndex
CREATE INDEX "ProcessedEvent_consumerGroup_idx" ON "ProcessedEvent"("consumerGroup");
