// Browser diagnostic script to test admin panel deletion from database
// Run this in the browser console on the admin analytics page
console.log('🔍 Admin Panel Database Deletion Diagnostic\n');

window.adminDeletionDiagnostic = async function() {
  try {
    console.log('📊 Step 1: Checking current admin analytics data...');
    
    // Check if we're on the admin analytics page
    if (!window.location.pathname.includes('/admin/analytics')) {
      console.log('❌ Please run this on the admin analytics page (/admin/analytics)');
      return;
    }
    
    // Get current data from the page
    const currentResults = window.results || [];
    console.log(`📈 Current page shows ${currentResults.length} quiz results`);
    
    if (currentResults.length === 0) {
      console.log('ℹ️  No results to test deletion with');
      console.log('💡 Create some quiz results first, then return to test deletion');
      return;
    }
    
    // Show current results
    console.log('\n📋 Current Results:');
    currentResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.userName || result.user?.name || 'Unknown'} - ${result.totalScore}% (ID: ${result.id || result._id})`);
    });
    
    console.log('\n🔍 Step 2: Testing fresh data fetch from database...');
    
    // Test direct API call to verify database state
    const apiResponse = await fetch('/api/admin/analytics?_t=' + Date.now());
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      const apiResults = apiData.results || [];
      console.log(`✅ API returns ${apiResults.length} results directly from database`);
      
      if (apiResults.length !== currentResults.length) {
        console.log(`⚠️  Data mismatch: Page shows ${currentResults.length}, API returns ${apiResults.length}`);
        console.log('This suggests caching issues or sync problems');
      } else {
        console.log('✅ Page data matches database data');
      }
    } else {
      console.log('❌ Failed to fetch from API:', apiResponse.status);
    }
    
    console.log('\n🗑️ Step 3: Testing deletion functionality...');
    console.log('💡 To test deletion:');
    console.log('1. Click the trash icon (🗑️) next to any result');
    console.log('2. Confirm the deletion');
    console.log('3. Watch the browser console for deletion logs');
    console.log('4. The result should disappear from the table');
    console.log('5. Run this diagnostic again to verify database sync');
    
    console.log('\n🔧 What to look for:');
    console.log('✅ "🗑️ Delete API response: 200" - Deletion succeeded');
    console.log('✅ "✅ Deletion confirmed: [result-id]" - Server confirmed deletion');
    console.log('✅ "✅ Admin analytics refreshed after deletion" - Page refreshed');
    console.log('❌ Any error messages indicate problems');
    
    console.log('\n📊 Step 4: Individual Quiz Results data source verification...');
    console.log('The Individual Quiz Results table on this page shows data from:');
    console.log('- Source: /api/admin/analytics API');
    console.log('- Database: QuizResult table via Prisma');
    console.log('- Refresh: Automatic after each deletion');
    console.log('- Cache busting: Uses timestamp parameter');
    
    return {
      pageResults: currentResults.length,
      apiResultsAvailable: !!apiResponse.ok,
      testMessage: 'Diagnostic complete - test deletion manually and re-run'
    };
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return { error: error.message };
  }
};

// Auto-run the diagnostic
window.adminDeletionDiagnostic().then(result => {
  console.log('\n🎯 Diagnostic Summary:', result);
  console.log('\n💻 To test deletion, run: window.testSingleDeletion(resultId)');
  console.log('Example: window.testSingleDeletion("result-id-here")');
});

// Helper function to test a single deletion
window.testSingleDeletion = async function(resultId) {
  if (!resultId) {
    console.log('❌ Please provide a result ID');
    return;
  }
  
  console.log(`🗑️ Testing deletion of result: ${resultId}`);
  
  try {
    // Get count before
    const beforeResponse = await fetch('/api/admin/analytics');
    const beforeData = await beforeResponse.json();
    const beforeCount = beforeData.results?.length || 0;
    
    console.log(`📊 Before deletion: ${beforeCount} results in database`);
    
    // Perform deletion
    const deleteResponse = await fetch(`/api/admin/results?id=${resultId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("adminToken") || "admin-token"}`
      }
    });
    
    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log('✅ Deletion API succeeded:', deleteResult);
      
      // Wait and check count after
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterResponse = await fetch('/api/admin/analytics?_t=' + Date.now());
      const afterData = await afterResponse.json();
      const afterCount = afterData.results?.length || 0;
      
      console.log(`📊 After deletion: ${afterCount} results in database`);
      
      if (afterCount === beforeCount - 1) {
        console.log('✅ SUCCESS: Result properly deleted from database!');
        console.log('✅ Individual quiz results are fetching fresh data from database');
      } else {
        console.log(`❌ PROBLEM: Expected ${beforeCount - 1} results, but found ${afterCount}`);
      }
      
    } else {
      const errorText = await deleteResponse.text();
      console.log('❌ Deletion failed:', deleteResponse.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

console.log('\n📝 Instructions:');
console.log('1. Copy and paste this entire script into browser console on /admin/analytics');
console.log('2. Review the diagnostic output');
console.log('3. Test deletion by clicking trash icons or using window.testSingleDeletion(id)');
console.log('4. Verify that deleted results disappear from both UI and database');
