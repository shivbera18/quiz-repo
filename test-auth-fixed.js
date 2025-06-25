#!/usr/bin/env node

// Test the fixed API endpoint with proper authentication
console.log('🧪 Testing Fixed API Endpoint...\n');

const testWithProperAuth = async () => {
  try {
    // First, let's create a test user and get a token
    console.log('🔐 Creating test user and getting token...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@test.com',
        password: 'password123',
        userType: 'student'
      })
    });
    
    if (!loginResponse.ok) {
      // Try to create a user first
      console.log('🏗️ Creating test user...');
      const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Student',
          email: 'student@test.com',
          password: 'password123',
          userType: 'student'
        })
      });
      
      if (!signupResponse.ok) {
        console.log('⚠️ Using mock token instead');
        // For testing, let's check what a real token looks like
        return;
      }
      
      // Try login again
      const secondLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@test.com',
          password: 'password123',
          userType: 'student'
        })
      });
      
      if (!secondLoginResponse.ok) {
        console.log('❌ Could not get authentication token');
        return;
      }
      
      const loginData = await secondLoginResponse.json();
      console.log('✅ Login successful, got token:', loginData.token);
      
      // Now test the results API with the real token
      await testResultsAPI(loginData.token);
      
    } else {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful, got token:', loginData.token);
      
      // Test the results API with the real token
      await testResultsAPI(loginData.token);
    }
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
  }
};

const testResultsAPI = async (token) => {
  try {
    console.log('\n📡 Testing /api/results with real token...');
    
    const response = await fetch('http://localhost:3000/api/results', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API response successful:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ API error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

const main = async () => {
  // Wait for dev server
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testWithProperAuth();
};

main().catch(console.error);
