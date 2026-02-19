# Environment Setup Guide

This guide will help you obtain all necessary API keys and credentials for the Social Ad Generator application.

---

## 1. 🗄️ PostgreSQL Database

### Option A: Local PostgreSQL (Free)

1. **Install PostgreSQL**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15

   # Create database
   createdb social_ad_generator
   ```

2. **Get your DATABASE_URL**
   ```
   DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/social_ad_generator"
   ```
   - Replace `YOUR_USERNAME` with your Mac username
   - Default PostgreSQL port is 5432

### Option B: Hosted PostgreSQL (Free Tier Available)

#### **Neon (Recommended - Free Tier)**
1. Go to [https://neon.tech](https://neon.tech)
2. Click "Sign Up" (use GitHub or email)
3. Create a new project
4. Copy the connection string from dashboard
5. Use format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

#### **Supabase (Alternative)**
1. Go to [https://supabase.com](https://supabase.com)
2. Create account and new project
3. Go to Project Settings → Database
4. Copy "Connection string" under "Connection pooling"
5. Replace `[YOUR-PASSWORD]` with your database password

---

## 2. 🔐 NextAuth Secret

Generate a random secret for NextAuth:

```bash
openssl rand -base64 32
```

Copy the output and use it as:
```
NEXTAUTH_SECRET="your-generated-secret-here"
```

For production, also set:
```
NEXTAUTH_URL="https://your-production-domain.com"
```

For local development:
```
NEXTAUTH_URL="http://localhost:3000"
```

---

## 3. 🔵 Google OAuth Credentials

### Step-by-Step Instructions

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown (top left)
   - Click "New Project"
   - Name: "Social Ad Generator" (or your preference)
   - Click "Create"
   - Wait for project creation (few seconds)

3. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace)
   - Click "Create"
   - Fill in required fields:
     - App name: "Social Ad Generator"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - **Scopes**: Click "Add or Remove Scopes"
     - Search for and add: `userinfo.email` and `userinfo.profile`
     - Or just skip and click "Save and Continue" (NextAuth will request basic scopes)
   - **Test Users**: Add your email address as a test user
   - Click "Save and Continue"
   - Review and click "Back to Dashboard"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - **If prompted to configure consent screen**, click "Configure Consent Screen" and complete step 3 first
   - Application type: "Web application"
   - Name: "Social Ad Generator Web Client"
   - **Authorized JavaScript origins:**
     - Click "Add URI"
     - Enter: `http://localhost:3000`
     - (Add your production URL later, e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs:**
     - Click "Add URI"
     - Enter: `http://localhost:3000/api/auth/callback/google`
     - (Add production callback later, e.g., `https://yourdomain.com/api/auth/callback/google`)
   - Click "Create"

5. **Copy Your Credentials**
   - A popup will appear with your credentials
   - Copy both values:
   ```
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
   - ⚠️ **Save these immediately** - you can always view the Client ID later, but the secret can't be retrieved again

### Important Notes for Google OAuth

- **No API needs to be enabled** - Google OAuth works without enabling additional APIs
- **"App not verified" warning**: Normal for testing. Click "Advanced" → "Go to [App Name] (unsafe)" during testing
- **Test users**: While in "Testing" mode, only listed test users can sign in
- **Publishing**: To allow anyone to sign in, you'll need to publish the app (requires verification for production)
- **Scopes**: Basic profile and email scopes are automatically included by NextAuth

### Troubleshooting Google OAuth

| Issue | Solution |
|-------|----------|
| "Redirect URI mismatch" | Verify the redirect URI exactly matches: `http://localhost:3000/api/auth/callback/google` |
| "Access blocked: App not verified" | Add your email as a test user, or click "Advanced" → "Go to App" |
| "Invalid client" | Check Client ID and Secret are correctly copied to `.env` |
| 403 Error | Make sure you're signed in with a test user account |

---

## 4. 🐙 GitHub OAuth Credentials

### Step-by-Step Instructions

1. **Go to GitHub Settings**
   - Visit [https://github.com/settings/developers](https://github.com/settings/developers)
   - Sign in if needed

2. **Create New OAuth App**
   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App"

3. **Fill in Application Details**
   - Application name: "Social Ad Generator"
   - Homepage URL: `http://localhost:3000`
   - Application description: "AI-powered social ad generator"
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Click "Register application"

4. **Generate Client Secret**
   - After creation, you'll see your Client ID
   - Click "Generate a new client secret"
   - Copy both values immediately:
   ```
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   ```

⚠️ **Important**: Save the client secret immediately - you won't be able to see it again!

---

## 5. ☁️ AWS S3 Setup

### Step-by-Step Instructions

1. **Create AWS Account**
   - Go to [https://aws.amazon.com](https://aws.amazon.com)
   - Click "Create an AWS Account"
   - Follow the signup process (requires credit card, but free tier available)

2. **Create S3 Bucket**
   - Go to S3 console: [https://s3.console.aws.amazon.com](https://s3.console.aws.amazon.com)
   - Click "Create bucket"
   - Bucket name: `social-ad-gen-[your-unique-id]` (must be globally unique)
   - Region: Choose closest to you (e.g., `us-east-1`, `ap-northeast-1`)
   - **Block Public Access**: UNCHECK "Block all public access" (required for image viewing)
     - Check the acknowledgment box
   - Click "Create bucket"

3. **Configure Bucket for Public Read** (Required for generated images)

   After creating the bucket, apply this policy to allow public read access:

   a. Create a file `s3-bucket-policy.json`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicReadGetObject",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
     }]
   }
   ```
   Replace `YOUR-BUCKET-NAME` with your actual bucket name.

   b. Apply the policy (requires AWS CLI):
   ```bash
   # Allow bucket policies
   aws s3api put-public-access-block \
     --bucket YOUR-BUCKET-NAME \
     --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

   # Apply public read policy
   aws s3api put-bucket-policy \
     --bucket YOUR-BUCKET-NAME \
     --policy file://s3-bucket-policy.json
   ```

4. **Enable CORS**
   - Click on your bucket
   - Go to "Permissions" tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
   - Click "Save changes"

5. **Create IAM User**
   - Go to IAM console: [https://console.aws.amazon.com/iam](https://console.aws.amazon.com/iam)
   - Click "Users" → "Add users"
   - Username: "social-ad-gen-user"
   - Click "Next"

6. **Set Permissions**
   - Select "Attach policies directly"
   - Search and select: `AmazonS3FullAccess`
   - Click "Next" → "Create user"

7. **Create Access Key**
   - Click on the user you just created
   - Go to "Security credentials" tab
   - Scroll to "Access keys"
   - Click "Create access key"
   - Use case: "Application running outside AWS"
   - Click "Next" → "Create access key"
   - **IMPORTANT**: Download the .csv file or copy both keys now!
   ```
   AWS_ACCESS_KEY_ID="your-access-key-id"
   AWS_SECRET_ACCESS_KEY="your-secret-access-key"
   AWS_REGION="us-east-1"  (or your chosen region)
   AWS_S3_BUCKET="social-ad-gen-[your-unique-id]"
   ```

### Alternative: S3-Compatible Storage (Cheaper/Easier)

#### **Cloudflare R2** (Recommended - Free 10GB)
1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. R2 → Create bucket
3. Settings → S3 API credentials
4. Compatible with S3 API, just use R2 endpoint URL

---

## 6. 🤖 Google Gemini API Key

### ⚠️ CRITICAL: Paid Tier Required for Image Generation

**This application requires image generation capabilities, which are only available with a paid Gemini API key (Tier 1+).**

| Tier | Image Generation | Monthly Cost |
|------|------------------|--------------|
| **Free** | ❌ Text only | $0 |
| **Tier 1+** | ✅ All models including `gemini-2.5-flash-image` | Pay-as-you-go |

### Step-by-Step Instructions

1. **Go to Google AI Studio**
   - Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Get API key" or "Create API key"
   - Choose "Create API key in new project" (or select existing)
   - Click "Create API key"

3. **Copy Your Key**
   ```
   GOOGLE_GEMINI_API_KEY="your-api-key-here"
   ```

4. **Enable Billing (Required for Image Generation)**
   - Click your project name or go to Settings
   - Navigate to "Billing"
   - Click "Enable billing" or "Set up billing account"
   - Add payment method
   - **Important**: You'll be charged for image generation (~$0.04-0.08 per image)

5. **Verify Your Tier**
   After setup, verify you have access to image generation:
   ```bash
   npx tsx scripts/test-gemini-images.ts
   ```

   **Expected output for Tier 1+:**
   ```
   ✅ gemini-2.5-flash-image - WORKS!
      IMAGE FOUND! MimeType: image/png
   ```

   **Output for free tier (won't work):**
   ```
   ❌ gemini-2.5-flash-image - NOT FOUND (404)
   ```

### Models Used by This Application

- **Text Generation**: `gemini-2.5-flash` (creates prompts from campaign briefs)
- **Image Generation**: `gemini-2.5-flash-image` (generates advertising backgrounds)

### Important Notes

- **Free tier**: Only text models available, image generation will fail
- **Tier 1 required**: Must enable billing to access `gemini-2.5-flash-image`
- **API Key != OAuth**: The Gemini API key can be from a different Google Cloud project than your OAuth credentials
- **Cost estimate**: ~$0.12-0.24 per campaign (3 images at different aspect ratios)
- **Rate limits**: Tier 1 has higher limits than free tier
- **Keep secret**: Never commit API keys to git

### Verification Commands

After obtaining your API key, run these to verify setup:

```bash
# Test text generation (works on all tiers)
npx tsx scripts/test-gemini.ts

# Test image generation (requires Tier 1+)
npx tsx scripts/test-gemini-images.ts

# List all available models
npx tsx scripts/list-gemini-models.ts
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "404 Not Found" for image models | Upgrade to Tier 1+ by enabling billing |
| "403 Forbidden" | Check billing is enabled and payment method added |
| Generation stuck at 20% | Verify Tier 1+ access, check server logs for errors |
| "Invalid API key" | Double-check key is copied correctly to `.env` |

For detailed Gemini setup, see [plans/GEMINI_SETUP.md](plans/GEMINI_SETUP.md)

---

## 📝 Final .env File

Once you have all credentials, your `.env` file should look like this:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/social_ad_generator"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-from-openssl"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET="your-bucket-name"

# Google Gemini (NanoBanana)
GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
```

---

## ✅ Verification Checklist

After setting up all credentials:

- [ ] Database connection string works
- [ ] NextAuth secret is generated
- [ ] Google OAuth redirect URI is configured
- [ ] GitHub OAuth callback URL is set
- [ ] S3 bucket is created with CORS enabled
- [ ] IAM user has S3 permissions
- [ ] Gemini API key is active
- [ ] All values are in `.env` file
- [ ] `.env` is in `.gitignore`

---

## 🚀 Next Steps

1. **Test Database Connection**
   ```bash
   npx prisma db push
   npx prisma studio
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test Authentication**
   - Go to http://localhost:3000
   - Try signing in with Google
   - Try signing in with GitHub

4. **Test S3 Upload**
   - Go to Media Library
   - Try uploading an image
   - Check your S3 bucket

---

## 💰 Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Neon** | 512 MB storage, 1 project |
| **Supabase** | 500 MB database, 1 GB file storage |
| **AWS S3** | 5 GB storage, 20,000 GET requests/month (12 months) |
| **Cloudflare R2** | 10 GB storage, 1M Class A operations/month |
| **Gemini API** | 15 requests/minute, 1,500 requests/day |
| **Google OAuth** | Unlimited (free) |
| **GitHub OAuth** | Unlimited (free) |

---

## 🆘 Troubleshooting

### Database Connection Fails
- Check PostgreSQL is running: `brew services list`
- Verify connection string format
- Try connecting with `psql`: `psql postgresql://...`

### OAuth Redirect Error
- Verify redirect URIs exactly match (including http vs https)
- Check OAuth app is not in "pending" state
- Clear browser cookies and try again

### S3 Upload Fails
- Check CORS configuration
- Verify IAM user has S3 permissions
- Check bucket name in .env matches actual bucket

### Generated Images Show 403 Error
- Verify bucket policy allows public read (`s3:GetObject`)
- Check public access block settings allow bucket policies
- Confirm images are actually uploaded to S3

### Gemini API Errors
- **404 on image models**: Upgrade to Tier 1+ (enable billing)
- **Generation stuck at 20%**: Check you have Tier 1+ access, verify API key
- **Invalid API key**: Double-check key in `.env` file
- **Rate limits**: Check usage at [Google AI Studio](https://aistudio.google.com)
- Run `npx tsx scripts/test-gemini-images.ts` to diagnose

### Campaign Edit Won't Save
- **"Unknown argument productImageIds"**: Restart dev server after `npx prisma generate`
- Check server logs with `tail -f` for actual error
- Verify database schema is up to date: `npx prisma db push`

---

## 🔒 Security Best Practices

1. **Never commit `.env` to git**
2. **Use different secrets for production**
3. **Rotate API keys regularly**
4. **Enable 2FA on all accounts**
5. **Use least-privilege IAM policies in production**
6. **Monitor API usage and costs**

---

## 📞 Need Help?

If you encounter issues:
1. Check service status pages
2. Review error messages carefully
3. Verify all redirect URLs match exactly
4. Test credentials individually
5. Check free tier limits

Good luck! 🚀
