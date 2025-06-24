const { PrismaClient } = require("./lib/generated/prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@bank.com";
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: "System Admin",
        email: adminEmail,
        password: "password", // In production, hash this password
        isAdmin: true,
        userType: "admin",
        createdAt: new Date(),
        lastLogin: new Date(),
        totalQuizzes: 0,
        averageScore: 0,
      },
    });
    console.log("Admin user created.");
  } else {
    console.log("Admin user already exists.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
