# Creative Asset Generator for Social Ad Campaigns

## Context

Build a full-stack application that automates creative asset generation for social ad campaigns (LinkedIn, Instagram, etc.) using Google NanoBanana API (Gemini image generation). The project is greenfield — empty repo, building from scratch.

**NanoBanana** = Google's Gemini API image generation/editing models:
- `gemini-2.5-flash-image` (fast, cheaper) - ✅ **Currently using**
- `gemini-3-pro-image-preview` (higher quality, aka "Nano Banana Pro")
- `gemini-2.0-flash-exp-image-generation` (experimental)
- Plus 5 Imagen 4 models (requires Vertex AI setup)
- SDK: `@google/generative-ai`

**⚠️ Important**: Image generation requires **paid tier (Tier 1+)** Gemini API key. Free tier only supports text generation.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js v5 (Google + GitHub OAuth) |
| Storage | AWS S3 (presigned URL pattern) |
| Canvas Editor | Fabric.js v6 |
| AI/Image | Google NanoBanana (`@google/genai`) |
| UI | Tailwind CSS + shadcn/ui |
| PSD Export | ag-psd + @napi-rs/canvas |

---

## Implementation Phases

### Phase 1: Foundation
- Init Next.js + TypeScript + Tailwind + shadcn/ui
- Prisma schema + PostgreSQL setup + migrations
- NextAuth.js v5 with PrismaAdapter (Google + GitHub providers)
- S3 client setup (`@aws-sdk/client-s3`, presigner)
- Core libs: `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/s3.ts`
- Layout: Header, Sidebar, MainNav
- Auth pages + route protection middleware
- `.env.local` template

### Phase 2: Brand Settings + Media Library
- Brand CRUD API (`/api/brands`)
- Brand settings UI: logo upload, color palette picker, guidelines, prohibited terms (tag input)
- Media upload flow: presigned URL → S3 direct upload → register in DB
- Media library page: thumbnail grid, drag-drop upload, pagination
- Media selector modal (reusable for campaign creation)
- `useS3Upload` hook

### Phase 3: Campaign Briefs ✅ **COMPLETED**
- Brief form component (all fields: campaign name, brand, CTA, product, region, language, audience, message)
- File upload + parsing for PDF (`pdf-parse`), DOCX (`mammoth`), JSON, YAML (`js-yaml`)
- Use Gemini text model to structure extracted text from PDF/DOCX
- Brief API routes (`/api/briefs` CRUD + `/api/briefs/parse`)
- Campaign creation wizard (multi-step: select brand → brief → product images → config → review)
- Dashboard page with campaign list
- **New**: Product image selection from media library during campaign creation
- **New**: Campaign edit functionality (`/campaigns/[id]/edit`) with brief editing
- **New**: Regenerate assets button for campaigns with existing assets

### Phase 4: NanoBanana Integration + Generation ✅ **COMPLETED**
- `lib/nanobanana.ts` wrapper with functions:
  - `generateBackground()` — ✅ text-to-image with `gemini-2.5-flash-image`
  - `generatePromptFromBrief()` — ✅ Creates AI prompt from campaign brief
  - `removeBackground()` — ✅ Real Gemini image editing (multi-part input)
  - `generateAdWithProduct()` — ✅ AI-composed scene with product images
  - `harmonizeStyle()` — Placeholder (style transfer)
  - `extendCanvas()` — Placeholder (aspect ratio adaptation)
  - `compositeWithProduct()` — Superseded by `generateAdWithProduct()`
- Generation job queue via database (GenerationJob model with PENDING/PROCESSING/COMPLETED/FAILED states)
- Orchestration flow per campaign:
  1. Create GenerationJob (PENDING)
  2. Generate prompt from campaign brief using Gemini text model
  3. For each aspect ratio (1:1, 9:16, 16:9):
     - Generate background image using `gemini-2.5-flash-image`
     - Extract base64 image data from Gemini response
     - Upload to S3 using `uploadImageToS3()` helper
     - Create GeneratedAsset record with s3Key and s3Url
  4. Update progress (20% → 90% → 100%)
