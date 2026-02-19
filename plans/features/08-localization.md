# Feature 08: Localization

## Dependencies
- **06 Canvas Editor** (localization modifies text layers in canvas state)

## Blocks
None.

## Can Be Parallel With
- **09 Export**

## Scope

Translate text content in generated assets into different languages using Gemini, creating localized variants that share the same visual layout but with translated copy. Includes font support for non-Latin scripts.

## Tasks

### Already Implemented (via other features)
- [x] Language selection in campaign brief (text input + dropdown in edit form)
- [x] AI copywriting in selected language (`generateAdCopy()` with `language` param)
- [x] Japanese font support — Noto Sans JP registered in server-side renderer + available in canvas editor font list
- [x] CJK character auto-detection in canvas renderer for font fallback
- [x] `GeneratedAsset.language` field tracks language per asset

### Post-generation localization ✅ IMPLEMENTED
- [x] Translation library (`lib/localization.ts`) — `translateAdCopy()` and `translateMultipleTexts()` using Gemini
- [x] Translation API route (`app/api/translate/route.ts`)
  - Accepts assetId + targetLanguage
  - Extracts text layers from canvas state (`objects` array, Fabric.js format)
  - Translates via Gemini, creates copy of GeneratedAsset with translated text
  - Updates font family for non-Latin scripts (ja, ko, zh, ar, hi)
- [x] "Localize" button on each asset card with language selector popover
  - Shows all supported languages except the asset's current language
  - Creates a new asset variant with translated text layers
- [x] Each localized variant is independently editable in the canvas editor
- [ ] Side-by-side variant comparison view (optional enhancement)

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/localization.ts` | Translation via Gemini |
| `src/app/api/localize/route.ts` | Translation API endpoint |
| `src/components/localization/language-selector.tsx` | Language dropdown |
| `src/components/localization/localized-variants.tsx` | Variant comparison view |
| `public/fonts/` | Noto Sans font files for multilingual support |

## Packages

No additional packages (uses existing `@google/genai`).

Font files (downloaded/bundled):
- NotoSans-Regular.woff2 (Latin)
- NotoSansJP-Regular.woff2 (Japanese)
- NotoSansKR-Regular.woff2 (Korean)
- NotoSansSC-Regular.woff2 (Simplified Chinese)
- NotoSansArabic-Regular.woff2 (Arabic)

## Prisma Models Used

- **GeneratedAsset** — `language` field distinguishes localized variants; `canvasState` updated with translated text

## Verification

1. Select a generated asset and click "Localize"
2. Choose Spanish — verify text layers are translated to Spanish
3. Choose Japanese — verify text renders correctly with Noto Sans JP
4. Verify side-by-side view shows original and translated variant
5. Verify brand/product names are NOT translated
6. Open a localized variant in the editor — verify it's independently editable
7. Verify the original asset is unchanged after creating a localized copy
