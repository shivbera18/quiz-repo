const { PrismaClient } = require('./lib/generated/prisma')
const fs = require('fs')
const path = require('path')

// Current SQLite database
const sqlitePrisma = new PrismaClient()

// Development PostgreSQL database
const { PrismaClient: PostgresPrismaClient } = require('@prisma/client')

async function migrateToPostgreSQL() {
  console.log('🔄 Starting migration from SQLite to PostgreSQL development database...\n')

  let postgresPrisma
  
  try {
    // First, backup current SQLite data
    console.log('1. Creating backup of current SQLite database...')
    await backupSQLiteData()
    
    // Connect to PostgreSQL with the development URL
    console.log('\n2. Connecting to PostgreSQL development database...')
    postgresPrisma = new PostgresPrismaClient({
      datasources: {
        db: {
          url: 'postgresql://quizdb_owner:npg_5ITBoeNYp1gR@ep-blue-sound-a8tppvlf-pooler.eastus2.azure.neon.tech/quizdb?sslmode=require&channel_binding=require'
        }
      }
    })
    
    await postgresPrisma.$connect()
    console.log('   ✅ Connected to PostgreSQL development database')
    
    // Clear existing data in PostgreSQL (development reset)
    console.log('\n3. Clearing existing development data...')
    await clearPostgresData(postgresPrisma)
    
    // Migrate data from SQLite to PostgreSQL
    console.log('\n4. Migrating data to PostgreSQL...')
    await migrateData(sqlitePrisma, postgresPrisma)
    
    // Update schema.prisma for development
    console.log('\n5. Updating schema.prisma for development...')
    await updateSchemaForDevelopment()
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Run: npx prisma db push (to sync schema with PostgreSQL)')
    console.log('   3. Restart your development server')
    console.log('   4. Your SQLite backup is available in: database-backup/')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\nError details:', error.message)
  } finally {
    await sqlitePrisma.$disconnect()
    if (postgresPrisma) {
      await postgresPrisma.$disconnect()
    }
  }
}

async function backupSQLiteData() {
  // Get all data from SQLite
  const [users, subjects, chapters, quizzes, quizResults, questionBankItems] = await Promise.all([
    sqlitePrisma.user.findMany(),
    sqlitePrisma.subject.findMany(),
    sqlitePrisma.chapter.findMany(),
    sqlitePrisma.quiz.findMany(),
    sqlitePrisma.quizResult.findMany(),
    sqlitePrisma.questionBankItem.findMany()
  ])
  
  const backupData = {
    users,
    subjects,
    chapters,
    quizzes,
    quizResults,
    questionBankItems,
    timestamp: new Date().toISOString(),
    source: 'SQLite',
    totalRecords: users.length + subjects.length + chapters.length + quizzes.length + quizResults.length + questionBankItems.length
  }
  
  // Create backup directory
  const backupDir = 'database-backup'
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  const backupFile = path.join(backupDir, `sqlite-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
  
  console.log('   ✅ SQLite data backed up to:', backupFile)
  console.log('   📊 Backup contains:')
  console.log('      - Users:', users.length)
  console.log('      - Subjects:', subjects.length)
  console.log('      - Chapters:', chapters.length)
  console.log('      - Quizzes:', quizzes.length)
  console.log('      - Quiz Results:', quizResults.length)
  console.log('      - Question Bank Items:', questionBankItems.length)
  
  return backupData
}

async function clearPostgresData(postgres) {
  // Clear tables in correct order (respecting foreign keys)
  await postgres.quizResult.deleteMany()
  await postgres.questionBankItem.deleteMany()
  await postgres.quiz.deleteMany()
  await postgres.chapter.deleteMany()
  await postgres.subject.deleteMany()
  await postgres.user.deleteMany()
  
  console.log('   ✅ PostgreSQL development database cleared')
}

async function migrateData(sqlite, postgres) {
  // Migrate users first
  const users = await sqlite.user.findMany()
  if (users.length > 0) {
    for (const user of users) {
      await postgres.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          isAdmin: user.isAdmin,
          userType: user.userType,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          totalQuizzes: user.totalQuizzes,
          averageScore: user.averageScore
        }
      })
    }
    console.log('   ✅ Migrated users:', users.length)
  }
  
  // Migrate subjects
  const subjects = await sqlite.subject.findMany()
  if (subjects.length > 0) {
    for (const subject of subjects) {
      await postgres.subject.create({
        data: {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          icon: subject.icon,
          color: subject.color,
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt
        }
      })
    }
    console.log('   ✅ Migrated subjects:', subjects.length)
  }
  
  // Migrate chapters
  const chapters = await sqlite.chapter.findMany()
  if (chapters.length > 0) {
    for (const chapter of chapters) {
      await postgres.chapter.create({
        data: {
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          subjectId: chapter.subjectId,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt
        }
      })
    }
    console.log('   ✅ Migrated chapters:', chapters.length)
  }
  
  // Migrate quizzes
  const quizzes = await sqlite.quiz.findMany()
  if (quizzes.length > 0) {
    for (const quiz of quizzes) {
      await postgres.quiz.create({
        data: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          createdAt: quiz.createdAt,
          createdBy: quiz.createdBy,
          sections: quiz.sections,
          questions: quiz.questions,
          isActive: quiz.isActive,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          negativeMarking: quiz.negativeMarking,
          negativeMarkValue: quiz.negativeMarkValue,
          chapterId: quiz.chapterId
        }
      })
    }
    console.log('   ✅ Migrated quizzes:', quizzes.length)
  }
  
  // Migrate quiz results
  const quizResults = await sqlite.quizResult.findMany()
  if (quizResults.length > 0) {
    for (const result of quizResults) {
      await postgres.quizResult.create({
        data: {
          id: result.id,
          quizId: result.quizId,
          userId: result.userId,
          userName: result.userName,
          userEmail: result.userEmail,
          date: result.date,
          totalScore: result.totalScore,
          sections: result.sections,
          answers: result.answers,
          timeSpent: result.timeSpent
        }
      })
    }
    console.log('   ✅ Migrated quiz results:', quizResults.length)
  }
  
  // Migrate question bank items
  const questionBankItems = await sqlite.questionBankItem.findMany()
  if (questionBankItems.length > 0) {
    for (const item of questionBankItems) {
      await postgres.questionBankItem.create({
        data: {
          id: item.id,
          section: item.section,
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          difficulty: item.difficulty,
          tags: item.tags,
          image: item.image,
          source: item.source,
          isVerified: item.isVerified,
          usageCount: item.usageCount,
          createdBy: item.createdBy,
          chapterId: item.chapterId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      })
    }
    console.log('   ✅ Migrated question bank items:', questionBankItems.length)
  }
}

async function updateSchemaForDevelopment() {
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

  // Backup original schema
  const originalSchema = fs.readFileSync('prisma/schema.prisma', 'utf8')
  fs.writeFileSync('prisma/schema.prisma.sqlite.backup', originalSchema)
  
  // Write development schema
  fs.writeFileSync('prisma/schema.prisma', developmentSchema)
  
  console.log('   ✅ Updated schema.prisma for PostgreSQL development')
  console.log('   📁 Original SQLite schema backed up to: prisma/schema.prisma.sqlite.backup')
}

// Run the migration
migrateToPostgreSQL()
