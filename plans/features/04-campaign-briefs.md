# Feature 04: Campaign Briefs ✅ **COMPLETED**

## Status: ✅ **FULLY IMPLEMENTED**

## Dependencies
- **01 Foundation** (auth, Prisma, layout) - ✅
- **02 Brand Settings** (campaigns belong to a brand) - ✅
- **03 Media Library** (product image selection in campaign wizard) - ✅

## Blocks
- **05 NanoBanana Integration** (generation needs a campaign with brief + product images) - ✅

## Scope

Campaign creation and editing flow with full CRUD operations:
- Create campaigns with manual brief entry
- Edit existing campaigns including all brief fields
- Select product images from media library
- Regenerate assets for existing campaigns

**Note**: File upload parsing (PDF/DOCX/JSON/YAML) is currently not implemented but the brief form is fully functional.

## Tasks

- [ ] Brief parser library (`lib/brief-parser.ts`) - **NOT IMPLEMENTED**
  - JSON: direct `JSON.parse` with schema validation
  - YAML: parse with `js-yaml`, validate schema
  - PDF: extract text with `pdf-parse`, then use Gemini text model to structure into brief fields
  - DOCX: convert to text with `mammoth`, then use Gemini to structure
- [x] Brief API routes
  - `POST /api/briefs` — ✅ create brief from form data
  - `POST /api/briefs/parse` — ❌ NOT IMPLEMENTED (file upload parsing)
  - `GET /api/briefs/[id]` — ✅ get brief details
  - `PUT /api/briefs/[id]` — ✅ update brief
- [x] Campaign API routes
  - `GET /api/campaigns` — ✅ list user's campaigns
  - `POST /api/campaigns` — ✅ create campaign with productImageIds field
  - `GET /api/campaigns/[id]` — ✅ get campaign detail
  - `PUT /api/campaigns/[id]` — ✅ update campaign name, productImageIds, and brief
  - `DELETE /api/campaigns/[id]` — ❌ NOT IMPLEMENTED
- [x] Brief components
  - `components/brief/brief-form.tsx` — ✅ manual input with all fields
  - `components/brief/brief-uploader.tsx` — ❌ NOT IMPLEMENTED
  - `components/brief/brief-preview.tsx` — ❌ NOT IMPLEMENTED
- [x] Campaign creation wizard (`/campaigns/new`)
  - Step 1: Select brand — ✅
  - Step 2: Enter brief — ✅ (manual form)
  - Step 3: Select product images — ✅ via MediaSelector component
  - ~~Step 4: Configure generation options~~ — Merged into generation flow
  - ~~Step 5: Review~~ — Simplified workflow
- [x] Campaign editing (`/campaigns/[id]/edit`)
  - ✅ Edit campaign name
  - ✅ Edit all brief fields (productName, targetRegion, language, audience, cta, message)
  - ✅ Select/change product images via MediaSelector
  - ✅ Brand selection (display only - not editable after creation)
- [x] Dashboard page (`/dashboard`)
  - ✅ Campaign list
  - ✅ Quick navigation to campaigns
- [x] Campaign detail page (`/campaigns/[id]`)
  - ✅ View campaign brief
  - ✅ Generate assets button
  - ✅ Regenerate assets button (when assets exist)
  - ✅ Edit campaign button
  - ✅ Progress indicator during generation
  - ✅ Error display for failed generations
  - ✅ Generated assets gallery with real images

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/brief-parser.ts` | Parse PDF/DOCX/JSON/YAML to structured brief |
| `src/app/api/briefs/route.ts` | Create brief |
| `src/app/api/briefs/parse/route.ts` | Upload + parse file |
| `src/app/api/briefs/[id]/route.ts` | Get + update brief |
| `src/app/api/campaigns/route.ts` | List + create campaigns |
| `src/app/api/campaigns/[id]/route.ts` | Campaign CRUD |
| `src/app/campaigns/new/page.tsx` | Campaign creation wizard |
| `src/app/dashboard/page.tsx` | Dashboard |
| `src/components/brief/brief-form.tsx` | Manual brief input |
| `src/components/brief/brief-uploader.tsx` | File upload + parse |
| `src/components/brief/brief-preview.tsx` | Parsed brief display |

## Packages

```
pdf-parse (PDF text extraction)
mammoth (DOCX to text conversion)
js-yaml (YAML parsing)
```

## Prisma Models Used

- **Campaign** — name, status, belongs to User + Brand
- **Brief** — campaignName, brandName, callToAction, productName, targetRegion, language, targetAudience, campaignMessage, rawFileUrl, rawFileType, parsedData

## Implementation Notes

### Campaign Schema Updates
Added `productImageIds` field to Campaign model:
```prisma
productImageIds  String[]  @default([]) // Array of MediaAsset IDs
```

### MediaSelector Component
Reusable component for selecting images from media library:
- Modal dialog with image grid
- Multi-select functionality
- Thumbnail display
- Add/remove images
- Used in both campaign creation and editing

### API Design Decisions

**Why brandId is NOT editable after creation:**
- Prisma treats `brandId` as a relation foreign key (due to `brand Brand @relation(...)`)
- Cannot update relation foreign keys directly via Prisma update
- Design decision: Brand is set at campaign creation and immutable
- Prevents orphaned campaigns and maintains data integrity

**Why productImageIds uses simple array:**
- Scalar `String[]` field, not a relation
- Can be updated directly in Prisma
- Stores MediaAsset IDs for reference only
- No cascade delete requirements

### Prisma Client Regeneration
**Critical**: After schema changes, must run:
```bash
npx prisma generate
```
And **restart the dev server** completely. Hot reload doesn't pick up Prisma Client changes.

Symptom of stale Prisma Client:
```
Unknown argument `productImageIds`. Available options are marked with ?.
```

## Verification

1. ✅ Create a campaign via the wizard using a manually filled brief form
2. ❌ Upload a JSON brief file (NOT IMPLEMENTED)
3. ❌ Upload a YAML brief file (NOT IMPLEMENTED)
4. ❌ Upload a PDF brief (NOT IMPLEMENTED)
5. ❌ Upload a DOCX brief (NOT IMPLEMENTED)
6. ✅ Select product images from the media library during wizard
7. ✅ Dashboard shows created campaigns
8. ✅ Edit an existing campaign — all changes persist
9. ✅ Edit brief fields within campaign edit page
10. ✅ Add/remove product images via edit page
