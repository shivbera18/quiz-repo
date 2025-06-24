@echo off
REM Production database setup script for Windows
REM Run this after deploying to Vercel

echo Setting up production database...

if "%DATABASE_URL%"=="" (
    echo Please set DATABASE_URL environment variable to your production database
    echo Example: set DATABASE_URL=postgresql://user:pass@host:port/db
    exit /b 1
)

echo Running Prisma migrations...
npx prisma migrate deploy

echo Generating Prisma client...
npx prisma generate

echo Creating admin user...
node seed-admin.js

echo Database setup complete!
echo You can now access your app and login with:
echo Admin: admin@bank.com / password
