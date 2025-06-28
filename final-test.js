console.log('🧪 Final Comprehensive Test - Quiz Creation Fix Verification...')

async function finalTest() {
  console.log('\n1️⃣ Testing Regular Quiz Creation API...')
  
  try {
    const response = await fetch('http://localhost:3001/api/admin/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token-placeholder'
      },
      body: JSON.stringify({
        title: "Final Test Quiz",
        description: "Testing after frontend fixes",
        duration: 30,
        chapterId: null, // Test with null chapter
        sections: [{ name: "Mathematics", questions: 1 }],
        questions: [],
        negativeMarking: true,
        negativeMarkValue: 0.25
      })
    })
    
    console.log(`📡 Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Regular quiz creation successful!')
      console.log(`Quiz ID: ${data.quiz?.id}`)
      console.log(`Quiz Title: ${data.quiz?.title}`)
    } else {
      const errorData = await response.json()
      console.log('❌ Regular quiz creation failed:')
      console.log('Error:', errorData)
    }
    
  } catch (error) {
    console.log('❌ Regular quiz test failed:', error.message)
  }
  
  console.log('\n2️⃣ Testing AI Quiz Generator...')
  
  try {
    const aiResponse = await fetch('http://localhost:3001/api/ai/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token-placeholder'
      },
      body: JSON.stringify({
        title: "Final AI Test Quiz",
        description: "Testing AI generator after fixes",
        topic: "Basic Mathematics",
        sections: ["quantitative"],
        difficulty: "easy",
        questionsPerSection: 1,
        duration: 30,
        negativeMarking: true,
        negativeMarkValue: 0.25
      })
    })
    
    console.log(`📡 AI Status: ${aiResponse.status}`)
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      console.log('✅ AI quiz creation successful!')
      console.log(`AI Quiz ID: ${aiData.quiz?.id}`)
      console.log(`AI Quiz Title: ${aiData.quiz?.title}`)
      console.log(`Questions generated: ${aiData.quiz?.questions?.length || 0}`)
    } else {
      const aiErrorData = await aiResponse.json()
      console.log('❌ AI quiz creation failed:')
      console.log('Error:', aiErrorData)
    }
    
  } catch (error) {
    console.log('❌ AI quiz test failed:', error.message)
  }
  
  console.log('\n3️⃣ Environment Check...')
  console.log(`🔑 GEMINI_API_KEY available: ${!!process.env.GEMINI_API_KEY}`)
  console.log(`🗄️ DATABASE_URL available: ${!!process.env.DATABASE_URL}`)
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  
  console.log('\n4️⃣ Frontend Data Validation Test...')
  
  // Test the exact data structure the frontend sends
  const frontendData = {
    title: "Frontend Test Quiz",
    description: "Test quiz from frontend format",
    duration: 30,
    chapterId: null, // This should be allowed now
    sections: ["reasoning", "quantitative"],
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  }
  
  console.log('Frontend data format:', JSON.stringify(frontendData, null, 2))
  
  try {
    const frontendResponse = await fetch('http://localhost:3001/api/admin/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token-placeholder'
      },
      body: JSON.stringify(frontendData)
    })
    
    console.log(`📱 Frontend format status: ${frontendResponse.status}`)
    
    if (frontendResponse.ok) {
      const frontendResult = await frontendResponse.json()
      console.log('✅ Frontend format quiz creation successful!')
      console.log(`Frontend Quiz ID: ${frontendResult.quiz?.id}`)
    } else {
      const frontendError = await frontendResponse.json()
      console.log('❌ Frontend format failed:')
      console.log('Error:', frontendError)
    }
    
  } catch (error) {
    console.log('❌ Frontend format test failed:', error.message)
  }
  
  console.log('\n✅ Test Complete! Check results above.')
}

finalTest()
