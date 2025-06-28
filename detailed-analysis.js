const { PrismaClient } = require('./lib/generated/prisma')

console.log('🔍 Detailed Database & API Analysis...')

async function detailedAnalysis() {
  const prisma = new PrismaClient()
  
  try {
    console.log('\n1️⃣ Testing Database Connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    console.log('\n2️⃣ Checking Database Schema...')
    
    // Test simple operations first
    const userCount = await prisma.user.count()
    const quizCount = await prisma.quiz.count()
    console.log(`✅ Current state: ${userCount} users, ${quizCount} quizzes`)
    
    console.log('\n3️⃣ Testing Quiz Creation (Minimal Data)...')
    
    try {
      const testQuiz = await prisma.quiz.create({
        data: {
          title: "Direct DB Test Quiz",
          description: "Testing direct database creation",
          timeLimit: 30,
          createdBy: "test-admin",
          sections: "[]",
          questions: "[]"
        }
      })
      
      console.log(`✅ Direct DB quiz creation successful! ID: ${testQuiz.id}`)
      
      // Clean up the test quiz
      await prisma.quiz.delete({ where: { id: testQuiz.id } })
      console.log('🧹 Test quiz cleaned up')
      
    } catch (dbError) {
      console.error('❌ Direct DB quiz creation failed:')
      console.error('Error name:', dbError.name)
      console.error('Error message:', dbError.message)
      console.error('Error code:', dbError.code)
      console.error('Full error:', dbError)
    }
    
    console.log('\n4️⃣ Testing API Endpoints...')
    
    // Test the quiz creation API endpoint
    try {
      const response = await fetch('http://localhost:3000/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-test-token-123456789'
        },
        body: JSON.stringify({
          title: "API Test Quiz",
          description: "Testing API creation",
          duration: 30,
          chapterId: null,
          sections: [{ name: "Test", questions: 1 }],
          questions: [{ 
            id: "test1", 
            question: "Test question?", 
            options: ["A", "B", "C", "D"], 
            correctAnswer: 0 
          }],
          negativeMarking: true,
          negativeMarkValue: 0.25
        })
      })
      
      console.log(`📡 API Response Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API quiz creation successful!')
        console.log(`Quiz ID: ${data.quiz?.id}`)
        
        // Clean up
        if (data.quiz?.id) {
          await prisma.quiz.delete({ where: { id: data.quiz.id } })
          console.log('🧹 API test quiz cleaned up')
        }
      } else {
        const errorData = await response.json()
        console.error('❌ API quiz creation failed:')
        console.error('Status:', response.status)
        console.error('Error:', errorData)
      }
      
    } catch (apiError) {
      console.error('❌ API test failed:', apiError.message)
    }
    
    console.log('\n5️⃣ Testing AI Quiz Generator...')
    
    try {
      const aiResponse = await fetch('http://localhost:3000/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token-placeholder'
        },
        body: JSON.stringify({
          title: "AI Analysis Test",
          description: "Testing AI generator",
          topic: "Mathematics",
          sections: ["quantitative"],
          difficulty: "easy",
          questionsPerSection: 1,
          duration: 30,
          negativeMarking: true,
          negativeMarkValue: 0.25
        })
      })
      
      console.log(`📡 AI API Response Status: ${aiResponse.status}`)
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        console.log('✅ AI quiz creation successful!')
        console.log(`AI Quiz ID: ${aiData.quiz?.id}`)
        
        // Clean up
        if (aiData.quiz?.id) {
          await prisma.quiz.delete({ where: { id: aiData.quiz.id } })
          console.log('🧹 AI test quiz cleaned up')
        }
      } else {
        const aiErrorData = await aiResponse.json()
        console.error('❌ AI quiz creation failed:')
        console.error('Status:', aiResponse.status)
        console.error('Error:', aiErrorData)
      }
      
    } catch (aiError) {
      console.error('❌ AI API test failed:', aiError.message)
    }
    
    console.log('\n6️⃣ Environment Analysis...')
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
    console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`)
    console.log(`DATABASE_URL starts with: ${process.env.DATABASE_URL?.substring(0, 20) || 'undefined'}...`)
    console.log(`GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`)
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

detailedAnalysis()
