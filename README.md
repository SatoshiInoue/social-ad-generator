# Social Ad Generator

A full-stack AI-powered application for generating creative assets for social advertising campaigns (LinkedIn, Instagram, etc.) using Google's Gemini API.

## 🛠️ Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Framework | Next.js 15 (App Router, TypeScript)         |
| Database  | PostgreSQL + Prisma ORM                     |
| Auth      | NextAuth.js v5 (Google + GitHub OAuth)      |
| Storage   | AWS S3 (presigned URL pattern)              |
| AI/Image  | Google Gemini API (`@google/generative-ai`) |
| UI        | Tailwind CSS + shadcn/ui + Radix UI         |
| Styling   | CSS Variables, Dark mode support            |

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

- ⚠️ PSD export (`ag-psd` + `@napi-rs/canvas`) is not fully working yet
