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

async function testQuizSubmissionFlow() {
  console.log('🧪 Testing Quiz Submission and Results Page');
  console.log('=' .repeat(50));

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
      email: 'student@test.com',
      password: 'password123',
      userType: 'student'
    });

    if (loginResponse.status !== 200) {
      console.log(`❌ Login failed with status: ${loginResponse.status}`);
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Submit a new quiz result
    console.log('\n2. Submitting new quiz result...');
    const quizResult = {
      quizId: 'a0a36b91-06fe-45b0-8bf8-0eaf60367de4', // Blood Relation
      quizName: 'Blood Relation Test',
      totalScore: 88,
      rawScore: 88,
      positiveMarks: 88,
      negativeMarks: 0,
      correctAnswers: 8,
      wrongAnswers: 2,
      unanswered: 0,
      timeSpent: 300,
      negativeMarking: true,
      negativeMarkValue: 0.25,
      sections: {
        reasoning: 88,
        quantitative: 0,
        english: 0
      },
      questions: [
        { 
          question: "Sample question 1", 
          options: ["A", "B", "C", "D"], 
          selectedAnswer: 0, 
          correctAnswer: 0, 
          isCorrect: true,
          section: "reasoning" 
        },
        { 
          question: "Sample question 2", 
          options: ["A", "B", "C", "D"], 
          selectedAnswer: 1, 
          correctAnswer: 2, 
          isCorrect: false,
          section: "reasoning" 
        }
      ]
    };

    const submitResponse = await makeRequest('POST', `${BASE_URL}/api/results`, quizResult, {
      'Authorization': `Bearer ${token}`
    });

    if (submitResponse.status !== 200) {
      console.log(`❌ Quiz submission failed: ${submitResponse.status}`);
      console.log('Response:', submitResponse.data);
      return;
    }

    const resultId = submitResponse.data.result._id;
    console.log(`✅ Quiz result submitted successfully with ID: ${resultId}`);

    // Step 3: Test fetching the result via API
    console.log('\n3. Testing result retrieval via API...');
    const resultResponse = await makeRequest('GET', `${BASE_URL}/api/results/${resultId}`, null, {
      'Authorization': `Bearer ${token}`
    });

    console.log(`   API Status: ${resultResponse.status}`);
    if (resultResponse.status === 200) {
      console.log('   ✅ Result retrieved successfully from API');
      console.log(`   Quiz Name: ${resultResponse.data.result.quizName}`);
      console.log(`   Score: ${resultResponse.data.result.totalScore}%`);
      console.log(`   Questions: ${resultResponse.data.result.questions.length}`);
    } else {
      console.log(`   ❌ Failed to retrieve result: ${resultResponse.data.message}`);
    }

    // Step 4: Test all user results
    console.log('\n4. Testing all user results...');
    const allResultsResponse = await makeRequest('GET', `${BASE_URL}/api/results`, null, {
      'Authorization': `Bearer ${token}`
    });

    if (allResultsResponse.status === 200) {
      const results = allResultsResponse.data.results || [];
      console.log(`   ✅ Found ${results.length} total results for user`);
      
      const latestResult = results.find(r => r.id === resultId);
      if (latestResult) {
        console.log('   ✅ Latest submitted result found in user results');
      } else {
        console.log('   ⚠️ Latest result not found in user results list');
      }
    } else {
      console.log(`   ❌ Failed to fetch user results: ${allResultsResponse.status}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 Quiz Submission Flow Status:');
    console.log(`   Login: ${loginResponse.status === 200 ? '✅' : '❌'}`);
    console.log(`   Quiz Submission: ${submitResponse.status === 200 ? '✅' : '❌'}`);
    console.log(`   Result Retrieval: ${resultResponse.status === 200 ? '✅' : '❌'}`);
    
    if (submitResponse.status === 200 && resultResponse.status === 200) {
      console.log('\n🎉 SUCCESS! The results page should now work correctly!');
      console.log(`📌 Test the result page at: http://localhost:3000/results/${resultId}`);
    } else {
      console.log('\n❌ There are still issues with the quiz submission flow.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testQuizSubmissionFlow().catch(console.error);
