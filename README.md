# Quiz Platform - Deployment Guide

A modern quiz platform built with Next.js, Prisma, and PostgreSQL.

## Features

- 🔐 Admin and Student authentication
- 📝 Quiz creation and management
- ⏱️ Timed quizzes with negative marking
- 📊 Real-time analytics and progress tracking
- 📱 Mobile-friendly responsive design
- 🎯 Section-wise scoring (Reasoning, Quantitative, English)

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI**: Tailwind CSS, Shadcn/ui
- **Database**: PostgreSQL (production), SQLite (development)
- **ORM**: Prisma
- **Deployment**: Vercel

## Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd quiz-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your local database URL
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Seed initial data:
```bash
node seed-admin.js
node create-test-student.js
node create-test-quiz.js
```

6. Start the development server:
```bash
npm run dev
```

## Deployment to Vercel

### 1. Database Setup (Choose one)

#### Option A: Neon (Recommended)
1. Go to [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string

#### Option B: Supabase
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string

#### Option C: Railway
1. Go to [Railway](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string

### 2. Deploy to Vercel

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: A random secret key
   - `NEXTAUTH_URL`: Your Vercel app URL

5. Deploy!

### 3. Set up the production database

After deployment, run these commands locally (pointing to production DB):

```bash
# Set your production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
node seed-admin.js
```

## Default Accounts

### Admin Account
- Email: `admin@bank.com`
- Password: `password`

### Test Student Account
- Email: `student@test.com`
- Password: `password`

## Environment Variables

### Required for Production:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for session encryption
- `NEXTAUTH_URL`: Your production domain

### Development:
- `DATABASE_URL`: Can use SQLite (`file:./dev.db`)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Admin (requires admin auth)
- `GET /api/admin/quizzes` - List all quizzes with analytics
- `POST /api/admin/quizzes` - Create new quiz
- `GET /api/admin/quizzes/[id]` - Get quiz details
- `PATCH /api/admin/quizzes/[id]` - Update quiz
- `DELETE /api/admin/quizzes/[id]` - Delete quiz

### Student (requires auth)
- `GET /api/quizzes` - List active quizzes
- `GET /api/quizzes/[id]` - Get quiz for taking
- `POST /api/results/[id]` - Submit quiz results

## Database Schema

The application uses Prisma with the following main models:
- `User`: Admin and student accounts
- `Quiz`: Quiz definitions with questions
- `QuizResult`: Completed quiz submissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects.
