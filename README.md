# Quiz Platform

A modern quiz platform built with Next.js, Prisma, and PostgreSQL.

## Features

- Admin and Student authentication
- Quiz creation and management with AI assistance
- Flexible timing with negative marking
- AI Quiz Generator using Google Gemini
- Real-time analytics and progress tracking
- Mobile-friendly responsive design
- Multi-section support
- Centralized question bank with CRUD operations
- Advanced filtering and search capabilities
- Import questions from question bank to quizzes
- Configurable difficulty levels and negative marking
- Modern UI with dark/light theme support

## Tech Stack

- Frontend: Next.js 14, React, TypeScript
- UI: Tailwind CSS, Shadcn/ui
- Database: PostgreSQL (production), SQLite (development)
- ORM: Prisma
- AI: Google Gemini for question generation
- Deployment: Vercel

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your local database URL and Gemini API key
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

1. Set up a PostgreSQL database (Neon, Supabase, or Railway).

2. Push code to GitHub and import to Vercel.

3. Add environment variables:
   - DATABASE_URL: Your PostgreSQL connection string
   - NEXTAUTH_SECRET: A random secret key
   - NEXTAUTH_URL: Your Vercel app URL
   - GEMINI_API_KEY: Your Google Gemini API key

4. Deploy.

5. Run migrations on production database:
```bash
export DATABASE_URL="your-production-database-url"
npx prisma migrate deploy
npx prisma generate
```

## Default Accounts

### Admin Account
- Email: admin@bank.com
- Password: password

### Test Student Account
- Email: student@test.com
- Password: password

## License

MIT License
