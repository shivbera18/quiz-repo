const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, url, data = null, headers = {}) {
  const urlObj = new URL(url);
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = require(urlObj.protocol === 'https:' ? 'https' : 'http').request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAttemptedQuizzes() {
  console.log('🧪 Testing Attempted Quizzes Feature');
  console.log('=' .repeat(50));

  try {
    // Login as test student
    console.log('1. Logging in as test student...');
    const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
      email: 'student@test.com',
      password: 'password123',
      userType: 'student'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Add another quiz result for better testing
    console.log('\n2. Adding more quiz results for testing...');
    
    const quizResults = [
      {
        quizId: 'a08abc81-0961-4b9c-b4b1-9f93faa1fcbd', // Averages
        quizName: 'Averages',
        totalScore: 78,
        rawScore: 78,
        positiveMarks: 78,
        negativeMarks: 0,
        correctAnswers: 7,
        wrongAnswers: 3,
        unanswered: 0,
        timeSpent: 480,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        sections: { quantitative: 78, reasoning: 0, english: 0 },
        questions: [
          { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
          { questionId: 'q2', selectedAnswer: 'B', isCorrect: false }
        ]
      },
      {
        quizId: 'd88afea7-a378-482e-a732-b615b6773a70', // Simplification
        quizName: 'Simplification',
        totalScore: 92,
        rawScore: 92,
        positiveMarks: 92,
        negativeMarks: 0,
        correctAnswers: 9,
        wrongAnswers: 1,
        unanswered: 0,
        timeSpent: 360,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        sections: { quantitative: 92, reasoning: 0, english: 0 },
        questions: [
          { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
          { questionId: 'q2', selectedAnswer: 'B', isCorrect: true }
        ]
      }
    ];

    for (let i = 0; i < quizResults.length; i++) {
      const submitResponse = await makeRequest('POST', `${BASE_URL}/api/results`, quizResults[i], {
        'Authorization': `Bearer ${token}`
      });
      
      if (submitResponse.status === 200) {
        console.log(`   ✅ Quiz result ${i + 1} submitted successfully`);
      } else {
        console.log(`   ⚠️ Quiz result ${i + 1} submission failed: ${submitResponse.status}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fetch results to verify
    console.log('\n3. Fetching all quiz attempts...');
    const resultsResponse = await makeRequest('GET', `${BASE_URL}/api/results`, null, {
      'Authorization': `Bearer ${token}`
    });

    if (resultsResponse.status === 200) {
      const results = resultsResponse.data.results || [];
      console.log(`   ✅ Found ${results.length} quiz attempts in database`);
      
      console.log('\n   📊 Attempted Quizzes Summary:');
      results.forEach((result, index) => {
        console.log(`      ${index + 1}. ${result.quizName || 'Unknown'} - Score: ${result.totalScore}% - Date: ${new Date(result.date).toLocaleDateString()}`);
      });
      
      if (results.length > 0) {
        const avgScore = Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length);
        const bestScore = Math.max(...results.map(r => r.totalScore));
        const totalTime = Math.round(results.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / 60);
        
        console.log('\n   📈 Statistics:');
        console.log(`      Average Score: ${avgScore}%`);
        console.log(`      Best Score: ${bestScore}%`);
        console.log(`      Total Time Spent: ${totalTime} minutes`);
      }
    } else {
      console.log(`   ❌ Failed to fetch results: ${resultsResponse.status}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 Attempted Quizzes Feature Status:');
    console.log(`   API Working: ${resultsResponse.status === 200 ? '✅' : '❌'}`);
    console.log(`   Data Available: ${resultsResponse.data.results && resultsResponse.data.results.length > 0 ? '✅' : '❌'}`);
    console.log('\n📌 To test the UI:');
    console.log('   1. Go to http://localhost:3000/auth/login');
    console.log('   2. Login with: student@test.com / password123');
    console.log('   3. Visit the dashboard to see the "Attempted Quizzes" section');
    console.log('   4. Visit http://localhost:3000/history for detailed history view');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAttemptedQuizzes().catch(console.error);
