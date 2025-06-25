// Quick test script to verify Gemini API key
// Run this with: node test-gemini-api.js

async function testGeminiAPI() {
  console.log('Testing Gemini API...')
  
  // Get API key from environment
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    console.log('❌ No valid API key found!')
    console.log('Please set GEMINI_API_KEY in your .env.local file')
    console.log('Get your free API key from: https://makersuite.google.com/app/apikey')
    return
  }
  
  console.log('✅ API key found, testing connection...')
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Basic Addition',
        difficulty: 'easy',
        count: 1,
        section: 'Quantitative Aptitude'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('🎉 SUCCESS! Gemini API is working correctly')
      console.log('Generated question:', result.questions[0].question)
    } else {
      console.log('❌ API Error:', result.error)
      if (result.error.includes('API key')) {
        console.log('💡 Make sure your API key is valid and has not expired')
      }
    }
    
  } catch (error) {
    console.log('❌ Connection Error:', error.message)
    console.log('💡 Make sure your development server is running (npm run dev)')
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' })
testGeminiAPI()
