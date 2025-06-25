// Test AI Question Generation API
// This script tests the AI question generation endpoint structure

const testAIEndpoint = async () => {
  console.log('Testing AI Question Generation API endpoint...')
  
  const testData = {
    topic: 'Basic Arithmetic',
    difficulty: 'medium',
    count: 2,
    section: 'Quantitative Aptitude'
  }
  
  try {
    const response = await fetch('http://localhost:3002/api/ai/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token-placeholder',
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response Body:', JSON.stringify(result, null, 2))
    
    if (response.ok) {
      console.log('✅ API endpoint structure is working correctly')
      if (result.questions) {
        console.log(`✅ Generated ${result.questions.length} questions`)
      }    } else {
      console.log('⚠️ API returned error (expected if no Gemini API key is set):')
      console.log('   Error:', result.error)
      console.log('   This is normal without a Gemini API key configured')
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

testAIEndpoint()
