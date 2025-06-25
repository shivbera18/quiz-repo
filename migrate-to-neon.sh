#!/bin/bash

# Migration script for Neon PostgreSQL deployment
# This script helps migrate from SQLite to PostgreSQL

echo "🚀 Starting Neon PostgreSQL Migration..."

# Step 1: Backup current schema
echo "📋 Backing up current schema..."
cp prisma/schema.prisma prisma/schema.sqlite.backup

# Step 2: Update schema for PostgreSQL
echo "🔄 Updating schema for PostgreSQL..."
cat > prisma/schema.prisma << 'EOF'
// Production schema for Neon PostgreSQL
generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  password    String
  isAdmin     Boolean
  userType    String
  createdAt   DateTime @default(now())
  lastLogin   DateTime?
  quizHistory QuizResult[] @relation("UserQuizResults")
  totalQuizzes Int      @default(0)
  averageScore Int      @default(0)
}

model Quiz {
  id          String   @id @default(uuid())
  title       String
  description String
  timeLimit   Int
  createdAt   DateTime @default(now())
  createdBy   String
  sections    Json     // Native JSON for PostgreSQL
  questions   Json     @default("[]")  // Native JSON for PostgreSQL
  isActive    Boolean  @default(true)
  results     QuizResult[] @relation("QuizQuizResults")
  startTime   DateTime? // Scheduled start time
  endTime     DateTime? // Scheduled end time
  negativeMarking Boolean @default(true) // Enable/disable negative marking
  negativeMarkValue Float @default(0.25) // Marks deducted per wrong answer
}

model QuizResult {
  id        String   @id @default(uuid())
  quizId    String
  userId    String
  userName  String
  userEmail String
  date      DateTime @default(now())
  totalScore Int
  correctAnswers Int
  wrongAnswers Int
  unanswered Int
  timeSpent Int
  sections  Json     // Native JSON for PostgreSQL
  quiz      Quiz     @relation("QuizQuizResults", fields: [quizId], references: [id])
  user      User     @relation("UserQuizResults", fields: [userId], references: [id])
  answers   Json     @default("[]") // JSON for all answers
  rawScore  Int      @default(0) // Score before negative marking
  positiveMarks Int  @default(0) // Marks earned from correct answers
  negativeMarks Int  @default(0) // Marks lost from wrong answers
  negativeMarking Boolean @default(true) // Whether negative marking was applied
  negativeMarkValue Float @default(0.25) // Value of negative marking used
}

model QuestionBankItem {
  id          String   @id @default(uuid())
  section     String
  question    String
  options     Json     // Native JSON for PostgreSQL
  correctAnswer Int
  explanation String?
  difficulty  String   @default("medium")
  tags        Json     @default("[]") // Native JSON for PostgreSQL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
EOF

# Step 3: Generate Prisma client
echo "⚙️  Generating Prisma client for PostgreSQL..."
npx prisma generate

# Step 4: Check environment variables
echo "🔍 Checking environment variables..."
if [ -f .env.local ]; then
    if grep -q "DATABASE_URL" .env.local; then
        echo "✅ DATABASE_URL found in .env.local"
    else
        echo "❌ DATABASE_URL not found in .env.local"
        echo "Please add your Neon PostgreSQL connection string:"
        echo 'DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"'
    fi
else
    echo "❌ .env.local not found"
    echo "Creating .env.local template..."
    cat > .env.local << 'EOF'
# Neon PostgreSQL Connection
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google Gemini API (Optional)
GEMINI_API_KEY="your-gemini-api-key-here"
EOF
    echo "Please update .env.local with your actual values"
fi

echo ""
echo "🎉 Migration preparation complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with your Neon DATABASE_URL"
echo "2. Run: npx prisma db push"
echo "3. Test your application locally"
echo "4. Deploy to your hosting platform"
echo ""
echo "For detailed instructions, see NEON-DEPLOYMENT-GUIDE.md"
