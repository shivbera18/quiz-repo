#!/usr/bin/env node

// Comprehensive test for admin analytics functionality
const fs = require('fs');

console.log('🧪 Testing Admin Analytics End-to-End...\n');

// Test data from the seeded analytics
const testData = {
  "testResults": [
    {
      "_id": "result_001",
      "date": new Date().toISOString(),
      "quizName": "Reasoning Mock Test 1",
      "quizId": "1",
      "totalScore": 85,
      "rawScore": 85,
      "positiveMarks": 17,
      "negativeMarks": 0,
      "correctAnswers": 17,
      "wrongAnswers": 3,
      "unanswered": 0,
      "timeSpent": 3600,
      "userId": "user_001",
      "sections": { "reasoning": 85 },
      "questions": [],
      "negativeMarking": true,
      "negativeMarkValue": 0.25
    },
    {
      "_id": "result_002",
      "date": new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      "quizName": "Quantitative Aptitude Mock 1",
      "quizId": "2",
      "totalScore": 72,
      "rawScore": 72,
      "positiveMarks": 14,
      "negativeMarks": 1,
      "correctAnswers": 14,
      "wrongAnswers": 4,
      "unanswered": 2,
      "timeSpent": 2700,
      "userId": "user_002",
      "sections": { "quantitative": 72 },
      "questions": [],
      "negativeMarking": true,
      "negativeMarkValue": 0.25
    },
    {
      "_id": "result_003",
      "date": new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      "quizName": "English Language Mock 1",
      "quizId": "3",
      "totalScore": 91,
      "rawScore": 91,
      "positiveMarks": 18,
      "negativeMarks": 0,
      "correctAnswers": 18,
      "wrongAnswers": 1,
      "unanswered": 1,
      "timeSpent": 3200,
      "userId": "user_003",
      "sections": { "english": 91 },
      "questions": [],
      "negativeMarking": true,
      "negativeMarkValue": 0.25
    },
    {
      "_id": "result_004",
      "date": new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      "quizName": "Reasoning Mock Test 1",
      "quizId": "1",
      "totalScore": 67,
      "rawScore": 67,
      "positiveMarks": 13,
      "negativeMarks": 2,
      "correctAnswers": 13,
      "wrongAnswers": 5,
      "unanswered": 2,
      "timeSpent": 3900,
      "userId": "user_001",
      "sections": { "reasoning": 67 },
      "questions": [],
      "negativeMarking": true,
      "negativeMarkValue": 0.25
    },
    {
      "_id": "result_005",
      "date": new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      "quizName": "Quantitative Aptitude Mock 1",
      "quizId": "2",
      "totalScore": 88,
      "rawScore": 88,
      "positiveMarks": 17,
      "negativeMarks": 0,
      "correctAnswers": 17,
      "wrongAnswers": 2,
      "unanswered": 1,
      "timeSpent": 2400,
      "userId": "user_004",
      "sections": { "quantitative": 88 },
      "questions": [],
      "negativeMarking": true,
      "negativeMarkValue": 0.25
    }
  ]
};

// Function to test analytics calculations (same logic as in admin page)
function calculateAnalytics(results, quizzes = []) {
  const totalUsers = new Set(results.map(r => r.userId || 'user')).size;
  const totalAttempts = results.length;
  const averageScore = results.length > 0 ? 
    Math.round(results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / results.length) : 0;
  
  return {
    totalUsers,
    totalAttempts,
    totalQuizzes: quizzes.length || 3, // Mock quiz count
    activeQuizzes: quizzes.length || 3,
    totalQuestions: quizzes.reduce ? quizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 20), 0) : 60,
    averageScore,
    recentActivity: results.slice(-5)
  };
}

// Test the calculation
const testAnalytics = calculateAnalytics(testData.testResults);

console.log('📊 Test Analytics Calculation:');
console.log(`✓ Total Users: ${testAnalytics.totalUsers}`);
console.log(`✓ Total Attempts: ${testAnalytics.totalAttempts}`);
console.log(`✓ Total Quizzes: ${testAnalytics.totalQuizzes}`);
console.log(`✓ Active Quizzes: ${testAnalytics.activeQuizzes}`);
console.log(`✓ Total Questions: ${testAnalytics.totalQuestions}`);
console.log(`✓ Average Score: ${testAnalytics.averageScore}%`);
console.log(`✓ Recent Activity Count: ${testAnalytics.recentActivity.length}`);

// Generate HTML snippet for manual testing
const htmlSnippet = `
<!DOCTYPE html>
<html>
<head>
    <title>Admin Analytics Test</title>
</head>
<body>
    <h1>Admin Analytics Test</h1>
    <p>Open browser developer tools and run this in console:</p>
    <pre>
// Add test data to localStorage
localStorage.setItem('quizResults', JSON.stringify(${JSON.stringify(testData.testResults, null, 2)}));

// Verify data was saved
console.log('Quiz results saved:', JSON.parse(localStorage.getItem('quizResults')).length, 'results');

// Now refresh the admin page to see analytics
window.location.reload();
    </pre>
    
    <h2>Expected Analytics Values:</h2>
    <ul>
        <li>Total Users: ${testAnalytics.totalUsers}</li>
        <li>Total Attempts: ${testAnalytics.totalAttempts}</li>
        <li>Average Score: ${testAnalytics.averageScore}%</li>
        <li>Recent Activity: ${testAnalytics.recentActivity.length} items</li>
    </ul>
</body>
</html>
`;

fs.writeFileSync('./admin-analytics-test.html', htmlSnippet);

console.log('\n🌐 Test HTML file created: admin-analytics-test.html');

// Create a localStorage injection script
const localStorageScript = `
// Admin Analytics Test Script
// Run this in browser console on the admin page

console.log('🧪 Adding test data to localStorage...');

// Clear existing data
localStorage.removeItem('quizResults');

// Add test data
localStorage.setItem('quizResults', JSON.stringify(${JSON.stringify(testData.testResults, null, 2)}));

console.log('✅ Test data added successfully!');
console.log('Quiz results count:', JSON.parse(localStorage.getItem('quizResults')).length);

console.log('🔄 Refreshing page to see analytics...');
window.location.reload();
`;

fs.writeFileSync('./inject-test-data.js', localStorageScript);

console.log('📝 localStorage injection script created: inject-test-data.js');

console.log('\n🚀 How to Test Admin Analytics:');
console.log('1. Start development server: npm run dev');
console.log('2. Navigate to http://localhost:3000/admin');
console.log('3. Open browser developer tools (F12)');
console.log('4. Paste the content of inject-test-data.js into console');
console.log('5. Check that analytics cards show the expected values');

console.log('\n📋 Verification Checklist:');
console.log('□ Analytics cards show non-zero values');
console.log('□ Recent Activity section appears');
console.log('□ Average Score card shows 81%');
console.log('□ Total Users shows 4');
console.log('□ Total Attempts shows 5');
console.log('□ Recent activity shows last 5 quiz attempts');

console.log('\n🎯 Expected Admin Dashboard Stats:');
console.log(`- Total Users: ${testAnalytics.totalUsers}`);
console.log(`- Total Attempts: ${testAnalytics.totalAttempts}`);
console.log(`- Total Quizzes: ${testAnalytics.totalQuizzes}`);
console.log(`- Active Quizzes: ${testAnalytics.activeQuizzes}`);
console.log(`- Total Questions: ${testAnalytics.totalQuestions}`);
console.log(`- Average Score: ${testAnalytics.averageScore}%`);

console.log('\n✅ Admin Analytics Test Setup Complete!');
