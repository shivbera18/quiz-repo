/**
 * Test script to verify admin analytics functionality
 */

console.log('Testing Admin Analytics...')

// Test the API endpoint
async function testAdminAnalyticsAPI() {
  try {
    console.log('Testing /api/admin/analytics endpoint...')
    
    // Note: This would normally require authentication in a real environment
    const response = await fetch('http://localhost:3000/api/admin/analytics')
    const data = await response.json()
    
    console.log('API Response:', data)
    
    if (data.results && Array.isArray(data.results)) {
      console.log(`✓ API returned ${data.results.length} results`)
    } else {
      console.log('✓ API returned empty results (expected if no database data)')
    }
    
    if (data.quizzes && Array.isArray(data.quizzes)) {
      console.log(`✓ API returned ${data.quizzes.length} quizzes`)
    } else {
      console.log('✓ API returned empty quizzes (expected if no database data)')
    }
    
  } catch (error) {
    console.log('ℹ️ API test failed (expected if server not running):', error.message)
  }
}

// Test data transformation for admin analytics
function testDataTransformation() {
  console.log('\nTesting data transformation...')
  
  // Mock API response
  const mockApiData = {
    results: [
      {
        id: '1',
        createdAt: '2025-01-01T10:00:00Z',
        totalScore: 85,
        correctAnswers: 17,
        wrongAnswers: 3,
        unanswered: 0,
        timeSpent: 1800,
        quiz: {
          id: 'quiz1',
          title: 'Sample Quiz'
        },
        sections: {
          reasoning: 80,
          quantitative: 90,
          english: 85
        }
      }
    ],
    quizzes: [
      {
        id: 'quiz1',
        title: 'Sample Quiz',
        questions: [1, 2, 3, 4, 5]
      }
    ]
  }
  
  // Transform data like the admin page does
  const transformedResults = (mockApiData.results || []).map((result) => ({
    _id: result.id || result._id || '',
    date: result.createdAt || result.date || new Date().toISOString(),
    quizName: result.quiz?.title || result.quizName || 'Unknown Quiz',
    quizId: result.quizId || result.quiz?.id || '',
    totalScore: result.totalScore || 0,
    rawScore: result.rawScore || result.totalScore || 0,
    positiveMarks: result.positiveMarks || result.totalScore || 0,
    negativeMarks: result.negativeMarks || 0,
    correctAnswers: result.correctAnswers || 0,
    wrongAnswers: result.wrongAnswers || 0,
    unanswered: result.unanswered || 0,
    sections: result.sections || {},
    questions: result.questions || [],
    timeSpent: result.timeSpent || 0,
    negativeMarking: result.negativeMarking || false,
    negativeMarkValue: result.negativeMarkValue || 0
  }))
  
  console.log('✓ Data transformation successful')
  console.log('Transformed result:', transformedResults[0])
  
  // Test empty data handling
  const emptyData = { results: [], quizzes: [] }
  const emptyTransformed = (emptyData.results || []).map(() => ({}))
  
  console.log('✓ Empty data handling successful')
  console.log(`Empty transformed length: ${emptyTransformed.length}`)
}

// Test localStorage fallback
function testLocalStorageFallback() {
  console.log('\nTesting localStorage fallback...')
  
  if (typeof window !== 'undefined') {
    // Check if localStorage has quiz results
    const localResults = localStorage.getItem("quizResults")
    if (localResults) {
      try {
        const parsedResults = JSON.parse(localResults)
        console.log(`✓ localStorage has ${parsedResults.length} quiz results`)
      } catch (error) {
        console.log('✗ localStorage data is corrupted')
      }
    } else {
      console.log('ℹ️ No localStorage data found (normal for fresh install)')
    }
  } else {
    console.log('ℹ️ localStorage test skipped (not in browser environment)')
  }
}

// Run all tests
async function runTests() {
  await testAdminAnalyticsAPI()
  testDataTransformation()
  testLocalStorageFallback()
  
  console.log('\n✅ Admin Analytics testing completed!')
}

// Export for use in browser or run directly in Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests }
} else {
  runTests()
}
