const { PrismaClient } = require('./lib/generated/prisma')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupDatabase() {
  console.log('📦 Starting database backup...\n')

  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'database-backup')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `backup-${timestamp}`)
    fs.mkdirSync(backupPath, { recursive: true })

    console.log(`📂 Backup directory: ${backupPath}\n`)

    // 1. Backup Users
    console.log('1. Backing up Users...')
    const users = await prisma.user.findMany()
    fs.writeFileSync(
      path.join(backupPath, 'users.json'),
      JSON.stringify(users, null, 2)
    )
    console.log(`   ✅ ${users.length} users backed up`)

    // 2. Backup Subjects
    console.log('2. Backing up Subjects...')
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            questions: true,
            quizzes: {
              include: {
                results: true
              }
            }
          }
        }
      }
    })
    fs.writeFileSync(
      path.join(backupPath, 'subjects.json'),
      JSON.stringify(subjects, null, 2)
    )
    console.log(`   ✅ ${subjects.length} subjects backed up`)

    // 3. Backup Chapters
    console.log('3. Backing up Chapters...')
    const chapters = await prisma.chapter.findMany({
      include: {
        subject: true,
        questions: true,
        quizzes: true
      }
    })
    fs.writeFileSync(
      path.join(backupPath, 'chapters.json'),
      JSON.stringify(chapters, null, 2)
    )
    console.log(`   ✅ ${chapters.length} chapters backed up`)

    // 4. Backup Question Bank Items
    console.log('4. Backing up Question Bank Items...')
    const questionBankItems = await prisma.questionBankItem.findMany({
      include: {
        chapter: {
          include: {
            subject: true
          }
        }
      }
    })
    fs.writeFileSync(
      path.join(backupPath, 'question-bank-items.json'),
      JSON.stringify(questionBankItems, null, 2)
    )
    console.log(`   ✅ ${questionBankItems.length} question bank items backed up`)

    // 5. Backup Quizzes
    console.log('5. Backing up Quizzes...')
    const quizzes = await prisma.quiz.findMany({
      include: {
        chapter: {
          include: {
            subject: true
          }
        },
        results: {
          include: {
            user: true
          }
        }
      }
    })
    fs.writeFileSync(
      path.join(backupPath, 'quizzes.json'),
      JSON.stringify(quizzes, null, 2)
    )
    console.log(`   ✅ ${quizzes.length} quizzes backed up`)

    // 6. Backup Quiz Results
    console.log('6. Backing up Quiz Results...')
    const quizResults = await prisma.quizResult.findMany({
      include: {
        user: true,
        quiz: {
          include: {
            chapter: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    })
    fs.writeFileSync(
      path.join(backupPath, 'quiz-results.json'),
      JSON.stringify(quizResults, null, 2)
    )
    console.log(`   ✅ ${quizResults.length} quiz results backed up`)

    // 7. Create summary
    const summary = {
      backupDate: new Date().toISOString(),
      timestamp,
      counts: {
        users: users.length,
        subjects: subjects.length,
        chapters: chapters.length,
        questionBankItems: questionBankItems.length,
        quizzes: quizzes.length,
        quizResults: quizResults.length
      },
      totalRecords: users.length + subjects.length + chapters.length + questionBankItems.length + quizzes.length + quizResults.length
    }

    fs.writeFileSync(
      path.join(backupPath, 'backup-summary.json'),
      JSON.stringify(summary, null, 2)
    )

    // 8. Create restore script
    const restoreScript = `const { PrismaClient } = require('../lib/generated/prisma')
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
    console.log(\`   ✅ \${users.length} users restored\`)
    
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
    console.log(\`   ✅ \${subjects.length} subjects restored\`)
    
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
    console.log(\`   ✅ \${chapters.length} chapters restored\`)
    
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
    console.log(\`   ✅ \${questionBankItems.length} question bank items restored\`)
    
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
    console.log(\`   ✅ \${quizzes.length} quizzes restored\`)
    
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
    console.log(\`   ✅ \${quizResults.length} quiz results restored\`)
    
    console.log('\\n🎉 Database restore completed successfully!')
    
  } catch (error) {
    console.error('❌ Restore failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreDatabase()`

    fs.writeFileSync(
      path.join(backupPath, 'restore.js'),
      restoreScript
    )

    console.log('\n🎉 Database backup completed successfully!')
    console.log('\n📋 Backup Summary:')
    console.log(`   📂 Location: ${backupPath}`)
    console.log(`   📅 Date: ${summary.backupDate}`)
    console.log(`   📊 Total Records: ${summary.totalRecords}`)
    console.log('   📁 Files created:')
    console.log('      - users.json')
    console.log('      - subjects.json')
    console.log('      - chapters.json')
    console.log('      - question-bank-items.json')
    console.log('      - quizzes.json')
    console.log('      - quiz-results.json')
    console.log('      - backup-summary.json')
    console.log('      - restore.js')
    
    console.log('\n🔄 To restore this backup later:')
    console.log(`   cd "${backupPath}"`)
    console.log('   node restore.js')

  } catch (error) {
    console.error('❌ Backup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

backupDatabase()