- Polling hook (`useGenerationPoll`) for real-time job status
- Progress indicator with percentage display
- Error display in UI with detailed messages
- Asset gallery with real generated images from S3

### Phase 4b: Product Image Integration ✅ **IMPLEMENTED** (with fixes pending)
- **Problem:** `productImageIds` stored on campaigns but never used during generation
- **Solution:** Integrate product images into the AI generation pipeline
- ✅ Implement `removeBackground()` using Gemini image editing (send product image + bg removal prompt)
- ✅ New `generateAdWithProduct()` function — sends product image(s) + scene prompt to Gemini as multi-part input, producing a unified scene with the product naturally composited
- ✅ Updated generation orchestration:
  1. Fetch product images from DB/S3 (once, cached)
  2. Remove background from each product image via Gemini (once, cached)
  3. For each aspect ratio: call `generateAdWithProduct()` instead of `generateBackground()`
- ✅ Falls back to existing `generateBackground()` when no product images selected
- **Phase 4c fixes (completed):**
  - ✅ Removed redundant product canvas layer (AI already composites product into background scene)
  - ✅ Added `generateAdCopy()` for AI-powered copywriting (catchy headlines/CTAs in selected language)
  - ✅ Moved no-text instruction to very start of prompt (fixed "ROENA NOW" garbled text)
  - ✅ Reworded no-text instruction: "do not ADD new text" + "preserve existing product labels" (fixed label removal)
- **Phase 4d fixes (in progress):**
  - Product stretching persists despite prompt engineering — Gemini limitation with non-1:1 aspect ratios
  - White bars on 16:9/9:16 persist despite "edge-to-edge fill" instructions
  - **New approach:** Post-process generated images with `sharp` (cover-crop to exact target dimensions)
  - This bypasses Gemini's aspect ratio limitations entirely — crop from center, no stretching
- See `plans/features/05b-product-image-integration.md` for detailed plan

### Phase 5: Fabric.js Editor
- All editor components as `'use client'`
- `useCanvas` hook — Fabric.js canvas lifecycle management
- Layer model: background (locked), product, logo, text layers, decorative elements
- Components: CanvasEditor, Toolbar, LayersPanel, PropertiesPanel, TextControls
- `useCanvasHistory` hook — undo/redo via JSON state snapshots (50 entry limit)
- Save canvas state to DB (`canvasState` JSON column)
- Load generated assets into editor (fresh load or restore saved state)

### Phase 6: Compliance Scoring ✅ **COMPLETED**
- `lib/compliance.ts` with weighted checks:
  - **Prohibited terms** (weight 25, rule-based): scan text layers against brand.prohibitedTerms
  - **Color palette** (weight 25, rule-based): color matching against brand palette
  - **Brand guidelines** (weight 30, AI): send image + guidelines to Gemini for analysis
  - **Logo presence** (weight 10, AI): verify logo appears correctly
  - **Text readability** (weight 10, AI): contrast and overlap checks
- Score = weighted sum (0–100) + detailed reasoning per check
- API route `/api/compliance/score`
- Score badge (color-coded) + info popover with per-check breakdown (inline in campaign-detail.tsx)
- Auto-score on generation (non-blocking), manual "Check Compliance" button for re-scoring
- Fixed canvas state parsing: route now uses `objects` array and `layerType` field (Fabric.js format)

### Phase 7: Localization ✅ **COMPLETED**
- `lib/localization.ts` — translate via Gemini with ad-copy context, preserves brand/product names
- Language selection in campaign brief (generates in selected language)
- AI copywriting via `generateAdCopy()` supports language parameter
- "Localize" button on asset cards with language selector popover
- Translation API (`/api/translate`) creates GeneratedAsset copy with translated text layers
- Font family auto-switched for non-Latin scripts (ja, ko, zh, ar, hi)
- Noto Sans JP font for CJK support in server-side rendering

### Phase 8: Export
- **PNG/JPEG**: client-side via `canvas.toDataURL()` → upload to S3
- **PSD**: server-side via `ag-psd` + `@napi-rs/canvas`
  - Reconstruct Fabric.js layers into PSD layer format
  - Image layers: fetch from S3, resize via sharp
  - Text layers: include both text data and pre-rendered bitmap
