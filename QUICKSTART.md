# 🚀 Quick Start Guide

Get your Social Ad Generator up and running in 15 minutes!

---

## Step 1: Install Dependencies ✅ (Already Done)

The dependencies are already installed. If you need to reinstall:
```bash
npm install
```

---

## Step 2: Get API Keys & Credentials 🔑

Follow the detailed guide in **[SETUP.md](./SETUP.md)** to obtain:

### Required Services (in order of priority):

1. **✅ PostgreSQL Database** - 5 minutes
   - Recommended: [Neon.tech](https://neon.tech) (free tier, no credit card)
   - Alternative: Local PostgreSQL

2. **✅ NextAuth Secret** - 1 minute
   - Run: `openssl rand -base64 32`

3. **✅ Google Gemini API** - 2 minutes
   - Visit: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Free tier: 15 requests/minute

4. **✅ Google OAuth** - 5 minutes
   - [Google Cloud Console](https://console.cloud.google.com)
   - Required for sign-in

5. **✅ GitHub OAuth** - 3 minutes
   - [GitHub Developer Settings](https://github.com/settings/developers)
   - Alternative sign-in method

6. **✅ AWS S3** - 5-10 minutes
   - [AWS Console](https://aws.amazon.com)
   - Alternative: Cloudflare R2 (easier setup)

### Minimum to Get Started

You can start with just these 3 and add the rest later:
- ✅ PostgreSQL Database
- ✅ NextAuth Secret
- ✅ Google OAuth (for sign-in)

---

## Step 3: Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   # Open in your editor
   code .env  # VS Code
   # or
   nano .env  # Terminal editor
   ```

3. **Verify your setup:**
   ```bash
   npx ts-node scripts/verify-env.ts
   ```

   This will check all your environment variables and show what's missing.

---

## Step 4: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

---

## Step 5: Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Step 6: Test Basic Features

### 1. Authentication ✅
- Click "Sign in with Google"
- Complete OAuth flow
- You should be redirected to Dashboard

### 2. Create a Brand ✅
- Go to "Brands" in sidebar
- Click "New Brand"
- Fill in:
  - Name: "Test Brand"
  - Add 2-3 colors to palette
  - Add brand guidelines (optional)
- Click "Create Brand"

### 3. Upload Media (if S3 is configured) ✅
- Go to "Media Library"
- Drag and drop an image
- Wait for upload to complete

### 4. Create a Campaign ✅
- Go to "Campaigns"
- Click "New Campaign"
- Select your brand
- Enter campaign name
- Fill in brief details
- Click "Continue"

### 5. Generate Assets (if Gemini is configured) ✅
- View your campaign
- Click "Generate Assets"
- Watch the progress bar
- See generated assets appear

---

## 🎯 What Works vs What's Missing

### ✅ Fully Functional (8/10 Phases)

| Feature | Status |
|---------|--------|
| Authentication (Google/GitHub OAuth) | ✅ Working |
| Brand Management | ✅ Working |
| Media Library | ✅ Working |
| Campaign Briefs | ✅ Working |
| AI Generation (mock) | ✅ Working |
| Compliance Scoring | ✅ Working |
| Localization | ✅ Working |
| Campaign History | ✅ Working |

### ⏳ Not Implemented (2/10 Phases)

| Feature | Status | Notes |
|---------|--------|-------|
| Canvas Editor (Fabric.js) | ❌ Not implemented | Would allow visual editing of generated assets |
| Export (PNG/JPEG/PSD) | ❌ Not implemented | Would allow downloading in various formats |

---

## 🔧 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process on port 3000
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run dev
```

### Database Connection Error
```bash
# Test connection
npx prisma db pull

# Reset database
npx prisma db push --force-reset
```

### OAuth Redirect Error
1. Check `.env` has correct `NEXTAUTH_URL`
2. Verify OAuth redirect URIs match exactly
3. Clear browser cookies
4. Check OAuth app is approved (not pending)

### Build Errors
```bash
# Clean build
rm -rf .next
npm run build
```

---

## 📁 Project Structure Quick Reference

```
├── app/                  # Pages & API routes
│   ├── api/             # All backend endpoints
│   ├── brands/          # Brand management pages
│   ├── campaigns/       # Campaign pages
│   ├── media/           # Media library
│   └── dashboard/       # Main dashboard
├── components/          # React components
├── lib/                 # Core functionality
│   ├── auth.ts         # NextAuth config
│   ├── prisma.ts       # Database client
│   ├── s3.ts           # S3 operations
│   ├── nanobanana.ts   # AI generation
│   └── compliance.ts   # Compliance engine
└── prisma/
    └── schema.prisma   # Database schema
```

---

## 🎨 Key Features to Try

1. **Brand Color Palette**
   - Add multiple colors
   - They're used for compliance checking

2. **Prohibited Terms**
   - Add terms to block
   - System checks generated content

3. **Brief File Upload**
   - Upload PDF/DOCX with campaign details
   - AI extracts structured data

4. **Multi-Language Support**
   - Generate in one language
   - Translate to 10+ languages

5. **Compliance Scoring**
   - AI analyzes brand alignment
   - Weighted scoring (0-100)

---

## 💡 Tips

### Development
- Use `npx prisma studio` to view/edit database
- Check browser console for errors
- API routes are at `/api/*` - test with curl/Postman

### Testing OAuth
- Use incognito window to test fresh sign-in
- Check OAuth app test users if using "External" mode

### AI Generation
- Brief quality affects output
- Be specific in campaign message
- Try different aspect ratios

### Performance
- First API call may be slow (cold start)
- S3 uploads are direct (don't go through server)
- Gemini has rate limits (15 req/min free tier)

---

## 🆘 Need Help?

1. **Check SETUP.md** for detailed credential instructions
2. **Run verification script**: `npx ts-node scripts/verify-env.ts`
3. **Check logs**: Browser console & terminal output
4. **Review README.md** for architecture details

---

## 🚀 Ready to Go?

Once everything is set up:

```bash
npm run dev
```

Then:
1. ✅ Sign in
2. ✅ Create a brand
3. ✅ Add some media
4. ✅ Create a campaign
5. ✅ Generate assets
6. ✅ Check compliance scores

Enjoy building amazing ad campaigns! 🎨✨
