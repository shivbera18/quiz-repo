# Gemini API Migration - Deployment Guide

## ✅ Completed Migration Tasks

1. **Code Migration**: Replaced OpenAI API with Google Gemini API
2. **Environment Variables**: Updated all `.env` files to use `GEMINI_API_KEY`
3. **Documentation**: Updated README.md with Gemini API instructions
4. **Dependencies**: Installed `@google/generative-ai` package
5. **Test Scripts**: Created test scripts for Gemini API
6. **Git**: All changes committed and pushed to GitHub

## 🚀 Next Steps for Production Deployment

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key or use an existing one
5. Copy the API key (starts with `AIza...`)

### 2. Set Up Vercel Environment Variable

1. Go to your Vercel dashboard
2. Select your quiz platform project
3. Go to "Settings" → "Environment Variables"
4. Add a new environment variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (the one starting with `AIza...`)
   - **Environment**: Select "Production", "Preview", and "Development"
5. Click "Save"

### 3. Redeploy Your Application

1. Go to the "Deployments" tab in Vercel
2. Click "Redeploy" on your latest deployment
3. Or push a small change to trigger automatic deployment

### 4. Test the Deployment

1. Once deployed, test the AI question generation feature
2. Go to Admin → Question Bank → AI Generator
3. Try generating questions for a topic
4. Verify that questions are generated successfully

## 🔧 Local Development Setup

To set up the Gemini API key locally:

1. Copy `.env.local.example` to `.env.local`
2. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Run the test script to verify:
   ```bash
   node test-gemini-api.js
   ```

## 📋 Verification Checklist

- [ ] Gemini API key obtained from Google AI Studio
- [ ] Environment variable `GEMINI_API_KEY` set in Vercel
- [ ] Application redeployed on Vercel
- [ ] AI question generation tested and working
- [ ] Local development environment tested

## 🆘 Troubleshooting

### If you see "Invalid API key" errors:
1. Verify the API key is correct (starts with `AIza...`)
2. Check that the key is enabled for the Gemini API
3. Ensure the environment variable name is exactly `GEMINI_API_KEY`

### If deployment fails:
1. Check Vercel build logs for errors
2. Verify all dependencies are properly installed
3. Ensure environment variable is set correctly

### For local testing:
Run `node test-gemini-api.js` to verify your API key setup.

## 💰 Cost Comparison

- **OpenAI**: Paid service with usage-based pricing
- **Gemini**: Free tier with generous limits (15 requests per minute, 1 million tokens per minute)

Your quiz platform is now cost-effective and ready for production! 🎉
