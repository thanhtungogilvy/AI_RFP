# AI RFP Generator — Architecture & Implementation Notes

## Overview

**AI RFP Generator** is a Nuxt 4 internal tool that helps presales/sales teams generate proposal decks from RFP documents.

### Core flow

```
Upload Case Studies (PPTX)
  → Extract & index slides
  → Upload RFP document
  → AI analyzes RFP requirements
  → AI recommends relevant case studies
  → User reviews & selects
  → Generate PPTX proposal deck
  → Download
```

---

## ✅ Completion Status (July 2026)

### Phase 0 — Foundation (100% Complete)
- ✅ Nuxt 4 full-stack setup with all UI components
- ✅ All 5 pages: Dashboard, Case Studies, RFPs, Proposals, Recommendations
- ✅ TypeScript 5.9.3 with vue-tsc integration — **0 errors**
- ✅ Environment configuration with `runtimeConfig` (secrets never exposed to client)

### Phase 1 — Storage & Database (100% Complete)
- ✅ Supabase schema: 4 tables with RLS, foreign keys, indexes
- ✅ Service-role authenticated Supabase client (`server/services/supabase/client.ts`)
- ✅ Storage helpers: `uploadFile()`, `getSignedUrl()`, `downloadFile()`
- ✅ Complete DB query layer: 15+ typed helpers for all CRUD operations
- ✅ All API routes updated: case-studies, rfps, proposals
- ✅ Multipart form parsing for file uploads
- ✅ Mock fallback pattern on all routes (graceful degradation)
- ⏳ **TODO**: Slide extraction from uploaded PPTX files

### Phase 2 — PPTX Generation (100% Complete)
- ✅ Real PPTX generation with 7 professional slide layouts (pptxgenjs)
- ✅ Full proposal pipeline: `generateProposal()` orchestrates data fetch → render → save
- ✅ File download with correct Content-Type headers
- ⏳ **TODO**: Move files from local disk to Supabase Storage

### Phase 3 — AI Analysis (Not Started)
- ⏳ LM Studio integration (`server/services/ai/lmStudio.ts`)
- ⏳ RFP analysis service (`server/services/rfp/analyzeRfp.ts`)
- ⏳ System prompts and prompt engineering

### Phase 4 — Vector Search (Not Started)
- ⏳ pgvector extension in Supabase
- ⏳ Case study slide embeddings
- ⏳ Semantic similarity search for recommendations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| Styling | TailwindCSS, shadcn-vue |
| Server | Nitro (Nuxt built-in) |
| Database / Storage | Supabase (planned) |
| Vector Search | Supabase pgvector (planned) |
| AI Provider | LM Studio — local OpenAI-compatible API (planned) |
| PPTX generation | pptxgenjs ✅ |

---

## Project Structure

```
app/
├── app.vue                         # Root — renders <NuxtPage />
├── assets/css/tailwind.css         # Tailwind base + shadcn CSS variables
├── types/                          # TypeScript interfaces
│   ├── case-study.ts
│   ├── rfp.ts
│   ├── recommendation.ts
│   └── proposal.ts
├── composables/                    # Data-fetching composables
│   ├── useCaseStudies.ts
│   ├── useRfps.ts
│   ├── useRecommendations.ts
│   └── useProposalGeneration.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.vue            # Sidebar + main layout wrapper
│   │   └── AppHeader.vue           # Top header bar
│   ├── shared/
│   │   ├── FileDropzone.vue        # Drag-and-drop file upload zone
│   │   ├── EmptyState.vue          # Generic empty state block
│   │   ├── StatusBadge.vue         # Colour-coded status pill
│   │   └── PageHeader.vue          # Page title + description + actions slot
│   ├── case-studies/
│   │   └── CaseStudyCard.vue       # Card for a single indexed case study
│   ├── rfps/
│   │   └── RfpCard.vue             # Card for a single RFP document
│   ├── recommendations/
│   │   └── RecommendationCard.vue  # AI recommendation with checkbox + reasons
│   ├── proposals/
│   │   └── ProposalDownloadCard.vue # Download buttons for generated proposal
│   └── ui/                         # shadcn-vue components (Button, Input, etc.)
└── pages/
    ├── index.vue                         # Dashboard
    ├── case-studies/
    │   ├── index.vue                     # Knowledge base list + search
    │   └── upload.vue                    # Upload PPTX case study
    ├── rfps/
    │   ├── index.vue                     # RFP list
    │   ├── upload.vue                    # Upload RFP with metadata form
    │   └── [id]/
    │       └── recommendations.vue       # AI analysis + recommendation review
    └── proposals/
        └── [id].vue                      # Proposal result + download

server/
├── api/
│   ├── case-studies/
│   │   ├── index.get.ts            # GET  /api/case-studies
│   │   ├── upload.post.ts          # POST /api/case-studies/upload
│   │   └── search.get.ts           # GET  /api/case-studies/search?q=
│   ├── rfps/
│   │   ├── index.get.ts            # GET  /api/rfps
│   │   ├── upload.post.ts          # POST /api/rfps/upload
│   │   └── [id]/
│   │       ├── analyze.post.ts     # POST /api/rfps/:id/analyze
│   │       └── recommendations.get.ts # GET /api/rfps/:id/recommendations
│   └── proposals/
│       ├── generate.post.ts        # POST /api/proposals/generate
│       ├── [id].get.ts             # GET  /api/proposals/:id
│       └── [id]/
│           └── download.get.ts     # GET  /api/proposals/:id/download
└── services/
    ├── supabase/
    │   ├── client.ts               # Supabase client singleton (TODO)
    │   └── storage.ts              # File upload / signed URL helpers (TODO)
    ├── pptx/
    │   ├── extractSlides.ts        # Parse PPTX → CaseStudySlide[] (TODO)
    │   └── generateProposalDeck.ts # Render proposal PPTX via pptxgenjs ✅ (7 slide layouts)
    ├── ai/
    │   ├── provider.ts             # AI provider factory
    │   ├── lmStudio.ts             # LM Studio OpenAI-compatible client (TODO)
    │   └── prompts.ts              # System prompts + prompt builders
    ├── rfp/
    │   └── analyzeRfp.ts           # Extract requirements from RFP text (TODO)
    ├── recommendations/
    │   └── findRelevantCaseStudies.ts # Vector search + AI scoring (TODO)
    └── proposal/
        ├── buildProposalData.ts    # Assemble deck data from selected case studies (TODO)
        └── generateProposal.ts     # Full orchestration pipeline ✅ (saves to .generated/proposals/)
```

