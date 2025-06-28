# Database Migration Guide

This guide will help you migrate from SQLite to PostgreSQL development database while preserving your current data.

## Quick Migration (Recommended)

### Option 1: Fresh Development Setup
If you want to start with a clean development database:

```bash
# 1. Backup current SQLite data
node backup-database.js

# 2. Switch to PostgreSQL schema
node switch-to-development.js

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to PostgreSQL
npx prisma db push

# 5. Setup initial data
node setup-postgres-dev.js

# 6. Restart development server
pnpm dev
```

### Option 2: Full Data Migration
If you want to migrate existing data to PostgreSQL:

```bash
# 1. Run full migration (includes backup + data transfer)
node migrate-to-development.js

# 2. Generate Prisma client for PostgreSQL
npx prisma generate

# 3. Push schema to PostgreSQL (if needed)
npx prisma db push

# 4. Restart development server
pnpm dev
```

## What Each Script Does

### `backup-database.js`
- Creates JSON backup of current SQLite data
- Copies SQLite database file
- Saves to `database-backup/` directory

### `switch-to-development.js`
- Updates `prisma/schema.prisma` to use PostgreSQL
- Backs up current schema file
- No data migration

### `migrate-to-development.js`
- Full migration including data transfer
- Backs up SQLite data
- Migrates all data to PostgreSQL
- Updates schema file

### `setup-postgres-dev.js`
- Sets up fresh development data
- Creates admin and test users
- Creates subjects, chapters, and sample data

## Database URLs

- **Current SQLite**: `file:./dev.db`
- **Development PostgreSQL**: `postgresql://quizdb_owner:npg_5ITBoeNYp1gR@ep-blue-sound-a8tppvlf-pooler.eastus2.azure.neon.tech/quizdb?sslmode=require&channel_binding=require`

## Important Notes

1. **Backup First**: Always run `backup-database.js` before migration
2. **Schema Changes**: The schema will be updated for PostgreSQL compatibility
3. **Environment**: This is for development only
4. **Credentials**: Default admin: `admin@quiz.com / admin123`
5. **Rollback**: Use backup files to restore if needed

## Rollback to SQLite

If you need to go back to SQLite:

```bash
# 1. Restore schema
cp prisma/schema.prisma.sqlite.backup prisma/schema.prisma

# 2. Generate SQLite client
npx prisma generate

# 3. Restart server
pnpm dev
```

## Verification

After migration, verify:
1. Admin panel loads correctly
2. Analytics show data
3. Subject/Chapter management works
4. Quiz creation and results work

## Support

If you encounter issues:
1. Check the console logs
2. Verify database connection
3. Ensure Prisma client is regenerated
4. Check schema.prisma file content
