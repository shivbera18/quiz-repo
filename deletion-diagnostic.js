/**
 * DELETION DIAGNOSTIC TOOL
 * 
 * Copy and paste this into your browser console when you're on the admin analytics page
 * to diagnose deletion issues in real-time.
 */

window.deletionDiagnostic = {
  async runFullDiagnostic() {
    console.log('🔍 DELETION DIAGNOSTIC STARTING...\n');
    
    try {
      // Step 1: Check current admin analytics data
      console.log('Step 1: Fetching current admin analytics...');
      const adminResponse = await fetch('/api/admin/analytics?_t=' + Date.now());
      const adminData = await adminResponse.json();
      const currentResults = adminData.results || [];
      
      console.log(`📊 Current results in admin analytics: ${currentResults.length}`);
      if (currentResults.length > 0) {
        console.log('📝 Sample results:', currentResults.slice(0, 3).map(r => ({
          id: r.id || r._id,
          userId: r.userId,
          userName: r.userName,
          quizId: r.quizId
        })));
      }
      
      // Step 2: Check browser localStorage
      console.log('\nStep 2: Checking browser localStorage...');
      const localData = localStorage.getItem('adminAnalytics');
      if (localData) {
        console.log('⚠️  Found adminAnalytics in localStorage (this should NOT be used):');
        const parsed = JSON.parse(localData);
        console.log(`   Cached results: ${parsed.results?.length || 0}`);
      } else {
        console.log('✅ No adminAnalytics in localStorage (correct)');
      }
      
      // Step 3: Check if there are any results to test deletion with
      if (currentResults.length === 0) {
        console.log('\n❌ No results found to test deletion with.');
        console.log('   Create a test quiz result first, then run this diagnostic again.');
        return;
      }
      
      // Step 4: Test deletion on the first result
      const testResult = currentResults[0];
      const testId = testResult.id || testResult._id;
      
      console.log(`\nStep 4: Testing deletion of result: ${testId}`);
      console.log(`   User: ${testResult.userName} (${testResult.userEmail})`);
      
      const deleteResponse = await fetch(`/api/admin/results?id=${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'admin-token'}`
        }
      });
      
      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log('✅ Delete API call successful:', deleteResult);
        
        // Step 5: Wait and check if it's really gone
        console.log('\nStep 5: Waiting 1 second, then checking if deletion persisted...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const verifyResponse = await fetch('/api/admin/analytics?_t=' + Date.now());
        const verifyData = await verifyResponse.json();
        const afterResults = verifyData.results || [];
        
        const stillExists = afterResults.find(r => (r.id || r._id) === testId);
        
        if (stillExists) {
          console.log('❌ PROBLEM DETECTED: Result still exists after deletion!');
          console.log('   This confirms the "reappearing result" bug.');
          console.log('   Result details:', stillExists);
        } else {
          console.log('✅ Deletion successful - result no longer exists');
        }
        
        // Step 6: Try to delete the same result again
        console.log('\nStep 6: Testing double deletion...');
        const doubleDeleteResponse = await fetch(`/api/admin/results?id=${testId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'admin-token'}`
          }
        });
        
        if (doubleDeleteResponse.ok) {
          console.log('⚠️  Double deletion succeeded (unexpected)');
        } else {
          const errorText = await doubleDeleteResponse.text();
          console.log(`✅ Double deletion properly failed: ${doubleDeleteResponse.status} - ${errorText}`);
        }
        
      } else {
        const errorText = await deleteResponse.text();
        console.log(`❌ Delete API call failed: ${deleteResponse.status} - ${errorText}`);
      }
      
      console.log('\n🎯 DIAGNOSTIC COMPLETE');
      console.log('Check the logs above to identify the issue.');
      
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
    }
  },
  
  async clearAllCache() {
    console.log('🧹 Clearing all admin analytics cache...');
    localStorage.removeItem('adminAnalytics');
    sessionStorage.removeItem('adminAnalytics');
    console.log('✅ Cache cleared. Refresh the page to fetch fresh data.');
  },
  
  async checkCacheState() {
    console.log('🔍 Checking cache state...');
    const localData = localStorage.getItem('adminAnalytics');
    const sessionData = sessionStorage.getItem('adminAnalytics');
    
    console.log('localStorage adminAnalytics:', localData ? 'EXISTS' : 'NONE');
    console.log('sessionStorage adminAnalytics:', sessionData ? 'EXISTS' : 'NONE');
    
    if (localData) {
      const parsed = JSON.parse(localData);
      console.log('localStorage results count:', parsed.results?.length || 0);
    }
  }
};

// Auto-run basic diagnostic
console.log('🔧 DELETION DIAGNOSTIC TOOL LOADED');
console.log('Available commands:');
console.log('  deletionDiagnostic.runFullDiagnostic() - Run complete deletion test');
console.log('  deletionDiagnostic.clearAllCache() - Clear admin analytics cache');
console.log('  deletionDiagnostic.checkCacheState() - Check current cache state');
console.log('\nRunning basic cache check...');
window.deletionDiagnostic.checkCacheState();
