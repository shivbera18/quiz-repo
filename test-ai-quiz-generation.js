// Test script for AI Quiz Generation
const testAIQuizGeneration = async () => {
  console.log('🧪 Testing AI Quiz Generation API...')
  
  const testData = {
    title: "Sample AI Quiz",
    description: "Testing AI quiz generation",
    topic: "General Knowledge",
    sections: ["reasoning", "quantitative"],
    difficulty: "medium",
    questionsPerSection: 3,
    duration: 30,
    negativeMarking: true,
    negativeMarkValue: 0.25
  }

  try {
    const response = await fetch('http://localhost:3000/api/ai/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token'
      },
      body: JSON.stringify(testData)
    })

    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Error:', errorData)
      return
    }

    const data = await response.json()
    console.log('✅ Success!')
    console.log('Quiz ID:', data.quiz.id)
    console.log('Quiz Title:', data.quiz.title)
    console.log('Total Questions:', data.quiz.questions.length)
    console.log('Sections:', data.quiz.sections)
    console.log('Duration:', data.quiz.duration, 'minutes')
    
    // Show sample questions
    console.log('\n📝 Sample Questions:')
    data.quiz.questions.slice(0, 2).forEach((q, index) => {
      console.log(`\n${index + 1}. ${q.question}`)
      q.options.forEach((option, i) => {
        console.log(`   ${String.fromCharCode(65 + i)}. ${option}`)
      })
      console.log(`   Correct: ${String.fromCharCode(65 + q.correctAnswer)}`)
      console.log(`   Section: ${q.section}`)
    })

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
if (require.main === module) {
  testAIQuizGeneration()
}

module.exports = { testAIQuizGeneration }
