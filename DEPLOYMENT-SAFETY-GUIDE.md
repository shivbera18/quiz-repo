# 🚀 Safe Deployment Guide

## Pre-Deployment Checklist

### ✅ Before Pushing to GitHub
1. **Environment Variables**: All sensitive data is in `.env.local` (not committed)
2. **Database Files**: Local database files are gitignored
3. **API Keys**: All API keys are in environment variables
4. **Backup Data**: Sensitive backup files are excluded

### ✅ Production Safety Measures
1. **Environment Separation**: Local development uses SQLite, production uses PostgreSQL
2. **Database Isolation**: Local changes won't affect production database
3. **Configuration Management**: Separate configs for local/production environments

## Deployment Steps

### 1. Push to GitHub (Safe)
```bash
# Add all files (sensitive files are automatically excluded by .gitignore)
git add .

# Commit changes
git commit -m "feat: Add activity calendar heatmap and flash questions carousel with mobile optimizations"

# Push to GitHub
git push origin main
```

### 2. Production Deployment Options

#### Option A: Vercel (Recommended)
1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` (your production PostgreSQL)
   - `NEXTAUTH_SECRET` (secure random string)
   - `NEXTAUTH_URL` (your production domain)
   - `GEMINI_API_KEY` (optional)

#### Option B: Manual Server Deployment
1. Pull code on your server: `git pull origin main`
2. Install dependencies: `npm install`
3. Set production environment variables
4. Generate Prisma client: `npm run prisma:generate`
5. Build application: `npm run build`
6. Start production: `npm start`

### 3. Database Migration (If Needed)
```bash
# Only run if you have schema changes
npx prisma db push
```

## Environment Variables Setup

### Local Development (.env.local)
```bash
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Production (.env.production or platform config)
```bash
DATABASE_URL="postgresql://your-production-db"
NEXTAUTH_SECRET="secure-random-string"
NEXTAUTH_URL="https://your-domain.com"
```

## Safety Features

### ✅ What's Protected
- ✅ Database files (`dev.db`, `dev.db-*`)
- ✅ Environment files (`.env.local`, `.env.production`)
- ✅ Backup data (`backup-data/`)
- ✅ Node modules and build files
- ✅ IDE settings and system files

### ✅ What's Included
- ✅ Source code and components
- ✅ Configuration templates
- ✅ Schema definitions (without data)
- ✅ Documentation and guides
- ✅ Package.json and dependencies

## Rollback Plan

If something goes wrong:
1. **Local Development**: Your local setup remains unchanged
2. **Production**: Use previous deployment or git revert
3. **Database**: No schema changes affect existing data

## Monitoring

After deployment, check:
- [ ] Application loads correctly
- [ ] Database connections work
- [ ] Authentication functions
- [ ] New features (calendar, flash questions) work
- [ ] Mobile responsiveness

## Support

If you encounter issues:
1. Check server logs
2. Verify environment variables
3. Test database connectivity
4. Contact support if needed
