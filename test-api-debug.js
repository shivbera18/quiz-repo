#!/usr/bin/env node

// Test script to check API endpoints and database connectivity
console.log('🔍 Testing Quiz Results API and Database...\n');

const testApiEndpoint = async () => {
  try {
    console.log('📡 Testing /api/results endpoint...');
    
    // Test the GET endpoint without auth first
    const response = await fetch('http://localhost:3000/api/results', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

const testDatabaseConnection = async () => {
  try {
    console.log('\n🗄️ Testing database connection...');
    
    // Import Prisma client
    const { PrismaClient } = require('./lib/generated/prisma/client');
    const prisma = new PrismaClient();
    
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Check if QuizResult table exists and has data
    const count = await prisma.quizResult.count();
    console.log(`📊 Current QuizResult records: ${count}`);
    
    // Get recent results
    const recentResults = await prisma.quizResult.findMany({
      take: 5,
      orderBy: { date: 'desc' }
    });
    console.log('📈 Recent results:', recentResults.length > 0 ? recentResults : 'No results found');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
};

const main = async () => {
  // Wait a moment for dev server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await testDatabaseConnection();
  await testApiEndpoint();
  
  console.log('\n🎯 Debug Checklist:');
  console.log('□ Check if dev server is running on http://localhost:3000');
  console.log('□ Check browser console for errors during quiz submission');
  console.log('□ Verify authentication token is being passed correctly');
  console.log('□ Check if DATABASE_URL in .env.local is correct');
  console.log('□ Try taking a quiz and check browser network tab');
};

main().catch(console.error);
