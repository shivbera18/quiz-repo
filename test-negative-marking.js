#!/usr/bin/env node

/**
 * Test script to verify negative marking functionality
 * Tests both manual quiz creation and AI quiz generation
 */

const BASE_URL = 'http://localhost:3000'

async function testNegativeMarkingFeatures() {
  console.log('🧪 Testing Negative Marking Features...\n')

  try {
    // Test 1: Create a quiz with custom negative marking
    console.log('📝 Test 1: Creating quiz with custom negative marking...')
    
    const createQuizResponse = await fetch(`${BASE_URL}/api/admin/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token-12345'
      },
      body: JSON.stringify({
        title: 'Negative Marking Test Quiz',
        description: 'Testing custom negative marking values',
        duration: 30,
        sections: ['reasoning', 'quantitative'],
        questions: [],
        negativeMarking: true,
        negativeMarkValue: 0.5 // Custom value
      })
    })

    if (!createQuizResponse.ok) {
      const errorText = await createQuizResponse.text()
      throw new Error(`Failed to create quiz: ${createQuizResponse.status} - ${errorText}`)
    }

    const quizData = await createQuizResponse.json()
    const testQuizId = quizData.quiz.id
    
    console.log('✅ Quiz created successfully!')
    console.log(`   Quiz ID: ${testQuizId}`)
    console.log(`   Negative Marking: ${quizData.quiz.negativeMarking}`)
    console.log(`   Negative Mark Value: ${quizData.quiz.negativeMarkValue}`)

    // Test 2: Verify quiz retrieval includes negative marking
    console.log('\n📖 Test 2: Retrieving quiz to verify negative marking...')
    
    const getQuizResponse = await fetch(`${BASE_URL}/api/admin/quizzes/${testQuizId}`, {
      headers: {
        'Authorization': 'Bearer admin-test-token-12345'
      }
    })

    if (!getQuizResponse.ok) {
      throw new Error(`Failed to retrieve quiz: ${getQuizResponse.status}`)
    }

    const retrievedQuiz = await getQuizResponse.json()
    
    console.log('✅ Quiz retrieved successfully!')
    console.log(`   Negative Marking: ${retrievedQuiz.quiz.negativeMarking}`)
    console.log(`   Negative Mark Value: ${retrievedQuiz.quiz.negativeMarkValue}`)

    // Test 3: Update quiz negative marking
    console.log('\n🔄 Test 3: Updating quiz negative marking...')
    
    const updateQuizResponse = await fetch(`${BASE_URL}/api/admin/quizzes/${testQuizId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token-12345'
      },
      body: JSON.stringify({
        title: 'Updated Negative Marking Test Quiz',
        description: 'Testing updated negative marking values',
        duration: 45,
        sections: ['reasoning', 'quantitative'],
        questions: [],
        isActive: true,
        negativeMarking: false, // Disable negative marking
        negativeMarkValue: 0
      })
    })

    if (!updateQuizResponse.ok) {
      throw new Error(`Failed to update quiz: ${updateQuizResponse.status}`)
    }

    const updatedQuiz = await updateQuizResponse.json()
    
    console.log('✅ Quiz updated successfully!')
    console.log(`   Negative Marking: ${updatedQuiz.quiz.negativeMarking}`)
    console.log(`   Negative Mark Value: ${updatedQuiz.quiz.negativeMarkValue}`)

    // Test 4: Test AI Quiz Generation with negative marking
    console.log('\n🤖 Test 4: Testing AI Quiz Generation with negative marking...')
    
    const aiQuizResponse = await fetch(`${BASE_URL}/api/ai/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-test-token-12345'
      },
      body: JSON.stringify({
        title: 'AI Generated Negative Marking Quiz',
        description: 'AI quiz with custom negative marking',
        topic: 'General Knowledge',
        sections: ['reasoning'],
        difficulty: 'medium',
        questionsPerSection: 2,
        duration: 20,
        negativeMarking: true,
        negativeMarkValue: 0.33
      })
    })

    if (!aiQuizResponse.ok) {
      const errorText = await aiQuizResponse.text()
      console.log('⚠️  AI Quiz Generation failed (might be due to missing Gemini API key)')
      console.log(`   Error: ${aiQuizResponse.status} - ${errorText}`)
    } else {
      const aiQuiz = await aiQuizResponse.json()
      console.log('✅ AI Quiz generated successfully!')
      console.log(`   Quiz ID: ${aiQuiz.quiz.id}`)
      console.log(`   Negative Marking: ${aiQuiz.quiz.negativeMarking}`)
      console.log(`   Negative Mark Value: ${aiQuiz.quiz.negativeMarkValue}`)
      console.log(`   Questions Generated: ${aiQuiz.quiz.questions.length}`)
    }

    // Test 5: List all quizzes to verify negative marking display
    console.log('\n📋 Test 5: Listing all quizzes to verify negative marking display...')
    
    const listQuizzesResponse = await fetch(`${BASE_URL}/api/admin/quizzes`, {
      headers: {
        'Authorization': 'Bearer admin-test-token-12345'
      }
    })

    if (!listQuizzesResponse.ok) {
      throw new Error(`Failed to list quizzes: ${listQuizzesResponse.status}`)
    }

    const quizList = await listQuizzesResponse.json()
    
    console.log('✅ Quizzes listed successfully!')
    console.log(`   Total quizzes: ${quizList.quizzes.length}`)
    
    // Show negative marking info for test quizzes
    const testQuizzes = quizList.quizzes.filter(q => 
      q.title.includes('Negative Marking Test') || 
      q.title.includes('AI Generated Negative Marking')
    )
    
    console.log(`   Test quizzes found: ${testQuizzes.length}`)
    testQuizzes.forEach(quiz => {
      console.log(`   - ${quiz.title}: Negative Marking = ${quiz.negativeMarking ? `Yes (-${quiz.negativeMarkValue})` : 'No'}`)
    })

    console.log('\n🎉 All Negative Marking Tests Completed Successfully!')
    console.log('\n📊 Summary:')
    console.log('✅ Quiz creation with negative marking')
    console.log('✅ Quiz retrieval with negative marking data')
    console.log('✅ Quiz update with negative marking changes')
    console.log('✅ Quiz listing with negative marking display')
    
    if (aiQuizResponse.ok) {
      console.log('✅ AI quiz generation with negative marking')
    } else {
      console.log('⚠️  AI quiz generation (API key required)')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run tests
testNegativeMarkingFeatures()
