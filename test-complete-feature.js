// Complete feature test for AI Quiz Generation and Manual Timing
const testCompleteFeature = async () => {
  console.log('🚀 Testing Complete Quiz Management Features...\n')

  // Test 1: Check if server is running
  console.log('1️⃣ Testing server connectivity...')
  try {
    const healthCheck = await fetch('http://localhost:3000/api/admin/quizzes', {
      headers: { 'Authorization': 'Bearer test-token' }
    })
    console.log(`✅ Server responding (Status: ${healthCheck.status})\n`)
  } catch (error) {
    console.error('❌ Server not accessible. Make sure the server is running on port 3000\n')
    return
  }

  // Test 2: AI Quiz Generation
  console.log('2️⃣ Testing AI Quiz Generation...')
  const aiTestData = {
    title: "AI Generated Quiz Test",
    description: "Test quiz for validating AI generation",
    topic: "Competitive Exams",
    sections: ["reasoning", "quantitative"],
    difficulty: "medium", 
    questionsPerSection: 2,
    duration: 45,
    negativeMarking: true,
    negativeMarkValue: 0.25
  }

  try {
    const aiResponse = await fetch('http://localhost:3000/api/ai/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token'
      },
      body: JSON.stringify(aiTestData)
    })

    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      console.log('✅ AI Quiz Generation successful!')
      console.log(`   Quiz: "${aiData.quiz.title}"`)
      console.log(`   Questions: ${aiData.quiz.questions.length}`)
      console.log(`   Sections: ${aiData.quiz.sections.join(', ')}`)
      console.log(`   Duration: ${aiData.quiz.duration} minutes`)
      
      // Validate question structure
      const sampleQuestion = aiData.quiz.questions[0]
      if (sampleQuestion && sampleQuestion.options && sampleQuestion.options.length === 4) {
        console.log('✅ Question structure valid')
      } else {
        console.log('⚠️  Question structure may have issues')
      }
    } else {
      const errorData = await aiResponse.json()
      console.log('❌ AI Quiz Generation failed:', errorData.error)
    }
  } catch (error) {
    console.log('❌ AI Quiz Generation error:', error.message)
  }

  console.log('')

  // Test 3: Manual Quiz Creation with Custom Timing
  console.log('3️⃣ Testing Manual Quiz Creation...')
  const manualTestData = {
    title: "Manual Quiz with Custom Timing",
    description: "Testing manual quiz creation with custom duration",
    duration: 75, // Custom timing
    sections: ["reasoning"],
    questions: []
  }

  try {
    const manualResponse = await fetch('http://localhost:3000/api/admin/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token'
      },
      body: JSON.stringify(manualTestData)
    })

    if (manualResponse.ok) {
      const manualData = await manualResponse.json()
      console.log('✅ Manual Quiz Creation successful!')
      console.log(`   Quiz: "${manualData.quiz.title}"`)
      console.log(`   Custom Duration: ${manualData.quiz.timeLimit} minutes`)
      console.log(`   ID: ${manualData.quiz.id}`)
    } else {
      const errorData = await manualResponse.json()
      console.log('❌ Manual Quiz Creation failed:', errorData.message)
    }
  } catch (error) {
    console.log('❌ Manual Quiz Creation error:', error.message)
  }

  console.log('')

  // Test 4: Fetch all quizzes to verify creation
  console.log('4️⃣ Testing Quiz Listing...')
  try {
    const listResponse = await fetch('http://localhost:3000/api/admin/quizzes', {
      headers: { 'Authorization': 'Bearer admin-test-token' }
    })

    if (listResponse.ok) {
      const listData = await listResponse.json()
      console.log('✅ Quiz listing successful!')
      console.log(`   Total quizzes: ${listData.quizzes.length}`)
      
      // Show recent quizzes
      const recentQuizzes = listData.quizzes
        .filter(q => q.title.includes('Test') || q.title.includes('AI'))
        .slice(-3)
      
      if (recentQuizzes.length > 0) {
        console.log('   Recent test quizzes:')
        recentQuizzes.forEach(quiz => {
          console.log(`   - ${quiz.title} (${quiz.questions?.length || 0} questions, ${quiz.duration}min)`)
        })
      }
    } else {
      console.log('❌ Quiz listing failed')
    }
  } catch (error) {
    console.log('❌ Quiz listing error:', error.message)
  }

  console.log('\n🎉 Feature testing complete!')
  console.log('\n📋 Summary:')
  console.log('- AI Quiz Generation: Create complete quizzes with Gemini AI')
  console.log('- Manual Quiz Creation: Custom timing and section selection')
  console.log('- Flexible Duration: 15min to 10hrs, or custom input')
  console.log('- Multiple Sections: reasoning, quantitative, english, etc.')
  console.log('- Negative Marking: Configurable penalty system')
  console.log('- Full Database Integration: Persistent storage')
}

// Run the test
if (require.main === module) {
  testCompleteFeature()
}

module.exports = { testCompleteFeature }
