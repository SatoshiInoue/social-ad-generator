# Feature 06: Canvas Editor (Fabric.js)

## Dependencies
- **05 NanoBanana Integration** (editor loads generated assets)

## Blocks
- **08 Localization** (localization modifies text layers in the editor)
- **09 Export** (export reads canvas state)

## Can Be Parallel With
- **07 Compliance Scoring**
- **10 Campaign History**

## Scope

A Canva-like post-generation editor using Fabric.js with image/text layer separation, drag-and-drop editing, and undo/redo. All editor code must be `'use client'` since Fabric.js requires browser APIs.

## Tasks

- [x] Canvas lifecycle hook (`hooks/use-canvas.ts`)
  - Initialize Fabric.js Canvas on mount
  - Configure: `preserveObjectStacking: true`, background color
  - Dispose on unmount
  - **IMPLEMENTED**: Initializes canvas once using `initializedRef` guard
- [x] Canvas history hook (`hooks/use-canvas-history.ts`)
  - Undo/redo stacks using `canvas.toJSON()` snapshots
  - Listen to `object:modified`, `object:added`, `object:removed`
  - Max 50 entries per stack
  - **IMPLEMENTED**: Uses `isLoadingRef` to prevent saving state during programmatic changes
- [x] Layer model (React state):
  ```typescript
  interface EditorLayer {
    id: string;
    name: string;
    type: "background" | "product" | "logo" | "text" | "decorative";
    fabricObjectRef: fabric.Object;
    locked: boolean;
    visible: boolean;
  }
  ```
  - **IMPLEMENTED**: Custom properties stored as `(obj as any).id`, `name`, `layerType`, `locked`
- [x] Editor components (all `'use client'`):
  - `components/editor/canvas-editor.tsx` — main Fabric.js canvas wrapper
    - **IMPLEMENTED**: Includes fit-to-screen functionality, zoom display
    - **IMPLEMENTED**: Manual image loading via `FabricImage.fromURL()` with S3 proxy to avoid CORS issues
    - **IMPLEMENTED**: Correct image scaling based on intended dimensions vs natural image size
  - `components/editor/toolbar.tsx` — tool buttons (select, add text, shapes)
    - **IMPLEMENTED**: Undo, redo, save, add text, add shapes (rectangle, circle)
  - `components/editor/layers-panel.tsx` — layer list with:
    - Visibility toggle (eye icon)
    - Lock toggle (lock icon)
    - Z-index reordering (up/down buttons using `bringObjectForward`/`sendObjectBackwards`)
    - Layer name display
    - **IMPLEMENTED**: All features complete
  - `components/editor/properties-panel.tsx` — selected object properties (position, size, rotation, opacity)
    - **IMPLEMENTED**: All features complete
  - `components/editor/text-controls.tsx` — font family, font size, color, bold, italic, alignment
    - **IMPLEMENTED**: Includes text background color picker
- [x] Loading generated assets into editor:
  - **IMPLEMENTED**: Loads canvas state from DB
  - **IMPLEMENTED**: Separates image objects from JSON, loads them manually via `FabricImage.fromURL()` through `/api/proxy-image` to avoid CORS
  - **IMPLEMENTED**: Scales images to match intended display size after load
  - **IMPLEMENTED**: Inserts layers at correct z-order using `canvas.insertAt()`
- [x] Save canvas state to DB:
  - `canvas.toJSON(["id", "name", "layerType", "locked"])` (include custom props)
  - PUT to `/api/campaigns/[id]/assets/[assetId]` with `{ canvasState, thumbnailDataUrl }`
  - **IMPLEMENTED**: Also renders canvas at full resolution and uploads thumbnail to S3
- [x] Editor page (`app/campaigns/[id]/editor/page.tsx`)
  - Full-width editor layout with side panels
  - **IMPLEMENTED**: Includes toolbar, text controls, canvas area, layers panel, properties panel
