const { PrismaClient } = require('../lib/generated/prisma')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function restoreDatabase() {
  console.log('🔄 Starting database restore...')
  
  try {
    const backupPath = __dirname
    
    // Read backup files
    const users = JSON.parse(fs.readFileSync(path.join(backupPath, 'users.json'), 'utf8'))
    const subjects = JSON.parse(fs.readFileSync(path.join(backupPath, 'subjects.json'), 'utf8'))
    const chapters = JSON.parse(fs.readFileSync(path.join(backupPath, 'chapters.json'), 'utf8'))
    const questionBankItems = JSON.parse(fs.readFileSync(path.join(backupPath, 'question-bank-items.json'), 'utf8'))
    const quizzes = JSON.parse(fs.readFileSync(path.join(backupPath, 'quizzes.json'), 'utf8'))
    const quizResults = JSON.parse(fs.readFileSync(path.join(backupPath, 'quiz-results.json'), 'utf8'))
    
    console.log('📂 Backup files read successfully')
    
    // Clear existing data (optional - uncomment if needed)
    // await prisma.quizResult.deleteMany()
    // await prisma.quiz.deleteMany()
    // await prisma.questionBankItem.deleteMany()
    // await prisma.chapter.deleteMany()
    // await prisma.subject.deleteMany()
    // await prisma.user.deleteMany()
    
    // Restore Users
    console.log('1. Restoring Users...')
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          isAdmin: user.isAdmin,
          userType: user.userType,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          totalQuizzes: user.totalQuizzes,
          averageScore: user.averageScore
        }
      })
    }
    console.log(`   ✅ ${users.length} users restored`)
    
    // Restore Subjects (without chapters first)
    console.log('2. Restoring Subjects...')
    for (const subject of subjects) {
      await prisma.subject.create({
        data: {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          icon: subject.icon,
          color: subject.color,
          createdAt: new Date(subject.createdAt),
          updatedAt: new Date(subject.updatedAt)
        }
      })
    }
    console.log(`   ✅ ${subjects.length} subjects restored`)
    
    // Restore Chapters
    console.log('3. Restoring Chapters...')
    for (const chapter of chapters) {
      await prisma.chapter.create({
        data: {
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          subjectId: chapter.subjectId,
          createdAt: new Date(chapter.createdAt),
          updatedAt: new Date(chapter.updatedAt)
        }
      })
    }
    console.log(`   ✅ ${chapters.length} chapters restored`)
    
    // Restore Question Bank Items
    console.log('4. Restoring Question Bank Items...')
    for (const item of questionBankItems) {
      await prisma.questionBankItem.create({
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
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }
      })
    }
    console.log(`   ✅ ${questionBankItems.length} question bank items restored`)
    
    // Restore Quizzes
    console.log('5. Restoring Quizzes...')
    for (const quiz of quizzes) {
      await prisma.quiz.create({
        data: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          createdAt: new Date(quiz.createdAt),
          createdBy: quiz.createdBy,
          sections: quiz.sections,
          questions: quiz.questions,
          isActive: quiz.isActive,
          startTime: quiz.startTime ? new Date(quiz.startTime) : null,
          endTime: quiz.endTime ? new Date(quiz.endTime) : null,
          negativeMarking: quiz.negativeMarking,
          negativeMarkValue: quiz.negativeMarkValue,
          chapterId: quiz.chapterId
        }
      })
    }
    console.log(`   ✅ ${quizzes.length} quizzes restored`)
    
    // Restore Quiz Results
    console.log('6. Restoring Quiz Results...')
    for (const result of quizResults) {
      await prisma.quizResult.create({
        data: {
          id: result.id,
          quizId: result.quizId,
          userId: result.userId,
          userName: result.userName,
          userEmail: result.userEmail,
          date: new Date(result.date),
          totalScore: result.totalScore,
          sections: result.sections,
          answers: result.answers,
          timeSpent: result.timeSpent
        }
      })
    }
    console.log(`   ✅ ${quizResults.length} quiz results restored`)
    
    console.log('\n🎉 Database restore completed successfully!')
    
  } catch (error) {
    console.error('❌ Restore failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreDatabase()