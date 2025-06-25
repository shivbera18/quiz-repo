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

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Quiz Flow with Debug Info');
  console.log('=' .repeat(50));

  // Step 1: Check if server is running
  try {
    const healthCheck = await makeRequest('GET', `${BASE_URL}/api/results`);
    console.log(`✅ Server is running (status: ${healthCheck.status})`);
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    return;
  }

  // Step 2: Login as test user
  console.log('\n1. Logging in as test user...');
  const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
    email: 'student@test.com',
    password: 'password123',
    userType: 'student'
  });

  console.log(`   Login status: ${loginResponse.status}`);
  console.log(`   Login response:`, JSON.stringify(loginResponse.data, null, 2));

  if (loginResponse.status !== 200 || !loginResponse.data.token) {
    console.log('❌ Login failed');
    return;
  }

  const token = loginResponse.data.token;
  console.log(`   Token: ${token}`);

  // Step 3: Check current results before submitting
  console.log('\n2. Checking current results...');
  const currentResults = await makeRequest('GET', `${BASE_URL}/api/results`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(`   Current results status: ${currentResults.status}`);
  console.log(`   Current results count: ${currentResults.data.results ? currentResults.data.results.length : 0}`);

  // Step 4: Check admin analytics before submitting
  console.log('\n3. Checking admin analytics before submission...');
  const adminAnalyticsBefore = await makeRequest('GET', `${BASE_URL}/api/admin/analytics`);
  console.log(`   Admin analytics status: ${adminAnalyticsBefore.status}`);
  console.log(`   Admin results count: ${adminAnalyticsBefore.data.results ? adminAnalyticsBefore.data.results.length : 0}`);

  // Step 5: Submit a quiz result
  console.log('\n4. Submitting quiz result...');
  const quizResult = {
    quizId: 'a0a36b91-06fe-45b0-8bf8-0eaf60367de4', // Use real quiz ID
    quizName: 'Blood Relation',
    totalScore: 85,
    rawScore: 85,
    positiveMarks: 85,
    negativeMarks: 0,
    correctAnswers: 8,
    wrongAnswers: 2,
    unanswered: 0,
    timeSpent: 300,
    negativeMarking: false,
    negativeMarkValue: 0,
    sections: {
      reasoning: 85,
      quantitative: 0,
      english: 0
    },
    questions: [
      { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
      { questionId: 'q2', selectedAnswer: 'B', isCorrect: true },
      { questionId: 'q3', selectedAnswer: 'C', isCorrect: false }
    ]
  };

  const submitResponse = await makeRequest('POST', `${BASE_URL}/api/results`, quizResult, {
    'Authorization': `Bearer ${token}`
  });

  console.log(`   Submit status: ${submitResponse.status}`);
  console.log(`   Submit response:`, JSON.stringify(submitResponse.data, null, 2));

  if (submitResponse.status !== 200) {
    console.log('❌ Quiz result submission failed');
    console.log('   Debugging auth token...');
    
    // Debug token parsing
    const tokenParts = token.split('-');
    console.log(`   Token parts: ${tokenParts.length}`);
    console.log(`   First part (should be UUID): ${tokenParts[0]}`);
    
    return;
  }

  // Step 6: Check results after submitting
  console.log('\n5. Checking results after submission...');
  const resultsAfter = await makeRequest('GET', `${BASE_URL}/api/results`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(`   Results after status: ${resultsAfter.status}`);
  console.log(`   Results after count: ${resultsAfter.data.results ? resultsAfter.data.results.length : 0}`);

  // Step 7: Check admin analytics after submitting
  console.log('\n6. Checking admin analytics after submission...');
  const adminAnalyticsAfter = await makeRequest('GET', `${BASE_URL}/api/admin/analytics`);
  console.log(`   Admin analytics status: ${adminAnalyticsAfter.status}`);
  console.log(`   Admin results count: ${adminAnalyticsAfter.data.results ? adminAnalyticsAfter.data.results.length : 0}`);

  if (adminAnalyticsAfter.data.results && adminAnalyticsAfter.data.results.length > 0) {
    console.log('   Latest result:', JSON.stringify(adminAnalyticsAfter.data.results[adminAnalyticsAfter.data.results.length - 1], null, 2));
  }

  // Step 8: Test direct database query
  console.log('\n7. Testing direct database connection...');
  const dbTest = await makeRequest('GET', `${BASE_URL}/api/admin/analytics`);
  console.log(`   DB test status: ${dbTest.status}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Test Summary:');
  console.log(`   Login: ${loginResponse.status === 200 ? '✅' : '❌'}`);
  console.log(`   Submit: ${submitResponse.status === 200 ? '✅' : '❌'}`);
  console.log(`   Results: ${resultsAfter.status === 200 ? '✅' : '❌'}`);
  console.log(`   Analytics: ${adminAnalyticsAfter.status === 200 ? '✅' : '❌'}`);
  console.log(`   Data persisted: ${adminAnalyticsAfter.data.results && adminAnalyticsAfter.data.results.length > 0 ? '✅' : '❌'}`);
}

// Run the test
testCompleteFlow().catch(console.error);
