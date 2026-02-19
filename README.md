# Social Ad Generator

A full-stack AI-powered application for generating creative assets for social advertising campaigns (LinkedIn, Instagram, etc.) using Google's Gemini API.

## 🚀 Features Implemented

### ✅ Phase 01: Foundation
- Next.js 15 with App Router and TypeScript
- Tailwind CSS + shadcn/ui component library
- Prisma ORM with PostgreSQL database
- NextAuth.js v5 authentication (Google + GitHub OAuth)
- AWS S3 integration with presigned URL pattern
- Responsive layout with header, sidebar, and navigation
- Protected routes with middleware

### ✅ Phase 02: Brand Settings
- Complete Brand CRUD operations
- Logo upload with S3 integration
- Color palette picker with hex color support
- Brand guidelines and tone/style selectors
- Prohibited terms management (tag input)
- Brand list and detail pages

### ✅ Phase 03: Media Library
- Direct S3 upload using presigned URLs
- Drag-and-drop file upload
- Image thumbnail grid with lazy loading
- Media asset management (view, delete)
- `useS3Upload` custom hook for upload handling

### ✅ Phase 04: Campaign Briefs
- Multi-step campaign creation wizard
- Comprehensive brief form (campaign name, brand, CTA, product, region, language, audience, message)
- File upload and parsing (PDF, DOCX, JSON, YAML)
- AI-powered text extraction using Gemini
- Campaign list and detail pages

### ✅ Phase 05: NanoBanana (Gemini) Integration
- AI image generation wrapper (`lib/nanobanana.ts`)
- Generation job queue with progress tracking
- Automated asset generation workflow:
  - Generate background from campaign brief
  - Product image processing
  - Logo placement
  - Multiple aspect ratio support (1:1, 9:16, 16:9)
- Real-time progress polling with exponential backoff
- Campaign status tracking (DRAFT → GENERATING → GENERATED)

### ✅ Phase 07: Compliance Scoring
- AI-powered brand compliance engine with weighted checks:
  - **Prohibited terms** (25 points): Rule-based scanning
  - **Color palette** (25 points): Brand color matching
  - **Brand guidelines** (30 points): AI analysis via Gemini
  - **Logo presence** (10 points): Logo verification
  - **Text readability** (10 points): Contrast and visibility checks
- Total score 0-100 with detailed reasoning
- Auto-scoring on generation
- `/api/compliance/score` endpoint

### ✅ Phase 08: Localization
- AI-powered translation via Gemini
- Support for 10 languages (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic)
- Context-aware translation preserving brand/product names
- Ad tone and style preservation
- Language variant creation from existing assets

### ✅ Phase 10: Campaign History & Polish
- Campaign history page with search functionality
- Status-based filtering and display
- Comprehensive campaign metadata
- Responsive design throughout
- Loading states and error handling

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 (Google + GitHub OAuth) |
| Storage | AWS S3 (presigned URL pattern) |
| AI/Image | Google Gemini API (`@google/generative-ai`) |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Styling | CSS Variables, Dark mode support |

## 📁 Project Structure

```
├── app/                        # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── auth/              # NextAuth handlers
│   │   ├── brands/            # Brand CRUD
│   │   ├── briefs/            # Brief management
│   │   ├── campaigns/         # Campaign operations
│   │   ├── compliance/        # Compliance scoring
│   │   ├── generate/          # AI generation
│   │   ├── jobs/              # Job status polling
│   │   ├── media/             # Media upload/management
│   │   └── translate/         # Localization
│   ├── (auth)/               # Auth pages
│   ├── brands/               # Brand pages
│   ├── campaigns/            # Campaign pages
│   ├── history/              # Campaign history
│   ├── media/                # Media library
│   └── dashboard/            # Dashboard
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   ├── brand/               # Brand-specific components
│   ├── campaign/            # Campaign components
│   └── media/               # Media components
├── hooks/                   # Custom React hooks
├── lib/                     # Core libraries
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client
│   ├── s3.ts               # S3 helpers
│   ├── nanobanana.ts       # Gemini AI wrapper
│   ├── compliance.ts       # Compliance engine
│   ├── localization.ts     # Translation
│   ├── brief-parser.ts     # File parsing
│   └── utils.ts            # Utilities
└── prisma/                 # Database schema
    └── schema.prisma       # Complete data model
```

## 🗄️ Database Schema

### Core Models
- **User**: Auth user with OAuth accounts
- **Brand**: Brand identity (logo, colors, guidelines, prohibited terms)
- **Campaign**: Ad campaigns with status tracking
- **Brief**: Campaign briefs with structured data
- **MediaAsset**: User-uploaded media files
- **GeneratedAsset**: AI-generated ad creatives
- **GenerationJob**: Async generation job tracking
- **ComplianceScore**: Brand compliance scores

## 🚦 Getting Started

### Prerequisites
```bash
Node.js 22+
PostgreSQL database
AWS S3 bucket
Google Gemini API key
OAuth credentials (Google + GitHub)
```

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: GitHub OAuth
- `AWS_*`: S3 credentials and bucket
- `GOOGLE_GEMINI_API_KEY`: Gemini API key

