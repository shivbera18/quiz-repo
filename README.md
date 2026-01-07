# Quiz Platform

A comprehensive, AI-powered quiz management system built for educational institutions and organizations. This platform enables administrators to create, manage, and analyze quizzes while providing students with an intuitive interface for taking examinations.

## Features

### Core Functionality
- **User Management**: Role-based authentication for administrators and students
- **Quiz Management**: Create and manage quizzes with flexible configurations
- **AI-Powered Generation**: Automatically generate quizzes using Google Gemini AI
- **Question Bank**: Centralized repository for reusable questions
- **Real-time Analytics**: Comprehensive progress tracking and performance metrics

### Technical Features
- **Flexible Timing**: Configurable quiz durations with negative marking
- **Multi-section Support**: Organize quizzes into multiple subject areas
- **Advanced Filtering**: Search and filter questions by difficulty, subject, and tags
- **Import/Export**: Bulk operations for question management
- **Responsive Design**: Mobile-friendly interface with dark/light themes

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Shadcn/ui |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL (Production), SQLite (Development) |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js |
| **AI Integration** | Google Gemini API |
| **Deployment** | Vercel |

## Prerequisites

- Node.js 18.x or later
- npm or pnpm
- PostgreSQL database (for production)
- Google Gemini API key

## Installation

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivbera18/quiz-repo.git
   cd quiz-repo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your database URL and API keys.

4. **Database setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Seed data**
   ```bash
   npm run seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Deployment

### Vercel Deployment

1. **Database Setup**
   - Create a PostgreSQL database on Neon, Supabase, or Railway
   - Note the connection string

2. **Repository Setup**
   - Push code to GitHub repository
   - Connect repository to Vercel

3. **Environment Variables**
   Configure the following in Vercel:
   ```
   DATABASE_URL=your_postgresql_connection_string
   NEXTAUTH_SECRET=your_random_secret_key
   NEXTAUTH_URL=https://your-app.vercel.app
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Deploy**
   - Vercel will automatically build and deploy
   - Run database migrations post-deployment

### Production Database Migration

After deployment, migrate the production database:
```bash
export DATABASE_URL="your_production_database_url"
npx prisma migrate deploy
npx prisma generate
```

## Usage

### Default Accounts

**Administrator Account**
- Email: `admin@bank.com`
- Password: `password`

**Student Account**
- Email: `student@test.com`
- Password: `password`

### Key Workflows

1. **Admin Login**: Access admin dashboard for quiz management
2. **Quiz Creation**: Use AI generator or manual creation
3. **Question Management**: Build and organize question bank
4. **Analytics Review**: Monitor student performance and quiz statistics
5. **Student Access**: Take quizzes through intuitive interface

## Project Structure

```
quiz-repo/
├── app/                    # Next.js App Router pages
│   ├── api/               # Backend API routes
│   ├── admin/             # Admin interface
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Student dashboard
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
├── prisma/                # Database schema and migrations
└── public/                # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Shivratan Bera**
- GitHub: [@shivbera18](https://github.com/shivbera18)

## Support

For support or questions, please open an issue on GitHub.
