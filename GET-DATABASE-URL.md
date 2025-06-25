# 🔧 How to Get Your Neon Database URL

## Method 1: From Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click on your quiz platform project
3. Go to **Settings** → **Environment Variables**
4. Find the `DATABASE_URL` variable
5. Copy the entire connection string (it should start with `postgresql://`)

## Method 2: From Neon Console

1. Go to https://console.neon.tech
2. Sign in and select your project
3. Click on **"Connection Details"** or **"Connection String"**
4. Copy the connection string (should look like):
   ```
   postgresql://username:password@ep-xxxxx.region.azure.neon.tech/database?sslmode=require
   ```

## Method 3: Check Your Deployed App Logs

1. In Vercel dashboard, go to **Functions** → **View Function Logs**
2. Look for any database connection logs that show the connection string

## Once You Have the URL:

1. Replace the `DATABASE_URL` in your `.env.local` file:
   ```bash
   DATABASE_URL="your_actual_neon_url_here"
   ```

2. Run these commands:
   ```bash
   pnpm prisma generate
   pnpm dev
   ```

3. Test the AI quiz generator again

## 🚨 Important Notes:

- The URL should start with `postgresql://`
- It should include your actual username, password, and database details
- Make sure it's the same URL that's working in production
- Don't share this URL publicly as it contains your database credentials

## Alternative: Test on Production

If you can't get the local setup working, you can test the AI quiz generator directly on your deployed Vercel app since it's already working there with the correct database setup.

Your deployed app: https://your-app.vercel.app/admin
