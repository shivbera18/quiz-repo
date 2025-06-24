#!/bin/bash
# Production database setup script
# Run this after deploying to Vercel

echo "Setting up production database..."

# Make sure you have your production DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Please set DATABASE_URL environment variable to your production database"
    echo "Example: export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Creating admin user..."
node seed-admin.js

echo "Database setup complete!"
echo "You can now access your app and login with:"
echo "Admin: admin@bank.com / password"
