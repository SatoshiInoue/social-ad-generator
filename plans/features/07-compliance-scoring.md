# Feature 07: Compliance Scoring

## Dependencies
- **02 Brand Settings** (scoring checks against brand colors, guidelines, prohibited terms)
- **05 NanoBanana Integration** (scores generated assets)

## Blocks
None.

## Can Be Parallel With
- **06 Canvas Editor**
- **10 Campaign History**

## Scope

Brand and legal compliance scoring engine that rates generated assets 0–100 with detailed reasoning. Combines rule-based checks (prohibited terms, color matching) with AI-powered analysis (brand guideline alignment, logo placement, text readability).

## Tasks

- [x] Compliance engine (`lib/compliance.ts`)
  - **Prohibited terms check** (weight: 25, rule-based)
  - **Color palette compliance** (weight: 25, rule-based)
  - **Brand guidelines alignment** (weight: 30, AI-based via Gemini)
  - **Logo presence & placement** (weight: 10, AI-based)
  - **Text readability** (weight: 10, AI-based via Gemini)
  - Final score = weighted sum of all checks (0–100)
- [x] Compliance API route
  - `POST /api/compliance/score` — accepts assetId, returns score with reasoning
- [x] Compliance UI (inline in `campaign-detail.tsx`)
  - Score badge with color coding (green 80+, yellow 50-79, red <50)
  - Info icon popover showing per-check breakdown with progress bars, reasoning, and issues
  - "Check Compliance" button for assets without scores
- [x] Auto-score on generation completion (non-blocking in generation orchestration)
- [ ] Re-score trigger after editor saves (button in editor)
- [ ] Configurable compliance rules UI (optional)

## Key Files

| File | Purpose |
|------|---------|
| `lib/compliance.ts` | Scoring engine |
| `app/api/compliance/score/route.ts` | Score API endpoint |
| `components/campaign/campaign-detail.tsx` | Score badge + info popover (inline, no separate components) |
| `app/api/generate/route.ts` | Auto-scoring after generation |

## Packages

```
sharp (for dominant color extraction from images)
```
(Gemini text model used via existing `@google/genai` from feature 05)

## Prisma Models Used

- **ComplianceScore** — score (0-100), reasoning (JSON with checks array), colorCompliance, termCompliance, guidelineNotes
- **Brand** — colorPalette, prohibitedTerms, guidelines, tone, style (read-only in this feature)

## Verification

1. Generate an asset — verify compliance score appears automatically
2. Score badge shows correct color (green/yellow/red) based on score
3. Expand compliance details — verify each check has pass/fail + reasoning
4. Create a brand with prohibited terms, generate an asset containing those terms — verify the term check fails and score decreases
5. Test with off-brand colors — verify color compliance check detects mismatch
6. Re-score after editing an asset in the editor — verify updated score
