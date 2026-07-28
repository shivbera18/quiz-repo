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
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS, Shadcn/ui |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | Custom (opaque token, not NextAuth) |
| **AI Integration** | Google Gemini API |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Deployment** | Vercel |

## Prerequisites

- Node.js 20.x or later
- pnpm (the repo has a committed `pnpm-lock.yaml` — use pnpm, not npm/yarn)
- PostgreSQL database
- Google Gemini API key (optional — only needed for AI generation features)

## Installation & Deployment

See **[HOSTING.md](HOSTING.md)** for the full setup guide — local development, running the test suites, and deploying online (Vercel + Neon, plus alternatives). Quick start:

```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-repo
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npx prisma generate
npx prisma migrate deploy
DATABASE_URL="<your connection string>" pnpm db:seed
pnpm dev
```

## Usage

### Default Accounts (after running `pnpm db:seed`)

**Administrator Account**
- Email: `admin@quizapp.com`
- Password: `admin123`

**Student Account**
- Email: `student@test.com`
- Password: `student123`

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
