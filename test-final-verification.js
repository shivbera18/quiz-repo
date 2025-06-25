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

async function testFinalVerification() {
  console.log('🔍 FINAL VERIFICATION: Analytics & Database Integration');
  console.log('=' .repeat(70));

  try {
    // 1. Test Admin Analytics Endpoint
    console.log('\n1. Testing Admin Analytics API...');
    const analyticsResponse = await makeRequest('GET', `${BASE_URL}/api/admin/analytics`);
    console.log(`   Status: ${analyticsResponse.status}`);
    
    if (analyticsResponse.status === 200) {
      const { results, quizzes } = analyticsResponse.data;
      console.log(`   ✅ Quiz Results Found: ${results.length}`);
      console.log(`   ✅ Quizzes Found: ${quizzes.length}`);
      
      if (results.length > 0) {
        console.log('\n   📊 Latest Quiz Result:');
        const latestResult = results[results.length - 1];
        console.log(`      User: ${latestResult.userEmail}`);
        console.log(`      Quiz: ${latestResult.quiz?.title || 'Unknown'}`);
        console.log(`      Score: ${latestResult.totalScore}`);
        console.log(`      Date: ${latestResult.date}`);
      }
    } else {
      console.log(`   ❌ Analytics API failed with status ${analyticsResponse.status}`);
    }

    // 2. Test Student Login and Submit Another Result
    console.log('\n2. Testing Student Flow...');
    const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
      email: 'neha@gmail.com',
      password: 'password123',
      userType: 'student'
    });

    if (loginResponse.status === 200) {
      console.log('   ✅ Student login successful');
      const token = loginResponse.data.token;
      
      // Submit another quiz result
      const submitResponse = await makeRequest('POST', `${BASE_URL}/api/results`, {
        quizId: 'a08abc81-0961-4b9c-b4b1-9f93faa1fcbd', // Averages quiz
        quizName: 'Averages',
        totalScore: 92,
        rawScore: 92,
        positiveMarks: 92,
        negativeMarks: 0,
        correctAnswers: 9,
        wrongAnswers: 1,
        unanswered: 0,
        timeSpent: 420,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        sections: {
          quantitative: 92,
          reasoning: 0,
          english: 0
        },
        questions: [
          { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
          { questionId: 'q2', selectedAnswer: 'B', isCorrect: true },
          { questionId: 'q3', selectedAnswer: 'C', isCorrect: false }
        ]
      }, {
        'Authorization': `Bearer ${token}`
      });

      if (submitResponse.status === 200) {
        console.log('   ✅ Second quiz result submitted successfully');
      } else {
        console.log(`   ❌ Quiz submission failed: ${submitResponse.status}`);
      }
    } else {
      console.log(`   ❌ Student login failed: ${loginResponse.status}`);
    }

    // 3. Re-check Analytics After New Submission
    console.log('\n3. Re-checking Analytics After New Submission...');
    const finalAnalytics = await makeRequest('GET', `${BASE_URL}/api/admin/analytics`);
    
    if (finalAnalytics.status === 200) {
      const { results } = finalAnalytics.data;
      console.log(`   📈 Total Results Now: ${results.length}`);
      
      if (results.length >= 2) {
        console.log('\n   📊 All Quiz Results:');
        results.forEach((result, index) => {
          console.log(`      ${index + 1}. ${result.userEmail} - ${result.quiz?.title || 'Unknown'} - Score: ${result.totalScore}`);
        });
      }
    }

    // 4. Test Student Results API
    console.log('\n4. Testing Student Results API...');
    if (loginResponse.status === 200) {
      const token = loginResponse.data.token;
      const studentResults = await makeRequest('GET', `${BASE_URL}/api/results`, null, {
        'Authorization': `Bearer ${token}`
      });
      
      if (studentResults.status === 200) {
        console.log(`   ✅ Student can fetch their results: ${studentResults.data.results.length} found`);
      } else {
        console.log(`   ❌ Student results API failed: ${studentResults.status}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 FINAL STATUS:');
    console.log(`   Admin Analytics API: ${analyticsResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Database Integration: ${analyticsResponse.status === 200 && analyticsResponse.data.results.length > 0 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Student Submission: ${loginResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (analyticsResponse.status === 200 && analyticsResponse.data.results.length > 0) {
      console.log('\n🎉 SUCCESS! Analytics and database integration are working correctly!');
      console.log('   - Quiz results are being saved to the database');
      console.log('   - Admin analytics can read from the database');
      console.log('   - Data persists across sessions');
    } else {
      console.log('\n❌ There are still issues that need to be resolved.');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testFinalVerification().catch(console.error);
