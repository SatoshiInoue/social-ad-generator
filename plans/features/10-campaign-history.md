# Feature 10: Campaign History & Polish

## Dependencies
- **05 NanoBanana Integration** (needs generated campaigns to display)

## Blocks
None.

## Can Be Parallel With
- **06 Canvas Editor**
- **07 Compliance Scoring**
- **08 Localization**
- **09 Export**

## Scope

Campaign history page showing past campaigns and their generated assets, with search and filtering. Also includes final polish: loading states, empty states, error handling, and responsive design.

## Tasks

### Campaign History
- [ ] History page (`/history`)
  - List of past campaigns with:
    - Campaign name
    - Brand name
    - Status badge (DRAFT, GENERATING, GENERATED, EDITING, EXPORTED)
    - Creation date
    - Thumbnail of first generated asset
  - Search by campaign name
  - Filter by date range
  - Filter by status
  - Sort by date (newest/oldest)
  - Pagination
- [ ] Click-through to campaign detail page (`/campaigns/[id]`)
- [ ] Campaign detail page enhancements
  - Brief summary section
  - Generated assets gallery with compliance scores
  - Actions: edit, localize, export, re-generate

### Polish & UX
- [ ] Loading states (skeleton components) for:
  - Dashboard campaign list
  - Media library grid
  - Generation progress
  - Editor canvas loading
- [ ] Empty states for:
  - No campaigns yet
  - No brands configured
  - No media uploaded
  - No generated assets
- [ ] Error handling:
  - API error toasts
  - Generation failure display with retry option
  - File upload error feedback
  - Network error recovery
- [ ] Responsive layout:
  - Sidebar collapses on mobile
  - Editor adapts to screen size
  - Media grid adjusts columns
  - Campaign wizard steps stack on mobile
- [ ] Performance:
  - Image lazy loading in grids
  - Pagination on all list views
  - Optimistic UI updates where appropriate

## Key Files

| File | Purpose |
|------|---------|
| `src/app/history/page.tsx` | Campaign history page |
| `src/app/campaigns/[id]/page.tsx` | Enhanced campaign detail |

## Packages

No additional packages.

## Prisma Models Used

- **Campaign** — status tracking (DRAFT → GENERATING → GENERATED → EDITING → EXPORTED)
- **GeneratedAsset** — thumbnails for history display
- **ComplianceScore** — scores displayed in history

## Verification

1. Create several campaigns in different statuses
2. Visit `/history` — verify all campaigns appear
3. Search by name — verify filtering works
4. Filter by status — verify only matching campaigns show
5. Filter by date range — verify correct results
6. Click a campaign — verify detail page shows brief + assets + scores
7. Verify loading skeletons appear while data loads
8. Verify empty states display when no data exists
9. Test on mobile viewport — verify responsive layout works
10. Test with slow network — verify loading states and error handling
