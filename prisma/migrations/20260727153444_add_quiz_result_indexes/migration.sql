-- CreateIndex
CREATE INDEX "QuizResult_userId_date_idx" ON "QuizResult"("userId", "date");

-- CreateIndex
CREATE INDEX "QuizResult_quizId_idx" ON "QuizResult"("quizId");
