// Test script for question bank API
const testQuestionBankAPI = async () => {
  const baseUrl = 'http://localhost:3001'
  const headers = {
    'Authorization': 'Bearer admin-token-placeholder',
    'Content-Type': 'application/json'
  }

  console.log('Testing Question Bank API...\n')

  try {
    // Test GET - should return empty array initially
    console.log('1. Testing GET /api/admin/question-bank')
    const getResponse = await fetch(`${baseUrl}/api/admin/question-bank`, { headers })
    const getData = await getResponse.json()
    console.log('Status:', getResponse.status)
    console.log('Response:', JSON.stringify(getData, null, 2))
    console.log('✅ GET test passed\n')

    // Test POST - create a sample question
    console.log('2. Testing POST /api/admin/question-bank')
    const sampleQuestion = {
      section: "Quantitative Aptitude",
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: 1,
      explanation: "Basic addition: 2 + 2 = 4",
      difficulty: "easy",
      tags: ["arithmetic", "basic", "test"]
    }

    const postResponse = await fetch(`${baseUrl}/api/admin/question-bank`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sampleQuestion)
    })
    const postData = await postResponse.json()
    console.log('Status:', postResponse.status)
    console.log('Response:', JSON.stringify(postData, null, 2))
    
    if (postResponse.ok) {
      console.log('✅ POST test passed\n')
      
      // Test GET again to verify the question was created
      console.log('3. Testing GET again after creation')
      const getResponse2 = await fetch(`${baseUrl}/api/admin/question-bank`, { headers })
      const getData2 = await getResponse2.json()
      console.log('Status:', getResponse2.status)
      console.log('Questions count:', getData2.questions?.length || 0)
      console.log('✅ Question creation verified\n')
      
      // Test individual question GET
      if (getData2.questions && getData2.questions.length > 0) {
        const questionId = getData2.questions[0].id
        console.log('4. Testing GET /api/admin/question-bank/' + questionId)
        const getOneResponse = await fetch(`${baseUrl}/api/admin/question-bank/${questionId}`, { headers })
        const getOneData = await getOneResponse.json()
        console.log('Status:', getOneResponse.status)
        console.log('Question:', getOneData.question?.question || 'Not found')
        console.log('✅ Individual question GET test passed\n')
      }
    } else {
      console.log('❌ POST test failed')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testQuestionBankAPI()
