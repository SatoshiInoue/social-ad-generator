# Gemini API Setup Guide

## Overview

This application uses **Google Gemini API** for:
- Text generation (prompt creation from campaign briefs)
- **Image generation** (advertising backgrounds using NanoBanana)

## ⚠️ Critical Requirements

### 1. **Paid Tier Required for Image Generation**

Image generation requires a **Tier 1 or higher** Gemini API key:

| Tier | Access | Image Generation |
|------|--------|------------------|
| Free | ❌ | Text only (`gemini-2.5-flash`) |
| Tier 1 | ✅ | **All models including `gemini-2.5-flash-image`** |
| Tier 2+ | ✅ | All models + higher rate limits |

**To upgrade**: Go to [Google AI Studio](https://aistudio.google.com) → Settings → Billing

### 2. **Verify Your API Key Access**

Run the test script to check available models:

```bash
npx tsx scripts/test-gemini-images.ts
```

**Expected output for Tier 1+:**
```
✅ gemini-2.5-flash-image - WORKS!
   IMAGE FOUND! MimeType: image/png
```

**Output for free tier:**
```
❌ gemini-2.5-flash-image - NOT FOUND (404)
```

## Setup Steps

### 1. Get API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Click **"Get API Key"** in the left sidebar
3. Create new key or use existing
4. Copy the key (starts with `AIza...`)

### 2. Add to `.env`

```bash
GOOGLE_GEMINI_API_KEY="AIzaSy..."
```

### 3. Verify Tier

```bash
# List all available models
npx tsx scripts/list-gemini-models.ts
```

Look for these image generation models:
- ⭐ `gemini-2.5-flash-image` (Nano Banana) - **Currently used**
- `gemini-3-pro-image-preview` (Nano Banana Pro)
- `gemini-2.0-flash-exp-image-generation`
- `imagen-4.0-generate-001` (requires Vertex AI)

### 4. Test Image Generation

```bash
npx tsx scripts/test-gemini-images.ts
```

This will attempt to generate a test image and show if your key has access.

## Available Models

The application uses these Gemini models:

### Text Generation
- **`gemini-2.5-flash`** - Prompt generation from campaign briefs
  - Used in: `generatePromptFromBrief()` function
  - Purpose: Converts campaign data into optimized image generation prompts

### Image Generation
- **`gemini-2.5-flash-image`** - Primary image generator (Nano Banana)
  - Used in: `generateBackground()` function
  - Purpose: Generates advertising backgrounds from prompts
  - Input: Text prompt with style, aspect ratio
  - Output: Base64-encoded PNG image

### Alternative Models (not currently used)
- `gemini-3-pro-image-preview` - Higher quality, slower
- `gemini-2.0-flash-exp-image-generation` - Experimental features
- `imagen-4.0-*` models - Requires Google Cloud Vertex AI setup

## Troubleshooting

### "404 Not Found" for image models

**Problem**: Your API key is on free tier or doesn't have image generation access.

**Solution**:
1. Upgrade to paid tier at [Google AI Studio](https://aistudio.google.com) → Billing
2. Wait ~5 minutes for activation
3. Run `npx tsx scripts/test-gemini-images.ts` again

### "403 Forbidden" errors

**Problem**: API key doesn't have permissions or billing not enabled.

**Solution**:
1. Check billing is enabled in Google Cloud Console
2. Verify API key has correct permissions
3. Ensure you're using the correct project

### Generation stuck at 20%

**Problem**: Image generation failed but error wasn't displayed (fixed in latest version).

**Check**:
1. Look at server logs: `tail -f /path/to/dev/server.log`
2. Errors now display in red boxes on the UI
3. Common causes:
   - Wrong model name (use `gemini-2.5-flash-image`)
   - Free tier API key (upgrade to Tier 1)
   - Rate limiting (wait and retry)

### Image URL shows 403 in browser

**Problem**: S3 bucket not configured for public read access.

**Solution**: Already fixed - bucket policy applied via:
```bash
aws s3api put-bucket-policy --bucket your-bucket --policy file://s3-bucket-policy.json
```

## Testing Checklist

After setup, verify:

- [ ] `npx tsx scripts/test-gemini.ts` shows `gemini-2.5-flash` works
- [ ] `npx tsx scripts/test-gemini-images.ts` shows `gemini-2.5-flash-image` works
- [ ] `npx tsx scripts/list-gemini-models.ts` lists 40+ models
- [ ] Image generation completes to 100% in UI
- [ ] Generated images display in campaign asset gallery
- [ ] Images downloadable and viewable in S3

## Cost Estimates

**Gemini 2.5 Flash Image** (Tier 1 pricing as of 2026):
- ~$0.04 - $0.08 per image generation
- Campaign with 3 aspect ratios = ~$0.12 - $0.24

**Storage** (AWS S3):
- ~$0.023/GB/month
- 1000 images (~50MB) = ~$0.001/month

See [Google AI Pricing](https://ai.google.dev/pricing) for current rates.

## Resources

- [Google AI Studio](https://aistudio.google.com)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Available Models](https://ai.google.dev/models/gemini)
- [Pricing](https://ai.google.dev/pricing)
