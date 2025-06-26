// Environment Comparison Script
// Run this locally to compare with production

console.log('🔍 Local vs Production Environment Comparison\n');

// Function to check local environment
async function checkLocalEnvironment() {
  console.log('🏠 Checking LOCAL environment...\n');
  
  try {
    // Check local API
    const response = await fetch('http://localhost:3000/api/admin/analytics', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ LOCAL API Response:');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Results: ${data.results?.length || 0}`);
      console.log(`   - Quizzes: ${data.quizzes?.length || 0}`);
      
      if (data.results?.length > 0) {
        console.log('   - Sample result:', {
          id: data.results[0].id,
          userName: data.results[0].userName,
          quizTitle: data.results[0].quiz?.title,
          score: data.results[0].totalScore
        });
      }
    } else {
      console.log(`❌ LOCAL API Error: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ LOCAL API Test Failed:', error.message);
  }
}

// Function to check production environment
async function checkProductionEnvironment(productionUrl) {
  console.log(`\n🌐 Checking PRODUCTION environment: ${productionUrl}\n`);
  
  try {
    // Check production API
    const response = await fetch(`${productionUrl}/api/admin/analytics`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ PRODUCTION API Response:');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Results: ${data.results?.length || 0}`);
      console.log(`   - Quizzes: ${data.quizzes?.length || 0}`);
      
      if (data.results?.length > 0) {
        console.log('   - Sample result:', {
          id: data.results[0].id,
          userName: data.results[0].userName,
          quizTitle: data.results[0].quiz?.title,
          score: data.results[0].totalScore
        });
      } else {
        console.log('❌ PRODUCTION: No results returned!');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ PRODUCTION API Error: ${response.status}`);
      console.log('Error details:', errorText);
    }

    // Also check the production environment debug endpoint
    console.log('\n🔧 Checking production debug endpoint...');
    const debugResponse = await fetch(`${productionUrl}/api/debug/production-check`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('📊 Production Debug Info:');
      console.log('   - Database Connected:', debugData.database?.connected);
      console.log('   - Database Data:', debugData.database?.data);
      console.log('   - Environment Check:', debugData.environment);
      console.log('   - Recommendations:', debugData.recommendations);
    }

  } catch (error) {
    console.log('❌ PRODUCTION API Test Failed:', error.message);
  }
}

// Instructions for manual testing
console.log('📝 Instructions:');
console.log('1. Make sure your local dev server is running (npm run dev)');
console.log('2. Replace YOUR_PRODUCTION_URL below with your actual production URL');
console.log('3. Run this script to compare local vs production\n');

// Example usage (update the URL):
const PRODUCTION_URL = 'https://your-app.vercel.app'; // 👈 UPDATE THIS!

// Uncomment these lines and update the URL to run the comparison:
// checkLocalEnvironment();
// checkProductionEnvironment(PRODUCTION_URL);

console.log('🔧 To run this comparison:');
console.log('1. Update PRODUCTION_URL above');
console.log('2. Uncomment the last two lines');
console.log('3. Run: node environment-comparison.js');