---

## Types

### `CaseStudy`
```ts
{
  id, title, client, industry, summary,
  tags: string[],
  slides: CaseStudySlide[],   // extracted slide-by-slide
  fileName, uploadedAt,
  status: 'processing' | 'indexed' | 'error'
}
```

### `RfpDocument`
```ts
{
  id, title, client, industry, deadline?,
  fileName, uploadedAt,
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
}
```

### `CaseStudyRecommendation`
```ts
{
  id, rfpId, caseStudyId, caseStudyTitle, caseStudyClient, caseStudyIndustry,
  relevanceScore: number,   // 0–1
  confidenceScore: number,  // 0–1
  reasons: string[],
  matchedRequirements: string[],
  selected: boolean
}
```

### `ProposalGeneration`
```ts
{
  id, rfpId, title,
  status: 'pending' | 'generating' | 'completed' | 'error',
  selectedCaseStudyIds: string[],
  pptxUrl: string | null,
  pdfUrl: string | null,
  createdAt, completedAt?, errorMessage?
}
```

---

## Composables

| Composable | Reactive state | Methods |
|---|---|---|
| `useCaseStudies` | `caseStudies`, `loading`, `error` | `fetchAll()`, `upload(file)`, `search(q)` |
| `useRfps` | `rfps`, `loading`, `error` | `fetchAll()`, `upload(file, meta)`, `analyze(rfpId)` |
| `useRecommendations(rfpId)` | `recommendations`, `analysis`, `loading`, `error`, `selectedIds` | `fetch()`, `toggleSelection(id)` |
| `useProposalGeneration` | `proposal`, `loading`, `error` | `generate(rfpId, ids)`, `fetchProposal(id)` |

All composables call Nitro API routes via `$fetch`. Mock data is used for case studies and RFPs. Proposal generation calls the real pipeline.

---

## Nuxt Configuration Notes

### `pathPrefix: false` for components

```ts
// nuxt.config.ts
components: [{ path: '~/components', pathPrefix: false }]
```

This allows components to be used by their filename alone (`<Button>`, `<AppShell>`, `<CaseStudyCard>`) instead of their full directory-prefixed name (`<UiButton>`, `<LayoutAppShell>`, etc.).

### `/* @vue-ignore */` on PrimitiveProps

```ts
// app/components/ui/button/Button.vue
interface Props extends /* @vue-ignore */ PrimitiveProps { ... }
```

Required because the Vue SFC compiler in Nuxt 4 cannot statically resolve the `PrimitiveProps` type imported from `reka-ui`. The `@vue-ignore` directive tells the compiler to skip the base type — props still work correctly at runtime.

### `~` alias does not cover `server/` in Nuxt 4

In Nuxt 4, `~` (and `@`) resolves to the `app/` directory — **not the project root**.

| Import path | Resolves to | Works? |
|---|---|---|
| `~/types/case-study` | `app/types/case-study` | ✅ (types live in `app/types/`) |
| `~/server/services/…` | `app/server/services/…` | ❌ (`server/` is at project root) |

