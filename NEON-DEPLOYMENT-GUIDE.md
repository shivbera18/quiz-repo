# Neon PostgreSQL Deployment Guide

## Overview
This guide helps you deploy your quiz application to production using Neon PostgreSQL as the database.

## Prerequisites
1. Neon PostgreSQL database setup
2. Vercel/Netlify/Railway account for deployment
3. Environment variables configured

## Step 1: Database Schema Migration

### For Neon PostgreSQL (Production)
Your current schema needs to be updated for PostgreSQL compatibility:

1. **Update schema.prisma for production:**
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Key differences from SQLite:**
   - Use `Json` type instead of `String` for JSON fields
   - PostgreSQL handles UUIDs natively
   - Foreign key constraints work differently

## Step 2: Environment Variables

### Required Environment Variables (.env.production or deployment platform):
```bash
# Neon PostgreSQL Connection
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Application Settings
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# Optional: AI Features
GEMINI_API_KEY="your-gemini-api-key"
```

### Getting your Neon DATABASE_URL:
1. Go to your Neon dashboard
2. Navigate to your project
3. Go to "Connection Details"
4. Copy the connection string
5. It should look like: `postgresql://user:password@ep-xyz.region.neon.tech/dbname?sslmode=require`

## Step 3: Schema Migration Commands

### Option A: Using Prisma Migrate (Recommended)
```bash
# Generate the Prisma client for PostgreSQL
npx prisma generate

# Push schema to Neon database
npx prisma db push

# Optional: If you want migration files
npx prisma migrate dev --name init
```

### Option B: Manual Schema Creation
If Prisma migration fails, you can manually create tables in Neon:

```sql
-- Create Users table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL,
    "userType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "totalQuizzes" INTEGER NOT NULL DEFAULT 0,
    "averageScore" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create Quiz table
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "negativeMarking" BOOLEAN NOT NULL DEFAULT true,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- Create QuizResult table
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScore" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "wrongAnswers" INTEGER NOT NULL,
    "unanswered" INTEGER NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "sections" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "rawScore" INTEGER NOT NULL DEFAULT 0,
    "positiveMarks" INTEGER NOT NULL DEFAULT 0,
    "negativeMarks" INTEGER NOT NULL DEFAULT 0,
    "negativeMarking" BOOLEAN NOT NULL DEFAULT true,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Step 4: Seed Data (Optional)

Create initial admin user and sample data:

```sql
-- Insert admin user
INSERT INTO "User" ("id", "name", "email", "password", "isAdmin", "userType", "createdAt") 
VALUES ('admin-001', 'Admin User', 'admin@yourdomain.com', 'admin123', true, 'admin', NOW());

-- Insert sample student
INSERT INTO "User" ("id", "name", "email", "password", "isAdmin", "userType", "createdAt") 
VALUES ('student-001', 'Test Student', 'student@test.com', 'student123', false, 'student', NOW());
```

## Step 5: Deployment Checklist

### Before Deployment:
- [ ] DATABASE_URL is correctly set in production environment
- [ ] NEXTAUTH_SECRET is set (generate with: `openssl rand -base64 32`)
- [ ] NEXTAUTH_URL matches your production domain
- [ ] Prisma client is generated for PostgreSQL
- [ ] Database schema is migrated to Neon

### After Deployment:
- [ ] Test user registration
- [ ] Test user login
- [ ] Test quiz creation (admin)
- [ ] Test quiz taking (student)
- [ ] Verify analytics work
- [ ] Check error logs

## Step 6: Troubleshooting

### Common Issues:

1. **Database Connection Errors:**
   - Verify DATABASE_URL format
   - Check if SSL is required (most Neon databases require SSL)
   - Ensure connection string includes `?sslmode=require`

2. **Prisma Client Errors:**
   - Regenerate client: `npx prisma generate`
   - Clear node_modules and reinstall
   - Verify schema matches database

3. **Migration Failures:**
   - Try `npx prisma db push` instead of migrate
   - Check for syntax differences between SQLite and PostgreSQL
   - Manually create tables if needed

4. **Authentication Errors:**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches production domain
   - Ensure user table exists and has correct structure

## Step 7: Monitoring

### Check Database Health:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check user count
SELECT COUNT(*) FROM "User";

-- Check quiz count
SELECT COUNT(*) FROM "Quiz";

-- Check recent quiz results
SELECT * FROM "QuizResult" ORDER BY "date" DESC LIMIT 5;
```

### Application Logs:
- Monitor deployment platform logs
- Check for database connection errors
- Watch for Prisma client errors

## Security Notes
- Never commit DATABASE_URL to git
- Use strong NEXTAUTH_SECRET
- Enable SSL for database connections
- Consider password hashing for production
- Implement rate limiting for auth endpoints

## Performance Tips
- Use connection pooling
- Index frequently queried fields
- Monitor query performance in Neon dashboard
- Consider caching for read-heavy operations
