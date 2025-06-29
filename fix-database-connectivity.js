// Fix database connectivity issues
// Run this locally to test your database connection

const { PrismaClient } = require('./lib/generated/prisma/client')

async function testConnection() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  try {
    console.log('🔗 Testing database connection...')
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully!')
    
    // Test quiz data
    const quizCount = await prisma.quiz.count()
    console.log(`📊 Found ${quizCount} quizzes in database`)
    
    // Test user data
    const userCount = await prisma.user.count()
    console.log(`👥 Found ${userCount} users in database`)
    
    if (quizCount === 0) {
      console.log('⚠️  No quizzes found! This explains why student dashboard is empty.')
      console.log('💡 Solution: Run seed script to add sample data')
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n🔧 Possible fixes:')
      console.log('1. Check if your Neon database is active')
      console.log('2. Verify DATABASE_URL in Vercel environment variables')
      console.log('3. Ensure database hasn\'t been suspended')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
