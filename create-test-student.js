const { PrismaClient } = require('./lib/generated/prisma/client')

const prisma = new PrismaClient()

async function createTestStudent() {
  try {
    console.log('Creating test student...')
    
    const studentEmail = "student@test.com";
    const studentExists = await prisma.user.findUnique({ where: { email: studentEmail } });
    
    if (!studentExists) {
      const student = await prisma.user.create({
        data: {
          name: "Test Student",
          email: studentEmail,
          password: "password", // In production, hash this password
          isAdmin: false,
          userType: "student",
          totalQuizzes: 0,
          averageScore: 0,
        },
      });
      console.log("Test student created successfully!");
      console.log("Email:", student.email);
      console.log("Name:", student.name);
    } else {
      console.log("Test student already exists.");
    }
    
  } catch (error) {
    console.error('Error creating test student:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestStudent()
