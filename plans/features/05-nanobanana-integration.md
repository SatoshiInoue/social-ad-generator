# Feature 05: NanoBanana Integration & Generation

## Dependencies
- **04 Campaign Briefs** (needs campaign with brief + product images to generate from)

## Blocks
- **06 Canvas Editor** (editor loads generated assets)
- **07 Compliance Scoring** (scores generated assets)
- **10 Campaign History** (history shows generated campaigns)

## Scope

Core AI integration: NanoBanana (Gemini image generation/editing) API wrapper, generation job queue, orchestration flow that produces multi-aspect-ratio creative assets from a campaign brief.

## Tasks

- [ ] NanoBanana API wrapper (`src/lib/nanobanana.ts`)
  - Initialize `@google/genai` client
  - Models: `gemini-2.5-flash-image` (fast) and `gemini-3-pro-image-preview` (quality)
  - Functions:
    - `generateBackground(prompt, aspectRatio, resolution?)` → Buffer
    - `removeBackground(imageBase64, mimeType)` → Buffer
    - `harmonizeStyle(prompt, imageBase64, mimeType)` → Buffer
    - `extendCanvas(prompt, imageBase64, targetAspectRatio)` → Buffer
    - `compositeWithProduct(backgroundBase64, productBase64, prompt, aspectRatio)` → Buffer
  - Error handling with retries (3 attempts, exponential backoff)
  - Rate limiting (max 3 concurrent requests)
- [ ] Generation job queue (`src/lib/generation-queue.ts`)
  - In-memory job map (Map<jobId, JobState>)
  - Enqueue, process, and track jobs
  - Concurrency limiting
- [ ] Generation API routes
  - `POST /api/campaigns/[id]/generate` — start generation job
  - `GET /api/generate/status/[jobId]` — poll job progress
  - `POST /api/generate/edit` — single-image NanoBanana edit (bg removal, style transfer, etc.)
- [ ] Generation orchestration flow (per campaign):
  1. Create GenerationJob record (status: PENDING)
  2. Build prompt from brief: `"Create a {style} advertising background for {productName}. Brand: {brandName}. Message: {campaignMessage}..."`
  3. Fetch product images from DB using `campaign.productImageIds` → download from S3 as base64
  4. If product images exist: remove background from each using `removeBackground()` (cache result)
  5. For each required aspect ratio (1:1, 9:16, 16:9 + optional):
     - If product images: call `generateAdWithProduct()` — sends product image(s) + prompt as multi-part Gemini input for AI-driven compositing
     - Else: call `generateBackground()` with prompt + aspect ratio (existing flow)
     - Build canvas state with product as separate editable layer
     - If logo provided: add logo layer to canvas state
     - Render canvas state to final image
     - Upload to S3
     - Create GeneratedAsset record
  6. Update job progress after each ratio completes
  7. Set job status to COMPLETED (or FAILED on error)
- See `05b-product-image-integration.md` for detailed implementation plan
- [ ] Polling hook (`src/hooks/use-generation-poll.ts`)
  - Poll every 3s with exponential backoff up to 10s
  - Return progressive results (assets appear as they complete)
- [ ] Generation UI components
  - `src/components/generation/generation-config.tsx` — aspect ratio checkboxes, style options
  - `src/components/generation/generation-progress.tsx` — progress bar + status
  - `src/components/generation/asset-gallery.tsx` — grid of generated variants with thumbnails
- [ ] Generation page (`/campaigns/[id]/generate`)

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/nanobanana.ts` | NanoBanana/Gemini API wrapper |
| `src/lib/generation-queue.ts` | Job queue with concurrency control |
| `src/app/api/campaigns/[id]/generate/route.ts` | Start generation |
| `src/app/api/generate/status/[jobId]/route.ts` | Poll job status |
| `src/app/api/generate/edit/route.ts` | Single-image edit |
| `src/app/campaigns/[id]/generate/page.tsx` | Generation page |
| `src/hooks/use-generation-poll.ts` | Polling hook |
| `src/components/generation/generation-config.tsx` | Config UI |
| `src/components/generation/generation-progress.tsx` | Progress UI |
| `src/components/generation/asset-gallery.tsx` | Results gallery |

## Packages

```
@google/genai (Google Generative AI SDK)
sharp (server-side image compositing for logo placement)
```

## Prisma Models Used

- **GenerationJob** — status (PENDING/PROCESSING/COMPLETED/FAILED), progress 0-100, config (JSON)
- **GeneratedAsset** — aspectRatio, language, s3Key, s3Url, thumbnailUrl, canvasState, belongs to Campaign + GenerationJob

## NanoBanana API Patterns

```typescript
// Text-to-image generation
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [{ text: prompt }],
  config: {
    responseModalities: ["IMAGE", "TEXT"],
    imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
  },
});

// Image editing (e.g., background removal)
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [
    { text: "Remove the background..." },
    { inlineData: { mimeType, data: imageBase64 } },
  ],
  config: { responseModalities: ["IMAGE"] },
});
```

## Verification

1. Trigger generation for a campaign with a brief and product image
2. Verify polling shows progress updates (0% → 33% → 66% → 100%)
3. Verify 3 assets generated (1:1, 9:16, 16:9) with correct aspect ratios
4. Verify product image appears in each generated asset
5. Verify assets are stored in S3 and records created in DB
6. Test generation with optional aspect ratios (4:5, 2:3)
7. Test error handling — verify job status shows FAILED with error message
8. Test single-image edit endpoint (background removal, style transfer)
