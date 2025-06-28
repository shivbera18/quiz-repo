const fs = require('fs')

async function switchToDevelopmentDB() {
  console.log('🔄 Switching to PostgreSQL development database...\n')

  try {
    // Backup current schema
    console.log('1. Backing up current schema...')
    const currentSchema = fs.readFileSync('prisma/schema.prisma', 'utf8')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.writeFileSync(`prisma/schema.prisma.backup.${timestamp}`, currentSchema)
    console.log('   ✅ Current schema backed up')

    // Create development schema
    console.log('2. Creating development schema...')
    const developmentSchema = `// Development schema with PostgreSQL
generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://quizdb_owner:npg_5ITBoeNYp1gR@ep-blue-sound-a8tppvlf-pooler.eastus2.azure.neon.tech/quizdb?sslmode=require&channel_binding=require"
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
  sections    String   // JSON string for PostgreSQL
  questions   String   @default("[]")  // JSON string for PostgreSQL
  isActive    Boolean  @default(true)
  results     QuizResult[] @relation("QuizQuizResults")
  startTime   DateTime? // Scheduled start time
  endTime     DateTime? // Scheduled end time
  negativeMarking Boolean @default(true) // Enable/disable negative marking
  negativeMarkValue Float @default(0.25) // Marks deducted per wrong answer
  chapterId   String?
  chapter     Chapter? @relation(fields: [chapterId], references: [id])
}

model QuizResult {
  id        String   @id @default(uuid())
  quizId    String
  userId    String
  userName  String
  userEmail String
  date      DateTime @default(now())
  totalScore Int
  sections  String   // JSON string for PostgreSQL
  answers   String   // JSON string for PostgreSQL
  timeSpent Int
  user      User   @relation(fields: [userId], references: [id], name: "UserQuizResults")
  quiz      Quiz   @relation(fields: [quizId], references: [id], name: "QuizQuizResults")
}

model Subject {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  icon        String?   
  color       String?   
  chapters    Chapter[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Chapter {
  id          String     @id @default(uuid())
  name        String
  description String?
  subjectId   String
  subject     Subject    @relation(fields: [subjectId], references: [id])
  questions   QuestionBankItem[]
  quizzes     Quiz[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model QuestionBankItem {
  id           String   @id @default(uuid())
  section      String   // "reasoning", "quantitative", "english", etc.
  question     String
  options      String   // JSON string array of 4 options
  correctAnswer Int     // Index 0-3
  explanation  String   @default("")
  difficulty   String   @default("medium") // "easy", "medium", "hard"
  tags         String   @default("[]") // JSON string array of tags
  image        String   @default("") // Base64 or URL
  source       String   @default("") // Source of the question
  isVerified   Boolean  @default(false) // Admin verification status
  usageCount   Int      @default(0) // How many times used in quizzes
  createdBy    String
  chapterId    String?
  chapter      Chapter? @relation(fields: [chapterId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
`

    fs.writeFileSync('prisma/schema.prisma', developmentSchema)
    console.log('   ✅ Development schema created')

    console.log('\n🎉 Database switch completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Run: npx prisma db push')
    console.log('   3. Run: node setup-development-db.js (to seed initial data)')
    console.log('   4. Restart your development server')
    
  } catch (error) {
    console.error('❌ Database switch failed:', error)
  }
}

switchToDevelopmentDB()
