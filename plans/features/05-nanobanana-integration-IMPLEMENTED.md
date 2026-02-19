# Feature 05: NanoBanana Integration & Generation ✅ **COMPLETED**

## Status: ✅ **CORE FUNCTIONALITY IMPLEMENTED**

## Dependencies
- **04 Campaign Briefs** (needs campaign with brief + product images to generate from) - ✅

## Blocks
- **06 Canvas Editor** (editor loads generated assets) - Pending
- **07 Compliance Scoring** (scores generated assets) - ✅ Completed
- **10 Campaign History** (history shows generated campaigns) - ✅ Completed

## Implementation Summary

Successfully implemented AI-powered image generation using Google Gemini 2.5 Flash Image (Nano Banana).

### What Works
- ✅ Real image generation using `gemini-2.5-flash-image`
- ✅ Text prompt generation from campaign briefs
- ✅ S3 upload of generated images
- ✅ Multi-aspect ratio support (1:1, 9:16, 16:9)
- ✅ Progress tracking and polling
- ✅ Error handling and display
- ✅ Regenerate functionality

### What's Placeholder
- ❌ Product background removal
- ❌ Style harmonization
- ❌ Canvas extension
- ❌ Product compositing
- ❌ Logo placement

## Tasks

- [x] NanoBanana API wrapper (`lib/nanobanana.ts`)
  - ✅ Initialize `@google/generative-ai` client
  - ✅ Model: `gemini-2.5-flash-image` (currently used)
  - ✅ Alternative models available: `gemini-3-pro-image-preview`, `gemini-2.0-flash-exp-image-generation`
  - Functions:
    - ✅ `generateBackground(options)` → Extracts base64 image from Gemini response
    - ✅ `generatePromptFromBrief(brief)` → Creates optimized image prompt (product-context-aware)
    - ✅ `removeBackground(imageBase64, mimeType)` → Background removal via Gemini image editing
    - ✅ `generateAdWithProduct(options)` → AI-composed scene with product images (multi-part Gemini input)
    - ❌ `harmonizeStyle()` — Placeholder only
    - ❌ `extendCanvas()` — Placeholder only
    - ❌ `compositeWithProduct()` — Superseded by `generateAdWithProduct()`
  - ✅ Error handling with proper error messages
  - ❌ Rate limiting not implemented (relies on Gemini API limits)

- [x] Generation job management
  - ✅ Database-backed jobs (GenerationJob model with PENDING/PROCESSING/COMPLETED/FAILED)
  - ✅ Progress tracking (0% → 20% → 90% → 100%)
  - ✅ Error capture in job records
  - ❌ In-memory queue not used (direct async processing)

- [x] Generation API routes
  - ✅ `POST /api/generate` — Start generation job for campaign
  - ✅ `GET /api/jobs/[id]` — Poll job progress
  - ❌ Single-image edit endpoints not implemented

- [x] Generation orchestration flow
  1. ✅ Create GenerationJob record (status: PENDING)
  2. ✅ Generate AI prompt from brief using `gemini-2.5-flash` text model
  3. ✅ For each aspect ratio (1:1, 9:16, 16:9):
     - ✅ Call `generateBackground()` with `gemini-2.5-flash-image`
     - ✅ Extract base64 image data from Gemini response
     - ✅ Upload to S3 via `uploadImageToS3()`
     - ✅ Create GeneratedAsset record with s3Key and s3Url
  4. ✅ Update job progress after each ratio (20% → 50% → 80% → 100%)
  5. ✅ Set job status to COMPLETED or FAILED

- [x] Polling hook
  - ✅ `hooks/use-generation-poll.ts` — Polls job status every few seconds
  - ✅ Returns current job state to UI
  - ✅ Stops polling when completed or failed

- [x] Generation UI components
  - ✅ `components/campaign/campaign-detail.tsx` — Shows generate button and progress
  - ✅ Progress bar with percentage display
  - ✅ Error display in red boxes with details
  - ✅ Regenerate button when assets exist
  - ✅ Asset gallery with real S3 images
  - ❌ Separate generation config component not created

## Key Files (As Implemented)

| File | Purpose | Status |
|------|---------|--------|
| `lib/nanobanana.ts` | Gemini API wrapper | ✅ Core functions |
| `lib/s3.ts` | S3 upload including `uploadImageToS3()` | ✅ Complete |
| `app/api/generate/route.ts` | Start generation | ✅ Complete |
| `app/api/jobs/[id]/route.ts` | Poll job status | ✅ Complete |
| `hooks/use-generation-poll.ts` | Polling hook | ✅ Complete |
| `components/campaign/campaign-detail.tsx` | Generation UI | ✅ Complete |

## Packages

