@echo off
echo 🚀 Starting Neon PostgreSQL Migration...

REM Step 1: Backup current schema
echo 📋 Backing up current schema...
copy prisma\schema.prisma prisma\schema.sqlite.backup

REM Step 2: Update schema for PostgreSQL
echo 🔄 Updating schema for PostgreSQL...
(
echo // Production schema for Neon PostgreSQL
echo generator client {
echo   provider = "prisma-client-js"
echo   output   = "../lib/generated/prisma"
echo }
echo.
echo datasource db {
echo   provider = "postgresql"
echo   url      = env^("DATABASE_URL"^)
echo }
echo.
echo model User {
echo   id          String   @id @default^(uuid^(^)^)
echo   name        String
echo   email       String   @unique
echo   password    String
echo   isAdmin     Boolean
echo   userType    String
echo   createdAt   DateTime @default^(now^(^)^)
echo   lastLogin   DateTime?
echo   quizHistory QuizResult[] @relation^("UserQuizResults"^)
echo   totalQuizzes Int      @default^(0^)
echo   averageScore Int      @default^(0^)
echo }
echo.
echo model Quiz {
echo   id          String   @id @default^(uuid^(^)^)
echo   title       String
echo   description String
echo   timeLimit   Int
echo   createdAt   DateTime @default^(now^(^)^)
echo   createdBy   String
echo   sections    Json     // Native JSON for PostgreSQL
echo   questions   Json     @default^("[]"^)  // Native JSON for PostgreSQL
echo   isActive    Boolean  @default^(true^)
echo   results     QuizResult[] @relation^("QuizQuizResults"^)
echo   startTime   DateTime? // Scheduled start time
echo   endTime     DateTime? // Scheduled end time
echo   negativeMarking Boolean @default^(true^) // Enable/disable negative marking
echo   negativeMarkValue Float @default^(0.25^) // Marks deducted per wrong answer
echo }
echo.
echo model QuizResult {
echo   id        String   @id @default^(uuid^(^)^)
echo   quizId    String
echo   userId    String
echo   userName  String
echo   userEmail String
echo   date      DateTime @default^(now^(^)^)
echo   totalScore Int
echo   correctAnswers Int
echo   wrongAnswers Int
echo   unanswered Int
echo   timeSpent Int
echo   sections  Json     // Native JSON for PostgreSQL
echo   quiz      Quiz     @relation^("QuizQuizResults", fields: [quizId], references: [id]^)
echo   user      User     @relation^("UserQuizResults", fields: [userId], references: [id]^)
echo   answers   Json     @default^("[]"^) // JSON for all answers
echo   rawScore  Int      @default^(0^) // Score before negative marking
echo   positiveMarks Int  @default^(0^) // Marks earned from correct answers
echo   negativeMarks Int  @default^(0^) // Marks lost from wrong answers
echo   negativeMarking Boolean @default^(true^) // Whether negative marking was applied
echo   negativeMarkValue Float @default^(0.25^) // Value of negative marking used
echo }
echo.
echo model QuestionBankItem {
echo   id          String   @id @default^(uuid^(^)^)
echo   section     String
echo   question    String
echo   options     Json     // Native JSON for PostgreSQL
echo   correctAnswer Int
echo   explanation String?
echo   difficulty  String   @default^("medium"^)
echo   tags        Json     @default^("[]"^) // Native JSON for PostgreSQL
echo   createdAt   DateTime @default^(now^(^)^)
echo   updatedAt   DateTime @updatedAt
echo }
) > prisma\schema.prisma

REM Step 3: Generate Prisma client
echo ⚙️  Generating Prisma client for PostgreSQL...
call npx prisma generate

REM Step 4: Check environment variables
echo 🔍 Checking environment variables...
if exist .env.local (
    findstr "DATABASE_URL" .env.local >nul
    if errorlevel 1 (
        echo ❌ DATABASE_URL not found in .env.local
        echo Please add your Neon PostgreSQL connection string:
        echo DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
    ) else (
        echo ✅ DATABASE_URL found in .env.local
    )
) else (
    echo ❌ .env.local not found
    echo Creating .env.local template...
    (
    echo # Neon PostgreSQL Connection
    echo DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
    echo.
    echo # NextAuth Configuration
    echo NEXTAUTH_SECRET="your-super-secret-key-here"
    echo NEXTAUTH_URL="http://localhost:3000"
    echo.
    echo # Google Gemini API ^(Optional^)
    echo GEMINI_API_KEY="your-gemini-api-key-here"
    ) > .env.local
    echo Please update .env.local with your actual values
)

echo.
echo 🎉 Migration preparation complete!
echo.
echo Next steps:
echo 1. Update your .env.local with your Neon DATABASE_URL
echo 2. Run: npx prisma db push
echo 3. Test your application locally
echo 4. Deploy to your hosting platform
echo.
echo For detailed instructions, see NEON-DEPLOYMENT-GUIDE.md
pause
