# Feature 01: Foundation

## Dependencies
None — this is the base layer.

## Blocks
All other features (02–10).

## Scope

Set up the entire project skeleton: framework, database, authentication, cloud storage, UI system, and shared layout.

## Tasks

- [ ] Initialize Next.js 15 project with App Router + TypeScript
- [ ] Configure Tailwind CSS
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`) and install base components (button, input, card, dialog, dropdown-menu, toast, skeleton, avatar)
- [ ] Set up Prisma with PostgreSQL
  - Define full schema (User, Account, Session, VerificationToken, Brand, Campaign, Brief, MediaAsset, GeneratedAsset, GenerationJob, ComplianceScore)
  - Run initial migration
- [ ] Configure NextAuth.js v5 with PrismaAdapter
  - Google OAuth provider
  - GitHub OAuth provider
- [ ] Set up AWS S3 client (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
  - `src/lib/s3.ts` with presigned URL helpers
- [ ] Create core library files
  - `src/lib/prisma.ts` — singleton PrismaClient
  - `src/lib/auth.ts` — NextAuth config + exported handlers
  - `src/lib/s3.ts` — S3 client + presign helpers
  - `src/lib/utils.ts` — shared utilities (cn helper, etc.)
- [ ] Build layout components
  - `src/app/layout.tsx` — root layout with SessionProvider
  - `src/components/layout/header.tsx`
  - `src/components/layout/sidebar.tsx`
  - `src/components/layout/main-nav.tsx`
- [ ] Create auth pages
  - `src/app/(auth)/sign-in/page.tsx`
- [ ] Add route protection middleware (`src/middleware.ts`)
- [ ] Create `.env.example` template
- [ ] Create landing page (`src/app/page.tsx`) that redirects to dashboard if authenticated

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema |
| `src/lib/prisma.ts` | Singleton PrismaClient |
| `src/lib/auth.ts` | NextAuth.js v5 config |
| `src/lib/s3.ts` | S3 client + presigned URLs |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth route handler |
| `src/middleware.ts` | Route protection |
| `src/app/layout.tsx` | Root layout |

## Packages

```
next react react-dom typescript @types/react @types/node
@prisma/client prisma
next-auth @auth/prisma-adapter
@aws-sdk/client-s3 @aws-sdk/s3-request-presigner
tailwindcss postcss autoprefixer
```
(Plus shadcn/ui components via CLI)

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handlers |

## Prisma Models

All models defined here (User, Account, Session, VerificationToken + all domain models), but only auth-related models are actively used in this phase.

## Verification

1. `npm run dev` starts without errors
2. Visit `/sign-in`, sign in with Google and GitHub
3. Session persists across page reloads
4. Unauthenticated users redirected from protected routes (e.g., `/dashboard`)
5. Prisma Studio (`npx prisma studio`) shows User + Account records after sign-in