```json
{
  "@google/generative-ai": "^0.21.0",  // Gemini SDK
  "@aws-sdk/client-s3": "^3.x",        // S3 uploads
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

Note: `sharp` was planned but not needed for current implementation.

## Prisma Models

### GenerationJob
```prisma
model GenerationJob {
  id         String          @id @default(cuid())
  campaignId String
  status     GenerationStatus @default(PENDING)  // PENDING, PROCESSING, COMPLETED, FAILED
  progress   Int             @default(0)         // 0-100
  config     Json?                               // { aspectRatios: [...] }
  error      String?                             // Error message if failed
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  campaign        Campaign         @relation(...)
  generatedAssets GeneratedAsset[]
}
```

### GeneratedAsset
```prisma
model GeneratedAsset {
  id              String   @id @default(cuid())
  campaignId      String
  generationJobId String
  aspectRatio     String   // "1:1", "9:16", "16:9"
  language        String   @default("en")
  s3Key           String   @unique
  s3Url           String
  canvasState     Json?    // Fabric.js state (for future editor)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  campaign        Campaign          @relation(...)
  generationJob   GenerationJob     @relation(...)
  complianceScore ComplianceScore?
}
```

## S3 Configuration

### Bucket Policy (Applied)
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::BUCKET-NAME/*"
  }]
}
```

Applied via:
```bash
aws s3api put-public-access-block --bucket BUCKET --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
aws s3api put-bucket-policy --bucket BUCKET --policy file://s3-bucket-policy.json
```

### Next.js Image Config
```typescript
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.s3.amazonaws.com' },
    { protocol: 'https', hostname: '**.s3.*.amazonaws.com' },
    { protocol: 'https', hostname: '**.s3-*.amazonaws.com' },
  ],
}
```

## Critical Implementation Notes

### 1. Gemini API Tier Requirements
- **Free Tier**: Only text models (`gemini-2.5-flash`)
- **Tier 1+**: Image generation models available
- **Required**: Paid billing enabled at [Google AI Studio](https://aistudio.google.com)

### 2. Model Selection
Using `gemini-2.5-flash-image` because:
- Fast generation (~5-10 seconds per image)
- Good quality for advertising backgrounds
- Lower cost than Pro models
- Available with Tier 1 API keys

### 3. Image Data Extraction
```typescript
// Extract base64 image from Gemini response
const candidates = response.candidates;
for (const part of candidates[0].content.parts) {
  if ('inlineData' in part && part.inlineData) {
    return {
      imageData: part.inlineData.data,      // base64 string
      mimeType: part.inlineData.mimeType     // "image/png"
    };
  }
}
```

### 4. S3 Upload Process
```typescript
// Convert base64 to Buffer and upload
const buffer = Buffer.from(base64Data, 'base64');
await s3Client.send(new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: key,
  Body: buffer,
  ContentType: mimeType,
}));
```

### 5. Common Errors & Solutions

#### "404 Not Found" for image models
**Cause**: Free tier API key
**Fix**: Upgrade to Tier 1+ at Google AI Studio

#### "Unknown argument productImageIds"
**Cause**: Stale Prisma Client after schema changes
**Fix**: Run `npx prisma generate` and restart dev server completely

#### Images show 403 in browser
**Cause**: S3 bucket not publicly readable
**Fix**: Apply bucket policy (already done)

#### Generation stuck at 20%
**Cause**: Gemini API error not caught properly
**Fix**: Added error display in UI (red error boxes)

## Verification Checklist

- [x] API key has Tier 1+ access
- [x] `gemini-2.5-flash-image` model available
- [x] Generation creates real images (not placeholders)
- [x] Images upload to S3 successfully
- [x] Images display in campaign asset gallery
- [x] Progress updates correctly (20% → 100%)
- [x] Errors display in UI
- [x] Regenerate button works
- [x] Multiple aspect ratios generate correctly
- [x] Next.js Image component loads S3 images

## Next Phase: Product Image Integration

See `05b-product-image-integration.md` for the detailed plan.

**Summary:** Product images selected during campaign creation are currently stored as `productImageIds` but never used in generation. The next phase integrates them into the AI generation pipeline so that Gemini produces ads featuring the actual product — with AI-driven background removal, layout decisions, and compositing as part of a single generation pass.

## Future Enhancements (Beyond Product Integration)

1. **Performance**
   - Rate limiting and queue management
   - Batch generation optimization
   - Caching of intermediate results (e.g., background-removed product images)

2. **Model Options**
   - Switch between `gemini-2.5-flash-image` (fast) and `gemini-3-pro-image-preview` (quality)
   - User-selectable generation quality
   - Cost vs. quality tradeoffs

## Testing Commands

```bash
# Verify API key and available models
npx tsx scripts/test-gemini.ts
npx tsx scripts/list-gemini-models.ts

# Test image generation
npx tsx scripts/test-gemini-images.ts

# Check S3 bucket policy
aws s3api get-bucket-policy --bucket BUCKET-NAME --query Policy --output text | jq
```
