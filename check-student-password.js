const { PrismaClient } = require('./lib/generated/prisma/client');

async function checkStudentPassword() {
  const prisma = new PrismaClient();
  
  try {
    const student = await prisma.user.findUnique({ 
      where: { email: 'student@test.com' } 
    });
    
    if (student) {
      console.log('Student user found:');
      console.log(`Email: ${student.email}`);
      console.log(`Password: ${student.password}`);
      console.log(`UserType: ${student.userType}`);
      console.log(`IsAdmin: ${student.isAdmin}`);
    } else {
      console.log('Student user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentPassword().catch(console.error);
