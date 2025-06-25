#!/usr/bin/env node

// Script to seed some test quiz results for admin analytics
const fs = require('fs');

console.log('🌱 Seeding Admin Analytics Test Data...\n');

// Create mock quiz results that would be stored in localStorage
const testResults = [
  {
    _id: 'result_001',
    date: new Date().toISOString(),
    quizName: 'Reasoning Mock Test 1',
    quizId: '1',
    totalScore: 85,
    rawScore: 85,
    positiveMarks: 17,
    negativeMarks: 0,
    correctAnswers: 17,
    wrongAnswers: 3,
    unanswered: 0,
    timeSpent: 3600,
    userId: 'user_001',
    sections: { reasoning: 85 },
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  },
  {
    _id: 'result_002',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    quizName: 'Quantitative Aptitude Mock 1',
    quizId: '2',
    totalScore: 72,
    rawScore: 72,
    positiveMarks: 14,
    negativeMarks: 1,
    correctAnswers: 14,
    wrongAnswers: 4,
    unanswered: 2,
    timeSpent: 2700,
    userId: 'user_002',
    sections: { quantitative: 72 },
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  },
  {
    _id: 'result_003',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    quizName: 'English Language Mock 1',
    quizId: '3',
    totalScore: 91,
    rawScore: 91,
    positiveMarks: 18,
    negativeMarks: 0,
    correctAnswers: 18,
    wrongAnswers: 1,
    unanswered: 1,
    timeSpent: 3200,
    userId: 'user_003',
    sections: { english: 91 },
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  },
  {
    _id: 'result_004',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    quizName: 'Reasoning Mock Test 1',
    quizId: '1',
    totalScore: 67,
    rawScore: 67,
    positiveMarks: 13,
    negativeMarks: 2,
    correctAnswers: 13,
    wrongAnswers: 5,
    unanswered: 2,
    timeSpent: 3900,
    userId: 'user_001',
    sections: { reasoning: 67 },
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  },
  {
    _id: 'result_005',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    quizName: 'Quantitative Aptitude Mock 1',
    quizId: '2',
    totalScore: 88,
    rawScore: 88,
    positiveMarks: 17,
    negativeMarks: 0,
    correctAnswers: 17,
    wrongAnswers: 2,
    unanswered: 1,
    timeSpent: 2400,
    userId: 'user_004',
    sections: { quantitative: 88 },
    questions: [],
    negativeMarking: true,
    negativeMarkValue: 0.25
  }
];

// Calculate analytics stats
const totalUsers = new Set(testResults.map(r => r.userId)).size;
const totalAttempts = testResults.length;
const averageScore = Math.round(testResults.reduce((sum, r) => sum + r.totalScore, 0) / testResults.length);
const totalCorrect = testResults.reduce((sum, r) => sum + r.correctAnswers, 0);
const totalWrong = testResults.reduce((sum, r) => sum + r.wrongAnswers, 0);
const totalUnanswered = testResults.reduce((sum, r) => sum + r.unanswered, 0);

console.log('📊 Test Analytics Data Generated:');
console.log(`- ${testResults.length} quiz results`);
console.log(`- ${totalUsers} unique users`);
console.log(`- ${totalAttempts} total attempts`);
console.log(`- ${averageScore}% average score`);
console.log(`- ${totalCorrect} correct answers`);
console.log(`- ${totalWrong} wrong answers`);
console.log(`- ${totalUnanswered} unanswered questions`);

// Create instructions for testing
console.log('\n🧪 Testing Instructions:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to /admin in your browser');
console.log('3. Check that the analytics cards show the following values:');
console.log(`   - Total Users: ${totalUsers}`);
console.log(`   - Total Attempts: ${totalAttempts}`);
console.log(`   - Average Score: ${averageScore}%`);
console.log('4. Recent Activity section should show the latest quiz attempts');

// Save the test data to a JSON file for reference
fs.writeFileSync('./test-admin-analytics-data.json', JSON.stringify({
  testResults,
  expectedStats: {
    totalUsers,
    totalAttempts,
    averageScore,
    totalCorrect,
    totalWrong,
    totalUnanswered
  }
}, null, 2));

console.log('\n📁 Test data saved to: test-admin-analytics-data.json');

console.log('\n✅ Admin Analytics Test Data Ready!');
console.log('The admin dashboard should now show analytics when the fallback localStorage is used.');

// Instructions for adding to localStorage
console.log('\n📱 To add this data to localStorage (for testing):');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Application > Local Storage');
console.log('3. Add key "quizResults" with the testResults array as JSON');
console.log('4. Refresh the admin page');

console.log('\n🚀 Ready to test admin analytics!');
