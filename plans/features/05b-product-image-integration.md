# Feature 05b: Product Image Integration into Generation Pipeline

## Status: IMPLEMENTED (Phase 4d fixes in progress)

## Problem

Product images selected during campaign creation (`campaign.productImageIds`) are stored in the database but **never used** during asset generation. The current pipeline generates an AI background, overlays text and a logo, but the actual product never appears in the final ad.

## Implementation (Completed)

### What Was Done
1. **`removeBackground()`** — Real Gemini image editing implementation (multi-part: text prompt + inline image data)
2. **`generateAdWithProduct()`** — New function that sends product images + scene prompt to Gemini for AI-composed scene generation
3. **Updated `generatePromptFromBrief()`** — Context-aware prompt generation (background-focused when products exist)
4. **Updated generation route** — Fetches product images from DB/S3, removes backgrounds, uses `generateAdWithProduct()` when products available

### What Worked
- Gemini successfully receives product images and composites them into the generated scene naturally
- Background removal via Gemini produces clean cutouts
- Falls back to `generateBackground()` when no product images selected

### Issues Found After Testing

1. **Redundant product layer** — The AI-generated background already includes the product (Gemini composited it). A separate "Product" canvas layer drawn on top redundantly covers the nicely integrated product. **Fix: Remove the product layer from canvas state.** ✅ Fixed

2. **Gemini generates text in images** — e.g., "FREDT NOW", "ROENA NOW" as garbled text baked into the generated image. Added "Do NOT include any text" instruction at end of prompt, but Gemini still sometimes ignores it. **Fix: Move no-text instruction to the VERY START of the prompt (system-level) so it gets maximum attention from the model. Repeat it at both start and end for emphasis.**

3. **No AI copywriting** — `generateHeadlineText()` just returns the raw product name and `generateCTAText()` returns "Shop Now". No creative copy generation. **Fix: Add `generateAdCopy()` function using Gemini text model.** ✅ Fixed

4. **Product image aspect ratio distortion** — Gemini stretches/squashes the product when compositing it into the scene, changing its proportions. **Fix: Add explicit instruction to NEVER distort, stretch, or squash the product — it must preserve the exact original proportions and aspect ratio.** ✅ Fixed

5. **No-text instruction too aggressive** — Gemini removes text that is part of the original product packaging (e.g., brand labels, product names printed on the package). The instruction should only forbid ADDING new text — not removing text that already exists on the product. **Fix: Reword the no-text instruction to "Do not ADD any new text" and "Preserve all existing text, labels, and branding on the product."** ✅ Fixed

6. **Background doesn't fill canvas for non-1:1 ratios** — 16:9 and 9:16 generated images have white/blank bars at top and bottom, not covering the full canvas area. Prompt engineering alone doesn't fix this — Gemini doesn't reliably generate images in exact aspect ratios. **Fix: Post-process with `sharp` to crop/resize generated images to exact target dimensions (cover mode).** ✅ Fixed via post-processing

7. **Product stretching PERSISTENT** — Despite multiple prompt iterations with explicit "do not stretch/distort" instructions, Gemini still stretches the product in 16:9 and 9:16 outputs. This appears to be a Gemini limitation — it tries to fill the requested aspect ratio by stretching content rather than compositing naturally. **Fix: Same post-processing approach — let Gemini generate at its natural aspect ratio, then use `sharp` cover-crop to fit target dimensions. This preserves product proportions since the crop doesn't stretch.**

## Revised Design

### Layer Architecture (Updated)
Since Gemini composites the product INTO the background scene, there is no need for a separate product layer:

```
Layer 1: Background (locked) — AI-generated scene WITH product already composited
Layer 2: Headline text — AI-generated catchy copy
Layer 3: CTA text — AI-generated compelling call-to-action
Layer 4: Logo (optional)
```

### Generation Pipeline (Updated)

```
1. Fetch product images from DB/S3 (once, cached)
2. Remove background from each product (once, cached via Gemini)
3. Generate AI prompt from brief (product-context-aware)
4. Generate AI ad copy (headline + CTA) via Gemini text model
5. For each aspect ratio:
   a. IF products: generateAdWithProduct(prompt, products) → unified scene
   b. ELSE: generateBackground(prompt) → background only
   c. POST-PROCESS: sharp cover-crop to exact target dimensions (fixes white bars + stretching)
   d. Build canvas state: [Background, Headline, CTA, Logo]
   e. Render & upload
```

## Key Files

| File | Status |
|------|--------|
| `lib/nanobanana.ts` | `removeBackground()` ✅, `generateAdWithProduct()` ✅, `generateAdCopy()` ✅ |
| `app/api/generate/route.ts` | Product fetching ✅, orchestration ✅, AI copy ✅, **sharp post-processing NEW** |
| `lib/canvas-state.ts` | Product layer REMOVED ✅, `productImageUrls` REMOVED ✅ |
| `lib/canvas-renderer.ts` | No changes needed |

## Verification

1. Generate with product images — product appears in background naturally, NO separate "Product" layer in editor
2. Generated image has NO text/typography baked in by Gemini
3. Headline is catchy AI-generated copy (not just product name)
4. CTA is compelling (not "Shop Now" or garbled text)
5. No-product campaigns still work as before
6. Japanese language campaigns get Japanese headline/CTA