- Export dialog with format selection
- Download via presigned S3 URL

### Phase 9: Campaign History + Polish
- History page with search/filter by name, date
- Campaign status tracking (DRAFT → GENERATING → GENERATED → EDITING → EXPORTED)
- Loading states, empty states, error handling
- Responsive layout, image lazy loading, pagination

---

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full data model (User, Account, Session, Brand, Campaign, Brief, MediaAsset, GeneratedAsset, GenerationJob, ComplianceScore) |
| `src/lib/nanobanana.ts` | NanoBanana/Gemini API wrapper |
| `src/lib/auth.ts` | NextAuth.js v5 config |
| `src/lib/s3.ts` | S3 client + presigned URL helpers |
| `src/lib/brief-parser.ts` | PDF/DOCX/JSON/YAML → structured brief |
| `src/lib/compliance.ts` | Compliance scoring engine |
| `src/lib/localization.ts` | Translation via Gemini |
| `src/lib/psd-export.ts` | PSD generation (ag-psd) |
| `src/lib/generation-queue.ts` | Job queue for async generation |
| `src/components/editor/canvas-editor.tsx` | Main Fabric.js canvas |
| `src/hooks/use-canvas.ts` | Canvas lifecycle hook |
| `src/hooks/use-canvas-history.ts` | Undo/redo |
| `src/hooks/use-s3-upload.ts` | Presigned URL upload flow |
| `src/hooks/use-generation-poll.ts` | Job status polling |

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing / redirect to dashboard |
| `/dashboard` | Campaign list, quick-create |
| `/campaigns/new` | Multi-step campaign wizard |
| `/campaigns/[id]` | Campaign detail + asset gallery |
| `/campaigns/[id]/editor` | Fabric.js editor |
| `/media` | Media library |
| `/brands` | Brand list |
| `/brands/[id]` | Brand settings |
| `/history` | Past campaigns |

## Prisma Schema (Key Models)

- **User** → has many Brands, Campaigns, MediaAssets
- **Brand** → name, logoUrl, colorPalette (JSON), guidelines, tone, style, prohibitedTerms[]
- **Campaign** → belongs to User + Brand, has one Brief, has many GeneratedAssets, status enum
- **Brief** → campaignName, brandName, CTA, productName, targetRegion, language, audience, message, rawFileUrl, parsedData (JSON)
- **MediaAsset** → fileName, fileType, s3Key, s3Url, thumbnailUrl, dimensions, tags[]
- **GeneratedAsset** → aspectRatio, language, s3Key, s3Url, canvasState (JSON), belongs to Campaign + GenerationJob
- **GenerationJob** → status enum (PENDING/PROCESSING/COMPLETED/FAILED), progress 0-100, config (JSON)
- **ComplianceScore** → score 0-100, reasoning (JSON), colorCompliance, termCompliance, belongs to GeneratedAsset

## S3 Upload Pattern

All uploads use presigned URLs — files never pass through the Next.js server:
1. Client requests presigned PUT URL from API
2. Client uploads directly to S3
3. Client confirms upload with metadata via POST

## Verification

1. **Auth**: Sign in with Google/GitHub, verify session persists, protected routes redirect
2. **Brands**: Create brand with logo, colors, guidelines, prohibited terms; verify persistence
3. **Media**: Upload images, verify thumbnails appear in library, select in campaign
4. **Brief**: Upload PDF/DOCX/JSON/YAML, verify parsed fields; also test manual form
5. **Generation**: Create campaign, trigger generation, verify polling shows progress, assets appear
6. **Editor**: Open generated asset in editor, move layers, edit text, undo/redo, save state
7. **Compliance**: Generate asset, verify score appears with reasoning; edit to fix issues, re-score
8. **Localization**: Select language, verify translated variants appear
9. **Export**: Download as PNG, JPEG, PSD; verify PSD opens in Photoshop with separate layers
10. **History**: Verify past campaigns appear with filters working
