# Feature 03: Media Library

## Dependencies
- **01 Foundation** (auth, Prisma, S3)

## Blocks
- **04 Campaign Briefs** (campaign wizard uses media selector for product images)

## Can Be Parallel With
- **02 Brand Settings**

## Scope

A centralized media library where users upload, browse, and manage images. Includes a reusable selector modal for picking images during campaign creation.

## Tasks

- [ ] Media API routes
  - `GET /api/media` — list user's media assets (paginated, filterable by tags)
  - `GET /api/media/presign` — get presigned S3 PUT URL for direct upload
  - `POST /api/media` — register uploaded file metadata (s3Key, fileName, size, dimensions)
  - `DELETE /api/media/[id]` — delete media asset (remove from DB + S3)
- [ ] `useS3Upload` hook — encapsulates the presigned URL upload flow:
  1. Request presigned URL from `/api/media/presign`
  2. PUT file directly to S3
  3. POST metadata to `/api/media`
- [ ] Server-side thumbnail generation using `sharp` (in the POST `/api/media` route)
- [ ] Media library page (`/media`)
  - Thumbnail grid layout
  - Drag-and-drop upload zone
  - Pagination or infinite scroll
  - Delete action per asset
- [ ] Media selector modal (reusable component)
  - Opens as a dialog/sheet
  - Shows the same grid as the library page
  - Allows single or multi-select
  - Returns selected asset(s) to the caller
- [ ] Components:
  - `src/components/media/media-grid.tsx` — thumbnail grid
  - `src/components/media/media-uploader.tsx` — drag-drop upload zone
  - `src/components/media/media-selector.tsx` — modal for selecting images

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/media/route.ts` | List + register media |
| `src/app/api/media/presign/route.ts` | Presigned S3 URL |
| `src/app/api/media/[id]/route.ts` | Delete media |
| `src/app/media/page.tsx` | Media library page |
| `src/components/media/media-grid.tsx` | Thumbnail grid |
| `src/components/media/media-uploader.tsx` | Upload zone |
| `src/components/media/media-selector.tsx` | Selection modal |
| `src/hooks/use-s3-upload.ts` | Presigned URL upload hook |

## Packages

```
react-dropzone (drag-drop file uploads)
sharp (server-side image processing / thumbnails)
```

## Prisma Models Used

- **MediaAsset** — fileName, fileType, fileSize, s3Key, s3Url, thumbnailUrl, width, height, tags[]

## Verification

1. Upload an image via drag-drop — verify it appears in the grid
2. Upload multiple images — verify all appear with correct thumbnails
3. Delete an image — verify it's removed from grid and S3
4. Open the media selector modal — verify images are browsable and selectable
5. Check pagination works with 20+ images
