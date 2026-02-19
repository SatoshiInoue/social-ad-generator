# Vercel Deployment Guide

This guide walks you through deploying the Social Ad Generator application to Vercel.

## Prerequisites

Before deploying, ensure you have:
- A hosted PostgreSQL database (see [SETUP.md](SETUP.md) for Neon or Supabase options)
- All API credentials from [SETUP.md](SETUP.md):
  - Google OAuth credentials
  - GitHub OAuth credentials
  - AWS S3 credentials
  - Google Gemini API key
- Your code pushed to a GitHub repository
- A Vercel account ([vercel.com](https://vercel.com))

---

## Step 1 — Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New… → Project"**
3. Find your repository in the list and click **"Import"**
4. Under **"Framework Preset"**, confirm it shows **Next.js** (should auto-detect)
5. **DO NOT click Deploy yet** — you must configure environment variables first (Step 2)

---

## Step 2 — Set Environment Variables

Before deploying, add all required environment variables in Vercel.

### Option A: During Project Import (Recommended)

In the import screen, you'll see an **"Environment Variables"** section. Add each of the following:

### Option B: After Project Creation

If you already created the project, go to **Project Settings → Environment Variables** and add the vars there.

### Required Environment Variables

Add all 12 of these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your hosted PostgreSQL connection string | From Neon or Supabase |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate | Generate a fresh secret for production |
| `NEXTAUTH_URL` | Your Vercel production URL | e.g., `https://your-app.vercel.app` — NOT `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | From Google Cloud Console |
| `GITHUB_CLIENT_ID` | Your GitHub OAuth app client ID | From GitHub OAuth App settings |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth app client secret | From GitHub OAuth App settings |
| `AWS_REGION` | Your S3 bucket region | e.g., `us-east-1`, `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` | Your AWS IAM access key ID | From AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | Your AWS IAM secret access key | From AWS IAM |
| `AWS_S3_BUCKET` | Your S3 bucket name | e.g., `social-ad-gen-abc123` |
| `GOOGLE_GEMINI_API_KEY` | Your Google Gemini API key | From Google AI Studio |

> ⚠️ **CRITICAL**: Set `NEXTAUTH_URL` to your Vercel domain (e.g., `https://your-app.vercel.app`), NOT `http://localhost:3000`. This is required for OAuth to work in production.

---

## Step 3 — Set Node.js Version

1. Go to **Project Settings → General**
2. Under **"Node.js Version"**, select **22.x** (required for `@napi-rs/canvas`)
3. Click **"Save"**

---

## Step 4 — Deploy

1. Click the **"Deploy"** button
2. Vercel will install dependencies and build your project (~2–3 minutes)
3. Once complete, you'll see a success message and a deployment URL (e.g., `https://your-app.vercel.app`)

---

## Step 5 — Run Database Migrations (One-time)

After the deployment succeeds, you must apply the Prisma schema to your production database.

### Option A: Run Locally (Easiest)

Temporarily set your production database URL and run migrations:

```bash
DATABASE_URL="your-production-db-connection-string" npx prisma db push
```

Example with Neon:
```bash
DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/social_ad_generator?sslmode=require" npx prisma db push
```

When prompted `"Would you like to continue?"`, type **`y`** and press Enter.

### Option B: Use Vercel CLI

If you have the Vercel CLI installed:

```bash
npm i -g vercel
vercel env pull .env.production.local
npx prisma db push
```

This automatically pulls your production env vars and runs migrations against the production DB.

---

## Step 6 — Update OAuth Callback URLs

Your OAuth providers must know about your production domain.

### Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services → Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **"Authorized JavaScript origins"**, click **"Add URI"** and enter:
   ```
   https://your-app.vercel.app
   ```
6. Under **"Authorized redirect URIs"**, click **"Add URI"** and enter:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
7. Click **"Save"**

### Update GitHub OAuth

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click on your OAuth app
3. Update **"Homepage URL"** to:
   ```
   https://your-app.vercel.app
   ```
4. Update **"Authorization callback URL"** to:
   ```
   https://your-app.vercel.app/api/auth/callback/github
   ```
5. Click **"Update application"**

---

## Step 7 — Update S3 CORS for Production

Add your production domain to your S3 bucket's CORS configuration so the browser can upload files directly to S3.

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com)
2. Click on your bucket name
3. Go to the **"Permissions"** tab
4. Scroll down to **"Cross-origin resource sharing (CORS)"**
5. Click **"Edit"** and paste the following (replace with your actual domain):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app.vercel.app"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

6. Click **"Save changes"**

---

## Step 8 — Test Your Deployment

Visit your production URL (e.g., `https://your-app.vercel.app`) and verify:

1. ✅ You're redirected to `/sign-in` (authentication is working)
2. ✅ You can sign in with Google or GitHub
3. ✅ You see the Dashboard after signing in
4. ✅ You can navigate to Brands, Media Library, and Campaigns pages
5. ✅ You can create a brand and upload media (test S3)
6. ✅ You can create a campaign and generate assets (test Gemini)

---

## ⚠️ Important: Vercel Function Timeout

AI asset generation jobs can take **30–60 seconds**. However:

- **Vercel Hobby plan** limits serverless functions to **10 seconds** → generation will timeout
- **Vercel Pro plan** allows up to **60 seconds** → should work fine

### Recommendation

For production use, upgrade to **Vercel Pro** ($20/month) to support longer-running generation jobs.

If you must use Hobby, the job will continue processing in the database (client polling will eventually timeout), but you may see incomplete results.

---

## 🚀 Next Steps

- Monitor your deployment at `your-app.vercel.app`
- Check Vercel's **"Deployments"** tab for build logs if anything fails
- Monitor API usage and costs (Gemini can incur charges, as can database queries)
- Set up Vercel's monitoring/alerts for production issues

---

## Troubleshooting

### "NEXTAUTH_URL mismatch" Error
- Check that `NEXTAUTH_URL` in Vercel env vars matches your actual deployment domain
- Make sure it doesn't have a trailing slash

### OAuth "Redirect URI mismatch"
- Verify the callback URLs in Google/GitHub OAuth apps exactly match your Vercel domain
- Include the full path (e.g., `/api/auth/callback/google`)

### S3 Upload Fails (403 Error)
- Check that your bucket's CORS configuration includes your Vercel domain
- Verify the bucket policy allows `s3:PutObject` from the IAM user
- Check S3 bucket name is correct in `AWS_S3_BUCKET` env var

### Prisma DB Push Fails
- Verify `DATABASE_URL` is correct and the database is accessible
- Check that your firewall/security groups allow connections from your IP (if running locally)
- If using Neon, check that the database hasn't hit its storage limit

### Generation Jobs Timeout (10s Limit)
- Upgrade to Vercel Pro plan
- Or use a background job queue (beyond scope of current app)

---

## Monitoring & Maintenance

### View Logs
In Vercel dashboard, go to **"Deployments" → [Your Deployment] → "Logs"** to see server output.

### Monitor Costs
- **Database**: Check Neon/Supabase dashboard for storage/compute
- **S3**: Check AWS billing for storage and request costs
- **Gemini**: Monitor usage at [Google AI Studio](https://aistudio.google.com)

### Rollback to Previous Version
If a deployment breaks, go to **Deployments** tab and click **"Promote to Production"** on a previous stable build.

---

Good luck! 🚀