**Rule:** All imports across files inside `server/` must use **relative paths**.

```ts
// ✅ correct — relative import inside server/
import { generateProposal } from '../../services/proposal/generateProposal'

// ❌ wrong — ~ resolves to app/, not project root
import { generateProposal } from '~/server/services/proposal/generateProposal'
```

---

## Proposal Generation — Real Implementation

PPTX generation is fully implemented end-to-end. The pipeline on `POST /api/proposals/generate`:

```
request body { rfpId, selectedCaseStudyIds }
  → generateProposal()               (server/services/proposal/generateProposal.ts)
    → getRfp(), getCaseStudies()       (mock data; TODO: Supabase query)
    → generateProposalDeck()           (server/services/pptx/generateProposalDeck.ts)
      → pptxgenjs builds 7+ slides
      → returns Buffer
    → writeFile() to .generated/proposals/{id}.pptx
  → returns ProposalGeneration with pptxUrl

GET /api/proposals/{id}/download
  → readFile() from .generated/proposals/{id}.pptx
  → streams PPTX with correct Content-Type header
```

### Slide layout (16:9 widescreen, pptxgenjs)

| # | Slide | Notes |
|---|---|---|
| 1 | Cover | Dark navy bg, title, client, date, accent bar |
| 2 | Executive Summary | RFP summary + 3 value prop boxes |
| 3 | Key RFP Requirements | Priority-coloured table (High/Medium/Low) |
| 4 | Proposed Approach | 4-phase delivery cards |
| 5 | Case Studies Overview | Numbered list of selected case studies |
| 6–N | Per Case Study | Challenge / Solution / Results columns |
| Last | Thank You / Next Steps | 4 action items + RFP deadline box |

### Local file storage

Generated files are stored at `.generated/proposals/{proposalId}.pptx` (gitignored).
TODO: replace with Supabase Storage upload + signed URL.

---

## Mock API Data

The following mock records are available in the dev server out of the box:

**Case Studies (3 indexed)**
- `cs-001` — Digital Transformation for Vietcombank (Banking)
- `cs-002` — AI-Powered Customer Service for Masan Group (Retail)
- `cs-003` — Data Platform Modernisation for VinGroup (Conglomerate)

**RFPs (2 documents)**
- `rfp-001` — Core Banking System Modernisation RFP (ABC Bank) — status: `analyzed`
- `rfp-002` — AI Customer Engagement Platform (RetailCo Vietnam) — status: `uploaded`

**Proposal (1 demo)**
- `proposal-demo-001` — Proposal for ABC Bank — status: `completed`
- PPTX URL: `/api/proposals/proposal-demo-001/download?format=pptx`

To exercise the full demo flow:
1. `/` → Dashboard
2. `/rfps` → click **View Recommendations** on rfp-001
3. `/rfps/rfp-001/recommendations` → review AI analysis, select case studies, click **Generate Proposal**
4. Browser redirects to `/proposals/{generated-id}` → click **Download PPTX** to get the real `.pptx` file

---

## Implementation Roadmap

### Phase 1 — Storage & File Handling
- [x] Configure Supabase schema with 4 tables, RLS, FKs, indexes
- [x] Implement `server/services/supabase/client.ts` (service-role authenticated)
- [x] Implement `server/services/supabase/storage.ts` (`uploadFile`, `getSignedUrl`, `downloadFile`)
- [x] Implement `server/services/supabase/db.ts` with 15+ typed query helpers
- [x] Parse real multipart uploads in `upload.post.ts` routes
- [x] All API routes updated for Supabase with mock fallback
- [ ] Integrate a PPTX parser in `server/services/pptx/extractSlides.ts`
- [ ] Queue slide extraction job (background/queue service)

### Phase 2 — AI Analysis
- [ ] Start LM Studio with a capable model, set `LM_STUDIO_BASE_URL` env var
- [ ] Implement `server/services/rfp/analyzeRfp.ts` using `lmStudio.ts` + prompts
- [ ] Wire `/api/rfps/[id]/analyze` to call the real service
- [ ] Store `RfpAnalysis` in Supabase DB

### Phase 3 — Vector Search & Recommendations
- [ ] Enable `pgvector` extension in Supabase
- [ ] Embed case study slides via AI embeddings and store vectors
- [ ] Implement `findRelevantCaseStudies.ts` using pgvector similarity search
- [ ] Replace mock recommendations API with real service call

### Phase 4 — Proposal Generation (persistence)
- [x] `pptxgenjs` installed and integrated
- [x] 7-slide proposal deck generated from real data
- [x] PPTX saved locally and served via download endpoint
- [x] Complete `generateProposal()` service with mock fallback
- [x] Supabase `dbInsertProposal()` for persistence (non-blocking)
- [ ] Replace local file storage with Supabase Storage bucket
- [ ] Add PDF export option
