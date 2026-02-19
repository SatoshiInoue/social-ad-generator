# Feature 02: Brand Settings

## Dependencies
- **01 Foundation** (auth, Prisma, S3, layout)

## Blocks
- **04 Campaign Briefs** (campaigns belong to a brand)
- **07 Compliance Scoring** (scoring uses brand guidelines, colors, prohibited terms)

## Can Be Parallel With
- **03 Media Library**

## Scope

Brand management UI where users configure their brand identity: logo, color palette, guidelines (tone/style), and prohibited terms. These settings are used later for generation and compliance scoring.

## Tasks

- [ ] Brand CRUD API routes
  - `GET /api/brands` — list user's brands
  - `POST /api/brands` — create brand
  - `GET /api/brands/[id]` — get brand details
  - `PUT /api/brands/[id]` — update brand
  - `DELETE /api/brands/[id]` — delete brand
- [ ] Brand list page (`/brands`)
- [ ] Brand settings page (`/brands/[id]`) with form:
  - Brand name (text input)
  - Logo upload (uses S3 presigned URL flow from `src/lib/s3.ts`)
  - Color palette (array of hex colors with color picker)
  - Brand guidelines (textarea for free-text)
  - Tone selector (e.g., professional, playful, bold — dropdown or tags)
  - Style selector (e.g., minimalist, corporate, vibrant — dropdown or tags)
  - Prohibited terms (tag-style input, stored as string array)
- [ ] Components:
  - `src/components/brand/brand-form.tsx`
  - `src/components/brand/color-palette.tsx` — add/remove colors with picker
  - `src/components/brand/prohibited-terms.tsx` — tag input with add/remove

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/brands/route.ts` | List + create brands |
| `src/app/api/brands/[id]/route.ts` | Get + update + delete brand |
| `src/app/brands/page.tsx` | Brand list page |
| `src/app/brands/[id]/page.tsx` | Brand settings editor |
| `src/components/brand/brand-form.tsx` | Main brand form |
| `src/components/brand/color-palette.tsx` | Color picker grid |
| `src/components/brand/prohibited-terms.tsx` | Tag input for terms |

## Packages

```
react-colorful (lightweight color picker)
```

## Prisma Models Used

- **Brand** — name, logoUrl, colorPalette (JSON), guidelines, tone, style, prohibitedTerms[]

## Verification

1. Create a new brand with all fields populated
2. Upload a logo — verify it appears (S3 URL stored in DB)
3. Add 3+ colors to the palette — verify they persist on page reload
4. Add prohibited terms — verify they save and display correctly
5. Edit and delete a brand — verify CRUD operations work
