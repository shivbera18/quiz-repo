# Local Database Setup Guide

This guide helps you set up a local SQLite database to avoid charges during development and testing.

## 🎯 Quick Setup (Recommended)

### 1. Export Production Data
```bash
npm run db:export
```
This will:
- Connect to your production PostgreSQL database
- Export all users, quizzes, quiz results, and questions
- Save data to `backup-data/` directory as JSON files

### 2. Setup Local Database
```bash
npm run db:setup-local
```
This will:
- Switch your schema to SQLite
- Create a local `dev.db` file
- Import all production data
- Generate Prisma client

### 3. Start Development Server
```bash
npm run dev
```
Your app will now use the local SQLite database!

## 🔄 Switching Between Environments

### Switch to Local (No charges)
```bash
npm run db:switch-local
```

### Switch to Production (Will incur charges)
```bash
npm run db:switch-production
```

### Check Current Database
```bash
node switch-database.js
```

## 📊 Database Management

### View Database Contents
```bash
npm run db:studio
```
Opens Prisma Studio to view/edit your local database

### Re-import Production Data
```bash
npm run db:export
npm run db:setup-local
```

## 📁 File Structure

```
prisma/
├── schema.prisma          # Main schema (switches between local/prod)
├── schema.local.prisma    # SQLite schema template
├── dev.db                 # Local SQLite database
└── migrations/

backup-data/               # Exported production data
├── users.json
├── quizzes.json
├── quiz-results.json
└── question-bank.json

.env.local                 # Current environment config
.env.local.dev            # Local development config
.env.local.production.backup # Production config backup
```

## 🔍 Key Differences: SQLite vs PostgreSQL

| Feature | PostgreSQL (Production) | SQLite (Local) |
|---------|------------------------|----------------|
| JSON Fields | Native JSON type | Stored as TEXT strings |
| Performance | High for production | Good for development |
| Cost | Pay per usage | Free |
| Concurrent Users | Many | Single connection |
| Data Size | Unlimited | Up to several GB |

## 🛠️ Manual Commands (if needed)

### Reset Local Database
```bash
rm prisma/dev.db
npx prisma db push
node setup-local-database.js
```

### Generate Prisma Client
```bash
npx prisma generate
```

### View Database Schema
```bash
npx prisma db pull
```

## ⚠️ Important Notes

1. **Always use local for development/testing** to avoid charges
2. **Only switch to production for deployment**
3. **Backup your data regularly** using the export script
4. **The local database resets** if you delete `dev.db`
5. **JSON fields are stored as strings** in SQLite (automatically parsed by your app)

## 🐛 Troubleshooting

### "Database not found" error
```bash
npm run db:setup-local
```

### "Schema out of sync" error
```bash
npx prisma db push
```

### "No data in local database"
```bash
npm run db:export
npm run db:setup-local
```

### App won't start
```bash
npm run db:switch-local
npx prisma generate
npm run dev
```

## 💡 Pro Tips

1. **Export data weekly** to keep local database current
2. **Use Prisma Studio** to inspect and debug data issues
3. **Test features locally first** before pushing to production
4. **Keep backup files** in version control (add to .gitignore if sensitive)
5. **Switch to production only when deploying**
