/**
 * Student Analytics Diagnostic Tool
 * 
 * To use this tool:
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * This will diagnose why analytics might not be showing
 */

async function diagnoseStudentAnalytics() {
  console.log('🔍 Student Analytics Diagnostic Tool');
  console.log('=' .repeat(50));
  
  try {
    // Check 1: Authentication State
    console.log('\n1️⃣ Checking Authentication...');
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('Auth Token (authToken):', authToken ? 'Present ✅' : 'Missing ❌');
    console.log('Auth Token (token):', token ? 'Present ✅' : 'Missing ❌');
    console.log('User Data:', user ? 'Present ✅' : 'Missing ❌');
    
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('User Name:', userData.name);
        console.log('User Email:', userData.email);
        console.log('User ID:', userData.id);
      } catch (e) {
        console.log('❌ User data is corrupted');
      }
    }
    
    // Check 2: Local Storage Data
    console.log('\n2️⃣ Checking Local Storage...');
    const quizResults = localStorage.getItem('quizResults');
    if (quizResults) {
      try {
        const results = JSON.parse(quizResults);
        console.log(`Quiz Results in localStorage: ${results.length} ✅`);
        if (results.length > 0) {
          console.log('Latest result:', {
            id: results[0]._id,
            quiz: results[0].quizName,
            score: results[0].totalScore,
            date: results[0].date
          });
        }
      } catch (e) {
        console.log('❌ Quiz results data is corrupted');
      }
    } else {
      console.log('Quiz Results in localStorage: None');
    }
    
    // Check 3: API Connectivity
    console.log('\n3️⃣ Testing API Connection...');
    const activeToken = authToken || token;
    
    if (activeToken) {
      try {
        const response = await fetch('/api/results', {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });
        
        console.log(`API Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`API Results: ${data.results?.length || 0} ✅`);
          console.log('API Response:', data);
          
          if (data.results && data.results.length > 0) {
            console.log('Sample API result:', data.results[0]);
          }
        } else {
          const errorText = await response.text();
          console.log('API Error:', errorText);
        }
      } catch (error) {
        console.log('❌ Network Error:', error.message);
      }
    } else {
      console.log('❌ No authentication token available');
    }
    
    // Check 4: Page Context
    console.log('\n4️⃣ Checking Page Context...');
    console.log('Current URL:', window.location.href);
    console.log('Page Title:', document.title);
    
    // Check if we're on the analytics page
    if (window.location.pathname.includes('/analytics')) {
      console.log('✅ On analytics page');
      
      // Check if React components are loaded
      const analyticsElements = document.querySelectorAll('[data-testid], .analytics, #analytics');
      console.log(`Analytics elements found: ${analyticsElements.length}`);
      
      // Check for error messages
      const errorElements = document.querySelectorAll('.error, .alert, [class*="error"]');
      if (errorElements.length > 0) {
        console.log('⚠️ Error elements found on page:', errorElements.length);
      }
    } else {
      console.log('ℹ️ Not on analytics page');
    }
    
    // Check 5: Browser Console Errors
    console.log('\n5️⃣ Recommendations...');
    
    if (!activeToken) {
      console.log('🔧 SOLUTION: You are not logged in. Please log in first.');
    } else if (activeToken && (!user || !JSON.parse(user || '{}').name)) {
      console.log('🔧 SOLUTION: Authentication data is incomplete. Try logging out and back in.');
    } else {
      console.log('🔧 Authentication looks good. If analytics still not showing:');
      console.log('   1. Clear your browser cache and reload');
      console.log('   2. Log out and log back in');
      console.log('   3. Check if you\'ve completed any quizzes');
      console.log('   4. Try the "Force Refresh" button if available');
    }
    
    // Check 6: Specific Debugging Steps
    console.log('\n6️⃣ Quick Fixes to Try...');
    console.log('Run these commands in console:');
    console.log('');
    console.log('// Clear all cache and reload:');
    console.log('localStorage.clear(); window.location.reload();');
    console.log('');
    console.log('// Force refresh analytics:');
    console.log('window.location.href = "/analytics?refresh=" + Date.now();');
    console.log('');
    console.log('// Check your user account:');
    console.log('console.log("Your account:", JSON.parse(localStorage.getItem("user") || "{}"));');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

// Auto-run the diagnostic
console.log('🚀 Running Student Analytics Diagnostic...');
diagnoseStudentAnalytics();
