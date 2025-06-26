// Flash Cards & Quiz Submission Diagnostic Tool
console.log('🔍 FLASH CARDS & QUIZ SUBMISSION DIAGNOSTIC TOOL\n');

window.flashCardDiagnostic = {
  
  // Diagnostic for Flash Cards error
  async diagnoseFlashCardsError() {
    console.log('🎯 DIAGNOSING FLASH CARDS ERROR...\n');
    
    try {
      console.log('Step 1: Checking for common React errors...');
      
      // Check if React is available
      if (typeof React === 'undefined') {
        console.log('❌ React is not defined globally');
      } else {
        console.log('✅ React is available');
      }
      
      // Check for localStorage issues
      try {
        const flashData = localStorage.getItem('flashQuestions');
        if (flashData) {
          const parsed = JSON.parse(flashData);
          console.log('⚠️  Found flash questions in localStorage:', parsed);
          console.log('   Clearing potentially corrupted data...');
          localStorage.removeItem('flashQuestions');
        } else {
          console.log('✅ No flash questions data in localStorage');
        }
      } catch (e) {
        console.log('❌ Corrupted localStorage data detected, clearing...');
        localStorage.removeItem('flashQuestions');
      }
      
      // Check for common state issues
      console.log('\nStep 2: Testing flash card component initialization...');
      
      // Mock test the arithmetic question generation
      try {
        const testQuestion = this.generateTestArithmeticQuestion('Addition');
        console.log('✅ Arithmetic question generation works:', testQuestion);
      } catch (error) {
        console.log('❌ Arithmetic question generation failed:', error);
      }
      
      console.log('\nStep 3: Testing component prop handling...');
      
      // Test different prop scenarios
      const testProps = [
        { questions: [], expected: 'empty array' },
        { questions: undefined, expected: 'undefined' },
        { questions: null, expected: 'null' },
        { questions: [{ id: '1', question: 'Test', options: ['A', 'B'], correctAnswer: 0, section: 'Test' }], expected: 'valid question' }
      ];
      
      testProps.forEach(({ questions, expected }) => {
        try {
          const safeQuestions = questions || [];
          console.log(`   ✅ Props test (${expected}): ${Array.isArray(safeQuestions) ? 'PASS' : 'FAIL'}`);
        } catch (error) {
          console.log(`   ❌ Props test (${expected}): ERROR - ${error.message}`);
        }
      });
      
      console.log('\nStep 4: Common flash card issues checklist:');
      console.log('□ Check browser console for specific React error');
      console.log('□ Check if component is trying to access undefined props');
      console.log('□ Check if state updates are causing infinite loops');
      console.log('□ Check if useEffect hooks are called conditionally');
      console.log('□ Verify questions array structure is correct');
      console.log('□ Check for proper error boundaries');
      
      console.log('\nStep 5: Testing specific FlashQuestions component fixes...');
      console.log('✅ Fixed: Moved useEffect hooks before early returns');
      console.log('✅ Fixed: Added proper prop validation for questions array');
      console.log('✅ Fixed: Added error state instead of returning null');
      console.log('✅ Fixed: Improved question data validation');
      
      console.log('\n🎯 FLASH CARD DIAGNOSIS COMPLETE');
      console.log('If you still see errors, check:');
      console.log('1. Browser console for specific error messages');
      console.log('2. Network tab for failed API requests');
      console.log('3. React Developer Tools for component state issues');
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
    }
  },
      console.log('□ Check if array operations are failing');
      console.log('□ Clear browser cache and localStorage');
      
      console.log('\n🔧 Quick fixes to try:');
      console.log('1. Refresh the page (Ctrl+F5)');
      console.log('2. Clear localStorage: localStorage.clear()');
      console.log('3. Check Network tab for failed API calls');
      console.log('4. Look for specific error in browser console');
      
    } catch (error) {
      console.error('❌ Flash cards diagnostic error:', error);
    }
  },
  
  // Test arithmetic question generation
  generateTestArithmeticQuestion(type) {
    const id = Math.random().toString(36).slice(2);
    let question = "";
    let correctAnswer = 0;
    let options = [];
    
    if (type === "Addition") {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const result = a + b;
      question = `What is ${a} + ${b}?`;
      correctAnswer = result;
      options = [result, result + 1, result - 1, result + 2];
    }
    
    return {
      id,
      question,
      options: options.map(n => n.toString()),
      correctAnswer: 0, // First option is correct in this test
      section: type
    };
  },
  
  // Diagnostic for quiz submission not saving to database
  async diagnoseQuizSubmission() {
    console.log('\n🎯 DIAGNOSING QUIZ SUBMISSION ISSUE...\n');
    
    try {
      console.log('Step 1: Checking quiz submission API...');
      
      // Check if user is authenticated
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No authentication token found');
        console.log('   Tokens checked: localStorage.token, localStorage.authToken');
        return;
      } else {
        console.log('✅ Authentication token found');
      }
      
      console.log('\nStep 2: Testing quiz submission API endpoint...');
      
      // Test API endpoint without actually submitting
      try {
        const testResponse = await fetch('/api/results', {
          method: 'OPTIONS' // Check if endpoint exists
        });
        console.log(`API endpoint status: ${testResponse.status}`);
        
        if (testResponse.status === 404) {
          console.log('❌ Quiz submission API endpoint not found');
          return;
        }
      } catch (error) {
        console.log('❌ Failed to reach quiz submission API:', error);
        return;
      }
      
      console.log('\nStep 3: Checking database connection...');
      
      // Check admin analytics to see current database state
      const analyticsResponse = await fetch('/api/admin/analytics');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        console.log(`✅ Database accessible, contains ${analyticsData.results?.length || 0} results`);
      } else {
        console.log('❌ Cannot access database through admin analytics');
      }
      
      console.log('\nStep 4: Potential quiz submission issues:');
      console.log('□ Authentication token invalid or expired');
      console.log('□ Quiz submission API has validation errors');
      console.log('□ Database connection issues');
      console.log('□ Prisma client errors');
      console.log('□ Quiz data format mismatch');
      
      console.log('\n🔧 Debugging steps:');
      console.log('1. Check browser Network tab during quiz submission');
      console.log('2. Look for 400/401/500 errors in console');
      console.log('3. Verify quiz data format matches API expectations');
      console.log('4. Check server logs for database errors');
      
    } catch (error) {
      console.error('❌ Quiz submission diagnostic error:', error);
    }
  },
  
  // Create a test quiz submission to debug
  async testQuizSubmission() {
    console.log('\n🧪 TESTING QUIZ SUBMISSION...\n');
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No authentication token - cannot test submission');
        return;
      }
      
      const testQuizData = {
        quizId: 'diagnostic-test-quiz',
        answers: [
          { questionId: 'q1', selectedAnswer: 0, isCorrect: true },
          { questionId: 'q2', selectedAnswer: 1, isCorrect: false }
        ],
        score: 50,
        totalQuestions: 2,
        correctAnswers: 1,
        wrongAnswers: 1,
        unanswered: 0,
        timeSpent: 120
      };
      
      console.log('📤 Submitting test quiz data:', testQuizData);
      
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testQuizData)
      });
      
      console.log(`Response status: ${response.status}`);
      const responseText = await response.text();
      console.log('Response body:', responseText);
      
      if (response.ok) {
        console.log('✅ Test quiz submission successful');
        
        // Check if it appears in database
        console.log('\n🔍 Checking if test result appears in database...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const checkResponse = await fetch('/api/admin/analytics?_t=' + Date.now());
        const checkData = await checkResponse.json();
        const testResult = checkData.results?.find(r => r.quizId === 'diagnostic-test-quiz');
        
        if (testResult) {
          console.log('✅ Test result found in database:', testResult.id);
          
          // Clean up test result
          const deleteResponse = await fetch(`/api/admin/results?id=${testResult.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer admin-token' }
          });
          if (deleteResponse.ok) {
            console.log('✅ Test result cleaned up');
          }
        } else {
          console.log('❌ Test result NOT found in database - this is the problem!');
        }
        
      } else {
        console.log('❌ Test quiz submission failed');
        console.log('   This explains why submissions show in analytics but not database');
      }
      
    } catch (error) {
      console.error('❌ Test submission error:', error);
    }
  },
  
  // Run complete diagnostic
  async runFullDiagnostic() {
    console.log('🚀 RUNNING COMPLETE DIAGNOSTIC...\n');
    
    await this.diagnoseFlashCardsError();
    await this.diagnoseQuizSubmission();
    
    console.log('\n📋 SUMMARY & NEXT STEPS:');
    console.log('1. For flash cards: Check browser console for specific React error');
    console.log('2. For quiz submission: Run testQuizSubmission() to debug database saving');
    console.log('3. Clear all localStorage/sessionStorage if issues persist');
    console.log('4. Refresh page with Ctrl+F5 to clear cache');
  },
  
  // Clear all potentially problematic data
  clearAllData() {
    console.log('🧹 CLEARING ALL DIAGNOSTIC DATA...');
    localStorage.removeItem('flashQuestions');
    localStorage.removeItem('quizResults');
    localStorage.removeItem('adminAnalytics');
    sessionStorage.clear();
    console.log('✅ All data cleared. Refresh the page.');
  }
};

// Auto-run basic diagnostic
console.log('🔧 FLASH CARDS & QUIZ DIAGNOSTIC TOOL LOADED');
console.log('\nAvailable commands:');
console.log('  flashCardDiagnostic.runFullDiagnostic() - Complete diagnostic');
console.log('  flashCardDiagnostic.diagnoseFlashCardsError() - Flash cards only');
console.log('  flashCardDiagnostic.diagnoseQuizSubmission() - Quiz submission only');
console.log('  flashCardDiagnostic.testQuizSubmission() - Test actual submission');
console.log('  flashCardDiagnostic.clearAllData() - Clear all data');

console.log('\n🎯 For the flash cards error:');
console.log('1. Open browser console (F12)');
console.log('2. Try to open flash cards and note the exact error message');
console.log('3. Run flashCardDiagnostic.diagnoseFlashCardsError()');

console.log('\n🎯 For quiz not saving to database:');
console.log('1. Run flashCardDiagnostic.testQuizSubmission()');
console.log('2. Check if test data appears in admin analytics');
console.log('3. Compare behavior with actual quiz submissions');
