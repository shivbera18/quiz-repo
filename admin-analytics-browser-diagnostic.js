// Advanced Analytics Diagnostic Tool
// Paste this into the browser console while on the admin analytics page

(function() {
  console.log('🔬 Advanced Analytics Diagnostic Tool Starting...\n');

  // Check current localStorage state
  console.log('1. Checking localStorage...');
  const localStorage_quizResults = localStorage.getItem('quizResults');
  const localStorage_adminAnalytics = localStorage.getItem('adminAnalytics');
  
  console.log(`   - quizResults in localStorage: ${localStorage_quizResults ? localStorage_quizResults.length + ' chars' : 'None'}`);
  console.log(`   - adminAnalytics in localStorage: ${localStorage_adminAnalytics ? localStorage_adminAnalytics.length + ' chars' : 'None'}`);

  if (localStorage_quizResults) {
    try {
      const parsed = JSON.parse(localStorage_quizResults);
      console.log(`   - Parsed quizResults: ${parsed.length} items`);
      if (parsed.length > 0) {
        console.log('   ⚠️  WARNING: localStorage has cached quiz results that might interfere with real-time sync!');
      }
    } catch (e) {
      console.log('   - Error parsing localStorage quizResults:', e.message);
    }
  }

  // Test API endpoints
  console.log('\n2. Testing API endpoints...');
  
  fetch('/api/admin/analytics?_test=diagnostic')
    .then(response => {
      console.log(`   - Admin Analytics API: ${response.status} ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      console.log(`   - API returned ${data.results?.length || 0} results`);
      console.log(`   - API returned ${data.quizzes?.length || 0} quizzes`);
      
      // Check if any results have duplicate IDs
      const results = data.results || [];
      const ids = results.map(r => r.id || r._id);
      const uniqueIds = new Set(ids);
      
      if (ids.length !== uniqueIds.size) {
        console.log('   ⚠️  WARNING: Duplicate result IDs detected in API response!');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        console.log('   - Duplicate IDs:', [...new Set(duplicates)]);
      }
      
      // Check for recently deleted items that might still be showing
      const now = new Date();
      const recent = results.filter(r => {
        const resultDate = new Date(r.date || r.createdAt);
        const timeDiff = now - resultDate;
        return timeDiff < 24 * 60 * 60 * 1000; // Last 24 hours
      });
      
      console.log(`   - Recent results (last 24h): ${recent.length}`);
      
      // Check for suspicious patterns
      const userCounts = {};
      results.forEach(r => {
        const userId = r.userId || r.user?.id;
        if (userId) {
          userCounts[userId] = (userCounts[userId] || 0) + 1;
        }
      });
      
      const highCountUsers = Object.entries(userCounts).filter(([_, count]) => count > 10);
      if (highCountUsers.length > 0) {
        console.log('   - Users with >10 results:', highCountUsers);
      }

      return data;
    })
    .catch(error => {
      console.error('   ❌ API Error:', error);
    });

  // Check current page state
  console.log('\n3. Checking current page state...');
  
  // Try to detect React component state
  const reactFiberKey = Object.keys(document.body).find(key => key.startsWith('__reactFiber'));
  if (reactFiberKey) {
    console.log('   - React detected on page');
  }

  // Check if we're on the right page
  const path = window.location.pathname;
  console.log(`   - Current path: ${path}`);
  
  if (path.includes('/admin/analytics')) {
    console.log('   ✅ On admin analytics page');
  } else {
    console.log('   ⚠️  Not on admin analytics page');
  }

  // Clear problematic localStorage
  console.log('\n4. Diagnostic Actions...');
  
  const clearCache = () => {
    console.log('   - Clearing potentially problematic localStorage...');
    localStorage.removeItem('quizResults');
    localStorage.removeItem('adminAnalytics');
    localStorage.removeItem('studentAnalytics');
    console.log('   ✅ Cache cleared');
  };

  const forceRefresh = () => {
    console.log('   - Force refreshing page...');
    window.location.reload(true);
  };

  const testDeleteSync = async () => {
    console.log('   - Testing deletion sync...');
    try {
      const response = await fetch('/api/admin/analytics?_sync_test=true');
      const data = await response.json();
      console.log(`   - Sync test: ${data.results?.length || 0} results currently in database`);
    } catch (error) {
      console.error('   - Sync test failed:', error);
    }
  };

  // Provide diagnostic actions
  window.adminDiagnostic = {
    clearCache,
    forceRefresh,
    testDeleteSync,
    checkAPI: () => fetch('/api/admin/analytics').then(r => r.json()),
    clearLocalStorage: clearCache
  };

  console.log('\n🔧 Diagnostic Functions Available:');
  console.log('   - adminDiagnostic.clearCache() - Clear localStorage cache');
  console.log('   - adminDiagnostic.forceRefresh() - Force page refresh');
  console.log('   - adminDiagnostic.testDeleteSync() - Test deletion sync');
  console.log('   - adminDiagnostic.checkAPI() - Check API directly');

  console.log('\n✅ Diagnostic complete! Check the console output above for issues.');
  
  // Auto-run some safe diagnostics
  setTimeout(() => {
    console.log('\n🔄 Running automatic API check...');
    window.adminDiagnostic.testDeleteSync();
  }, 1000);

})();