3. **Initialize database**
```bash
npx prisma generate
npx prisma db push
```

4. **Run development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📋 API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth handlers

### Brands
- `GET /api/brands` - List user brands
- `POST /api/brands` - Create brand
- `GET /api/brands/[id]` - Get brand
- `PUT /api/brands/[id]` - Update brand
- `DELETE /api/brands/[id]` - Delete brand

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `DELETE /api/campaigns/[id]` - Delete campaign

### Briefs
- `POST /api/briefs` - Create campaign brief
- `POST /api/briefs/parse` - Parse uploaded brief file

### Media
- `GET /api/media` - List media assets (with pagination)
- `POST /api/media` - Register uploaded media
- `DELETE /api/media/[id]` - Delete media asset
- `POST /api/media/upload` - Get presigned upload URL

### Generation
- `POST /api/generate` - Start AI generation job
- `GET /api/jobs/[id]` - Get job status and results

### Compliance
- `POST /api/compliance/score` - Run compliance check

### Localization
- `POST /api/translate` - Translate asset to target language

## 🔐 Authentication Flow

1. User visits sign-in page
2. Chooses Google or GitHub OAuth
3. Redirects to provider for authentication
4. Returns to app with session
5. Middleware protects all routes except `/sign-in` and `/api/auth`

## 📸 S3 Upload Pattern

All file uploads use presigned URLs (files never pass through Next.js server):

1. Client requests presigned PUT URL from `/api/media/upload`
2. Client uploads directly to S3 using presigned URL
3. Client confirms upload via `/api/media` POST with metadata
4. S3 URL stored in database

## 🤖 AI Generation Flow

1. User creates campaign with brand and brief
2. Clicks "Generate Assets"
3. Server creates GenerationJob (PENDING status)
4. Background process:
   - Generates AI prompt from brief using Gemini
   - Creates backgrounds for each aspect ratio
   - Processes product images
   - Composites elements
   - Uploads to S3
   - Creates GeneratedAsset records
5. Client polls job status every 3-10s (exponential backoff)
6. Shows progress bar (0-100%)
7. Displays generated assets when complete

## 🎨 Compliance Scoring Algorithm

Weighted score calculation (total 100 points):

```
Total Score =
  Prohibited Terms (25) +
  Color Compliance (25) +
  Guidelines Compliance (30) +
  Logo Presence (10) +
  Text Readability (10)
```

Each check returns score + reasoning + issues list.

## 🌍 Localization Process

1. User selects generated asset
2. Chooses target language from 10 supported options
3. AI extracts text layers from canvas state
4. Gemini translates while preserving:
   - Brand names
   - Product names
   - Ad tone and style
5. Creates new asset variant with translated text
6. Maintains same visual design

### ✅ Phase 06: Canvas Editor (Fabric.js)
**Status**: Implemented

- Fabric.js canvas integration
- Layer management (background, product, logo, text, decorative)
- Drag-and-drop layer repositioning
- Text editing controls
- Undo/redo with JSON state snapshots (50 entry limit)
- Canvas state persistence to database

**Files**:
- `components/editor/canvas-editor.tsx`
- `components/editor/toolbar.tsx`
- `components/editor/layers-panel.tsx`
- `components/editor/properties-panel.tsx`
- `components/editor/text-controls.tsx`
- `hooks/use-canvas.ts`
- `hooks/use-canvas-history.ts`
- `app/campaigns/[id]/editor/page.tsx`

### ✅ Phase 09: Export
**Status**: Implemented (PSD export partially working)

- PNG/JPEG export via `canvas.toDataURL()`
- Server-side image processing with Sharp
- Download via presigned S3 URLs
- Layer reconstruction from Fabric.js to PSD format
- Text layer data + pre-rendered bitmaps
- ⚠️ PSD export (`ag-psd` + `@napi-rs/canvas`) is not fully working yet

**Files**:
- `lib/psd-export.ts`
- `app/api/export/route.ts`
- `components/export/export-dialog.tsx`

## 🔮 Future Enhancements

- **PSD Export**: Complete PSD export with fully working layer reconstruction
- **Real Image Generation**: Integration with actual image generation APIs (currently mocked)
- **Batch Operations**: Bulk asset generation and translation
- **Templates**: Pre-designed campaign templates
- **A/B Testing**: Variant testing and analytics
- **Team Collaboration**: Multi-user access and permissions
- **Asset Versioning**: Track changes and revisions

## 📝 Notes

- Gemini image generation is currently mocked (API placeholders in place)
- Real implementation would use `gemini-2.5-flash-image` or `gemini-3-pro-image-preview`
- All infrastructure is production-ready
- Database schema supports full feature set
- API structure is complete and functional

## 📄 License

Private project - All rights reserved

## 🙏 Acknowledgments

Built with:
- Next.js by Vercel
- Prisma ORM
- Google Gemini AI
- shadcn/ui component library
- Radix UI primitives
