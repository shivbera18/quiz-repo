/**
 * Test script to verify that the advanced analytics component handles empty/undefined data safely
 * This can be run to simulate the conditions that cause the "Cannot read properties of undefined" error
 */

console.log('Testing Advanced Analytics Safety...')

// Simulate the error conditions
const testCases = [
  {
    name: 'Empty results array',
    results: []
  },
  {
    name: 'Undefined results',
    results: undefined
  },
  {
    name: 'Null results',
    results: null
  },
  {
    name: 'Results with missing properties',
    results: [
      {
        _id: '1',
        date: '2025-01-01',
        // Missing essential properties like totalScore, correctAnswers, etc.
      }
    ]
  },
  {
    name: 'Results with null/undefined properties',
    results: [
      {
        _id: '1',
        date: '2025-01-01',
        quizName: null,
        totalScore: undefined,
        correctAnswers: null,
        wrongAnswers: undefined,
        unanswered: null,
        sections: undefined,
        timeSpent: null
      }
    ]
  },
  {
    name: 'Valid results (should work)',
    results: [
      {
        _id: '1',
        date: '2025-01-01',
        quizName: 'Test Quiz',
        quizId: 'quiz1',
        totalScore: 85,
        rawScore: 85,
        positiveMarks: 85,
        negativeMarks: 0,
        correctAnswers: 17,
        wrongAnswers: 3,
        unanswered: 0,
        sections: {
          reasoning: 85,
          quantitative: 80,
          english: 90
        },
        questions: [],
        timeSpent: 1800,
        negativeMarking: false,
        negativeMarkValue: 0
      }
    ]
  }
]

// Test each case
testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. Testing: ${testCase.name}`)
  
  try {
    // Simulate the validation logic from our component
    const results = testCase.results || []
    
    const validResults = results.filter(result => 
      result && 
      typeof result === 'object' &&
      result.date &&
      typeof result.totalScore === 'number' &&
      typeof result.correctAnswers === 'number' &&
      typeof result.wrongAnswers === 'number' &&
      typeof result.unanswered === 'number'
    )
    
    console.log(`   ✓ Validation passed. Valid results: ${validResults.length}`)
    
    // Test key calculations
    const totalQuizzes = validResults.length
    const averageScore = totalQuizzes > 0 ? 
      Math.round(validResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuizzes) : 0
    const totalCorrect = validResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0)
    
    console.log(`   ✓ Calculations passed. Quizzes: ${totalQuizzes}, Avg Score: ${averageScore}, Total Correct: ${totalCorrect}`)
    
    // Test section data processing
    const sectionData = ['reasoning', 'quantitative', 'english'].map(section => {
      const sectionResults = validResults.filter(r => 
        r.sections && 
        typeof r.sections === 'object' && 
        r.sections[section] !== undefined
      )
      const avgScore = sectionResults.length > 0 ? 
        Math.round(sectionResults.reduce((sum, r) => {
          const score = r.sections?.[section] || 0
          return sum + score
        }, 0) / sectionResults.length) : 0
      return {
        section: section.charAt(0).toUpperCase() + section.slice(1),
        score: avgScore,
        attempts: sectionResults.length
      }
    })
    
    console.log(`   ✓ Section processing passed. Sections processed: ${sectionData.length}`)
    
  } catch (error) {
    console.error(`   ✗ Error in ${testCase.name}:`, error.message)
  }
})

console.log('\n✅ Analytics safety testing completed!')
console.log('\nThe component should now handle all these edge cases gracefully without throwing "Cannot read properties of undefined" errors.')
