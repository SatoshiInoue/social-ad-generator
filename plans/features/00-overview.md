# Feature Overview & Dependency Graph

## Features

| # | Feature | Description |
|---|---------|-------------|
| 01 | Foundation | Next.js, Prisma, Auth, S3, Layout |
| 02 | Brand Settings | Brand CRUD, logo, color palette, guidelines, prohibited terms |
| 03 | Media Library | Image upload, gallery, selector modal |
| 04 | Campaign Briefs | Brief form, file parsing, campaign wizard, dashboard |
| 05 | NanoBanana Integration | API wrapper, generation orchestration, job queue |
| 06 | Canvas Editor | Fabric.js editor, layers, text editing, undo/redo |
| 07 | Compliance Scoring | Brand/legal scoring engine + UI |
| 08 | Localization | Translation via Gemini, language variants |
| 09 | Export | PNG, JPEG, PSD export with layer separation |
| 10 | Campaign History | History page, search/filter, polish |

## Dependency Graph

```
01 Foundation
 ├─► 02 Brand Settings
 ├─► 03 Media Library          ◄── parallel with 02
 │
 ├─► 04 Campaign Briefs        (depends on: 01, 02, 03)
 │
 ├─► 05 NanoBanana Integration (depends on: 04)
 │    │
 │    ├─► 06 Canvas Editor     (depends on: 05)
 │    │    ├─► 08 Localization  (depends on: 06)
 │    │    └─► 09 Export        (depends on: 06)  ◄── parallel with 08
 │    │
 │    ├─► 07 Compliance Scoring (depends on: 02, 05) ◄── parallel with 06
 │    │
 │    └─► 10 Campaign History   (depends on: 05)     ◄── parallel with 06, 07
```

## Execution Order

### Sequential (critical path)
```
01 → 02+03 (parallel) → 04 → 05 → 06 → 08+09 (parallel)
```

### Parallel Opportunities

| After completing | You can build in parallel |
|-----------------|--------------------------|
| 01 Foundation | 02 Brand Settings + 03 Media Library |
| 05 NanoBanana | 06 Canvas Editor + 07 Compliance Scoring + 10 Campaign History |
| 06 Canvas Editor | 08 Localization + 09 Export |

### Minimum sequential steps: 6
```
01 → 02/03 → 04 → 05 → 06 → 08/09
```
(07 and 10 fit into parallel slots and don't extend the critical path)
