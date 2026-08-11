import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding identity-svc...")

  // Reset to baseline on every run so tests (and local dev) start from a
  // deterministic state regardless of what a previous run mutated.
  const admin = await prisma.user.upsert({
    where: { email: "admin@quizapp.com" },
    update: { name: "Admin User", password: "admin123", isAdmin: true, userType: "admin" },
    create: {
      id: "admin-001",
      name: "Admin User",
      email: "admin@quizapp.com",
      password: "admin123",
      isAdmin: true,
      userType: "admin",
      totalQuizzes: 0,
      averageScore: 0,
    },
  })

  const student = await prisma.user.upsert({
    where: { email: "student@test.com" },
    update: { name: "Test Student", password: "student123", isAdmin: false, userType: "student" },
    create: {
      id: "student-001",
      name: "Test Student",
      email: "student@test.com",
      password: "student123",
      isAdmin: false,
      userType: "student",
      totalQuizzes: 0,
      averageScore: 0,
    },
  })

  await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: { name: "Demo Student", password: "student123", isAdmin: false, userType: "student" },
    create: {
      id: "student-002",
      name: "Demo Student",
      email: "student@example.com",
      password: "student123",
      isAdmin: false,
      userType: "student",
      totalQuizzes: 0,
      averageScore: 0,
    },
  })

  console.log("Seeded:", { admin: admin.email, student: student.email })
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