- [x] S3 image proxy (`app/api/proxy-image/route.ts`)
  - **ADDED**: Proxies S3 images through server to avoid CORS issues
  - Required because Fabric.js `crossOrigin: 'anonymous'` requires CORS headers from S3

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `app/campaigns/[id]/editor/page.tsx` | Editor page | ✅ Implemented |
| `components/editor/canvas-editor.tsx` | Main canvas wrapper | ✅ Implemented (with S3 proxy, manual image loading, scaling) |
| `components/editor/toolbar.tsx` | Tool buttons | ✅ Implemented |
| `components/editor/layers-panel.tsx` | Layer management | ✅ Implemented |
| `components/editor/properties-panel.tsx` | Object properties | ✅ Implemented |
| `components/editor/text-controls.tsx` | Text editing controls | ✅ Implemented (with text background color) |
| `hooks/use-canvas.ts` | Canvas lifecycle | ✅ Implemented |
| `hooks/use-canvas-history.ts` | Undo/redo state | ✅ Implemented |
| `app/api/proxy-image/route.ts` | S3 image proxy (CORS workaround) | ✅ Added |
| `app/api/campaigns/[id]/assets/[assetId]/route.ts` | Asset GET/PUT with thumbnail update | ✅ Implemented |

## Packages

```
fabric (Fabric.js v6)
```

## Prisma Models Used

- **GeneratedAsset** — `canvasState` (JSON) column for persisting editor state

## Implementation Notes

### CORS and Image Loading
- **Issue**: Fabric.js v6 `loadFromJSON` with `crossOrigin: 'anonymous'` requires S3 CORS headers
- **Solution**: Created `/api/proxy-image` route to proxy S3 images through the server
- All S3 URLs are rewritten to `/api/proxy-image?url=<encoded-s3-url>` before loading
- On save, proxy URLs are converted back to original S3 URLs for portability

### Image Scaling
- **Issue**: `loadFromJSON` loads images at their natural pixel dimensions, ignoring the JSON `width`/`height`
- **Solution**: Manual image loading via `FabricImage.fromURL()` with explicit scaling:
  1. Record intended dimensions (`width * scaleX`, `height * scaleY`) before load
  2. Load image, get natural dimensions
  3. Calculate `scaleX = intendedWidth / naturalWidth`, `scaleY = intendedHeight / naturalHeight`
  4. Apply scaling after image loads

### Re-render Loop Prevention
- Uses `isLoadingRef` to suppress events during initial `loadFromJSON`
- Uses `initialLoadDoneRef` to ensure canvas state loads only once
- State changes stored in `latestCanvasStateRef` (not React state) to prevent re-renders

### Thumbnail Updates
- When saving, canvas is temporarily reset to zoom=1, rendered to `dataURL`, then restored
- Thumbnail data URL sent to API, which uploads to S3 and updates `s3Url`
- This ensures campaign overview thumbnails reflect edits

## Phase 6b: Editor UX Improvements

- [x] Shape fill color — color picker for rectangles and circles in properties panel
- [x] Delete layer — delete button in layers panel + Delete/Backspace keyboard shortcut
- [x] Transparent text background — "transparent/none" option in text background color picker
- [x] Vertical padding — vertical padding control for text layers (in addition to horizontal)
- [x] Border radius — corner roundness slider for rectangles and textboxes

## Verification

1. ✅ Open a generated asset in the editor — verify it loads with correct layers (including logo)
2. ✅ Verify background image fills correct aspect ratio (1:1, 9:16, 16:9)
3. ✅ Move layers — verify repositioning works
4. ✅ Resize and rotate elements — verify transforms work
5. ✅ Add a text layer — verify it appears centered, editable
6. ✅ Change font/color/size/alignment/background — verify text controls work
7. ✅ Reorder layers using up/down buttons — verify z-index changes
8. ✅ Lock a layer — verify it can't be moved
9. ✅ Toggle layer visibility — verify it hides/shows
10. ✅ Undo/redo — verify state changes correctly
11. ✅ Save and reload — verify canvas state persists
12. ✅ Fit to screen — verify canvas scales to fit viewport
13. ✅ Campaign overview shows updated thumbnail after save
