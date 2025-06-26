const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function investigateDataMismatch() {
  console.log('🔍 Investigating Potential Data Mismatch Issues...\n');
  
  try {
    // Get all users and their quiz results
    const users = await prisma.user.findMany({
      include: {
        quizHistory: {
          select: {
            id: true,
            totalScore: true,
            date: true,
            quizId: true
          },
          orderBy: { date: 'desc' }
        }
      }
    });
    
    console.log('👥 All Users and Their Results:');
    console.log('=' .repeat(60));
    
    users.forEach(user => {
      console.log(`\n${user.isAdmin ? '👨‍💼' : '🎓'} ${user.name} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Quiz Results: ${user.quizHistory.length}`);
      
      if (user.quizHistory.length > 0) {
        user.quizHistory.forEach(result => {
          console.log(`   - ${result.id} | Score: ${result.totalScore} | ${new Date(result.date).toLocaleString()}`);
        });
      } else {
        console.log('   - No quiz results');
      }
    });
    
    // Check for orphaned quiz results (results without valid user references)
    console.log('\n\n🔍 Checking for Data Integrity Issues...');
    console.log('=' .repeat(60));
    
    const allResults = await prisma.quizResult.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    console.log(`\n📊 All Quiz Results (${allResults.length} total):`);
    
    const orphanedResults = [];
    const validResults = [];
    
    allResults.forEach(result => {
      if (!result.user) {
        orphanedResults.push(result);
        console.log(`❌ ORPHANED: ${result.id} | UserID: ${result.userId} | Score: ${result.totalScore} | No matching user found`);
      } else {
        validResults.push(result);
        console.log(`✅ VALID: ${result.id} | User: ${result.user.name} | Score: ${result.totalScore}`);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Valid Results: ${validResults.length}`);
    console.log(`   Orphaned Results: ${orphanedResults.length}`);
    
    if (orphanedResults.length > 0) {
      console.log('\n⚠️  PROBLEM DETECTED: Orphaned quiz results found!');
      console.log('   These results belong to user IDs that no longer exist in the users table.');
      console.log('   This could cause analytics to not show properly for some users.');
      
      // Check if we can identify the orphaned user IDs
      const orphanedUserIds = [...new Set(orphanedResults.map(r => r.userId))];
      console.log('\n🔍 Orphaned User IDs:');
      orphanedUserIds.forEach(userId => {
        const resultsCount = orphanedResults.filter(r => r.userId === userId).length;
        console.log(`   - ${userId} (${resultsCount} results)`);
      });
    }
    
    // Test student analytics for users that actually have results
    console.log('\n\n🧪 Testing Student Analytics for Users with Results...');
    console.log('=' .repeat(60));
    
    const usersWithResults = users.filter(user => !user.isAdmin && user.quizHistory.length > 0);
    
    if (usersWithResults.length === 0) {
      console.log('❌ No regular users with quiz results found for testing');
      
      // Check if there are results attributed to non-existent users
      const nonAdminResults = allResults.filter(result => {
        return result.user && !result.user.isAdmin;
      });
      
      console.log(`\nFound ${nonAdminResults.length} results for non-admin users in the system`);
    } else {
      for (const user of usersWithResults) {
        console.log(`\n🧪 Testing analytics for: ${user.name}`);
        await testUserAnalytics(user);
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testUserAnalytics(user) {
  try {
    const token = `${user.id}-${Date.now()}-test`;
    
    console.log(`   Database results for user: ${user.quizHistory.length}`);
    
    // Test the API
    const response = await fetch('http://localhost:3000/api/results', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   API results for user: ${data.results?.length || 0}`);
      
      if (data.results?.length !== user.quizHistory.length) {
        console.log(`   ⚠️  MISMATCH: DB has ${user.quizHistory.length}, API returns ${data.results?.length || 0}`);
        
        // Log the details to help debug
        console.log('   DB Result IDs:', user.quizHistory.map(r => r.id));
        console.log('   API Result IDs:', data.results?.map(r => r._id) || []);
      } else {
        console.log('   ✅ Match: API and database counts align');
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ API failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ Test error: ${error.message}`);
  }
}

// Run the investigation
investigateDataMismatch();
