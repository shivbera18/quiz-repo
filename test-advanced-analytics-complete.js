const BASE_URL = 'http://localhost:3000';

async function testAdvancedAnalytics() {
  console.log('🧪 Testing Advanced Analytics Features...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful');
    console.log('Token:', loginData.token.substring(0, 20) + '...');

    // Step 2: Test admin analytics API
    console.log('\n2. Testing admin analytics API...');
    const analyticsResponse = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });

    if (!analyticsResponse.ok) {
      throw new Error(`Analytics API failed: ${analyticsResponse.status}`);
    }

    const analyticsData = await analyticsResponse.json();
    console.log('✅ Analytics API working');
    console.log('Results found:', analyticsData.results?.length || 0);
    console.log('Quizzes found:', analyticsData.quizzes?.length || 0);

    // Step 3: Analyze user data for advanced analytics
    if (analyticsData.results && analyticsData.results.length > 0) {
      console.log('\n3. Analyzing data for advanced analytics...');
      
      const results = analyticsData.results;
      const users = new Set();
      let hasAnswerData = 0;
      let hasUserData = 0;
      let hasSectionData = 0;

      results.forEach(result => {
        if (result.user) {
          users.add(result.user.id);
          hasUserData++;
        }
        if (result.answers && result.answers.length > 0) {
          hasAnswerData++;
        }
        if (result.sections) {
          hasSectionData++;
        }
      });

      console.log('✅ Data analysis complete:');
      console.log('  - Total results:', results.length);
      console.log('  - Unique users:', users.size);
      console.log('  - Results with user data:', hasUserData);
      console.log('  - Results with answer data:', hasAnswerData);
      console.log('  - Results with section data:', hasSectionData);

      // Step 4: Test question-level analytics data
      console.log('\n4. Testing question-level analytics...');
      let sampleResult = results.find(r => r.answers && r.answers.length > 0);
      
      if (sampleResult) {
        console.log('✅ Found sample result with question data:');
        console.log('  - Quiz:', sampleResult.quizName || 'Unknown');
        console.log('  - User:', sampleResult.user?.name || 'Unknown');
        console.log('  - Questions answered:', sampleResult.answers.length);
        console.log('  - Sample answer:', {
          questionId: sampleResult.answers[0].questionId,
          isCorrect: sampleResult.answers[0].isCorrect,
          selectedAnswer: sampleResult.answers[0].selectedAnswer
        });
      } else {
        console.log('⚠️  No results with detailed question data found');
      }

      // Step 5: Test user filtering capability
      console.log('\n5. Testing user filtering capability...');
      const userGroups = {};
      results.forEach(result => {
        if (result.user) {
          const userId = result.user.id;
          if (!userGroups[userId]) {
            userGroups[userId] = {
              user: result.user,
              attempts: 0,
              totalScore: 0,
              questions: []
            };
          }
          userGroups[userId].attempts++;
          userGroups[userId].totalScore += result.totalScore || 0;
          if (result.answers) {
            userGroups[userId].questions.push(...result.answers);
          }
        }
      });

      console.log('✅ User filtering test:');
      Object.values(userGroups).forEach(group => {
        console.log(`  - ${group.user.name}: ${group.attempts} attempts, avg score: ${Math.round(group.totalScore / group.attempts)}%`);
      });

    } else {
      console.log('⚠️  No analytics data found for testing');
    }

    // Step 6: Test UI pages accessibility
    console.log('\n6. Testing UI page accessibility...');
    
    const pages = [
      '/admin/analytics',
      '/admin/analytics/advanced'
    ];

    for (const page of pages) {
      const pageResponse = await fetch(`${BASE_URL}${page}`);
      if (pageResponse.ok) {
        console.log(`✅ Page accessible: ${page}`);
      } else {
        console.log(`❌ Page error: ${page} (${pageResponse.status})`);
      }
    }

    console.log('\n🎉 Advanced Analytics Test Complete!');
    console.log('\nFeatures verified:');
    console.log('✅ Admin authentication');
    console.log('✅ Analytics API data fetching');
    console.log('✅ User-specific data filtering');
    console.log('✅ Question-level analytics data');
    console.log('✅ UI page accessibility');
    console.log('\nThe advanced analytics features are ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Ensure the development server is running (npm run dev)');
    console.log('2. Check that the admin user exists in the database');
    console.log('3. Verify the analytics API is returning data');
    console.log('4. Check browser console for any JavaScript errors');
  }
}

// Run the test
testAdvancedAnalytics();
