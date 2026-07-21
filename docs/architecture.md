# AI RFP Generator — Architecture & Implementation Notes

> **Current-state document.** For setup and operations, use [Operations](operations.md). Historical phase notes later in this file are retained for context; the completed AI/vector capabilities described below supersede earlier “not started” references.

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

### Current AI matching flow

```
Case-study PPTX → slide extraction → BGE-M3 embedding (1024 dimensions) → Supabase pgvector
RFP text → LM Studio RFP analysis → query embedding → cosine slide search → grouped vector ranking
→ LM Studio strict-JSON explanation → recommendation review → proposal deck
```

Vector ranking owns `relevanceScore`; the chat model only supplies a human-readable reason, matched requirements, and confidence. Vector/embedding failures use keyword fallback. Explanation failures retain deterministic evidence and are visibly labelled as a fallback.

---

## ✅ Completion Status (July 2026)

### Phase 0 — Foundation (100% Complete)
- ✅ Nuxt 4 full-stack setup with all UI components
- ✅ All 5 pages: Dashboard, Case Studies, RFPs, Proposals, Recommendations
- ✅ TypeScript 5.9.3 with vue-tsc integration — **0 errors**
- ✅ Central server-only environment module using `LMSTUDIO_*` names (secrets never exposed to client)

### Phase 1 — Storage & Database (100% Complete)
- ✅ Supabase schema: 4 tables with RLS, foreign keys, indexes
- ✅ Service-role authenticated Supabase client (`server/services/supabase/client.ts`)
- ✅ Storage helpers: `uploadFile()`, `getSignedUrl()`, `downloadFile()`
- ✅ Complete DB query layer: 15+ typed helpers for all CRUD operations
- ✅ All API routes updated: case-studies, rfps, proposals
- ✅ Multipart form parsing for file uploads
- ✅ Production routes return an actionable dependency error when Supabase is unavailable; no fabricated records
- ✅ Synchronous case-study indexing: store PPTX, extract slide text with JSZip + fast-xml-parser, persist one-based slide rows, then mark `indexed`

### Phase 2 — PPTX Generation (100% Complete)
- ✅ Real PPTX generation with 7 professional slide layouts (pptxgenjs)
- ✅ Full proposal pipeline: `generateProposal()` orchestrates data fetch → render → save
- ✅ File download with correct Content-Type headers
- ⏳ **TODO**: Move files from local disk to Supabase Storage

### Phase 3 — AI Analysis (Complete)
- ✅ LM Studio chat and embedding integration
- ✅ RFP analysis and strict JSON prompts
- ✅ Recommendation explanation prompt and validation

### Phase 4 — Vector Search (Complete)
- ✅ pgvector extension, `vector(1024)` slide column, HNSW cosine index
- ✅ BGE-M3 embeddings generated during slide indexing
- ✅ `match_case_study_slides` RPC and keyword fallback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| Styling | TailwindCSS, shadcn-vue |
| Server | Nitro (Nuxt built-in) |
| Database / Storage | Supabase ✅ |
| Vector Search | Supabase pgvector — slide-level cosine similarity |
| AI Provider | LM Studio — local OpenAI-compatible chat and embeddings API |
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
    │   ├── client.ts               # Server-only Supabase client singleton ✅
    │   └── storage.ts              # File upload / signed URL helpers ✅
    ├── case-studies/
    │   └── indexCaseStudy.ts       # Synchronous storage, extraction, and DB indexing ✅
    ├── pptx/
    │   ├── extractSlides.ts        # JSZip + fast-xml-parser slide text extraction ✅
    │   └── generateProposalDeck.ts # Render proposal PPTX via pptxgenjs ✅ (7 slide layouts)
    ├── ai/
    │   ├── provider.ts             # AI provider factory
    │   ├── lmStudio.ts             # LM Studio OpenAI-compatible chat and embedding client
    │   └── prompts.ts              # System prompts + prompt builders
    ├── rfp/
    │   └── analyzeRfp.ts           # Extract requirements from RFP text
    ├── recommendations/
    │   └── findRelevantCaseStudies.ts # Vector search, keyword fallback, and AI explanations
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

All composables call Nitro API routes via `$fetch`. Empty Case Study and RFP lists show UI-only demo cards; they are not API-backed records. Case-study upload requires configured Supabase and completes storage, extraction, embedding, slide persistence, and the status transition synchronously before returning. Proposal generation calls the real pipeline.

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

## Demo Data and Current Limitation

The UI shows lightweight demo cards when real list data is empty. These are presentation-only and do not create Supabase rows or RFP analysis records.

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

To exercise the full live flow, configure Supabase and LM Studio, upload a real PPTX case study, then upload and analyze a text-bearing RFP. A demo card must not link to the real recommendation endpoint until guided local demo data is implemented.
4. Browser redirects to `/proposals/{generated-id}` → click **Download PPTX** to get the real `.pptx` file

---

## Implementation Roadmap

### Phase 1 — Storage & File Handling
- [x] Configure Supabase schema with 4 tables, RLS, FKs, indexes
- [x] Implement `server/services/supabase/client.ts` (service-role authenticated)
- [x] Implement `server/services/supabase/storage.ts` (`uploadFile`, `getSignedUrl`, `downloadFile`)
- [x] Implement `server/services/supabase/db.ts` with 15+ typed query helpers
- [x] Parse real multipart uploads in `upload.post.ts` routes
- [x] All API routes updated for Supabase with safe dependency errors
- [ ] Integrate a PPTX parser in `server/services/pptx/extractSlides.ts`
- [ ] Queue slide extraction job (background/queue service)

### Phase 2 — AI Analysis
- [x] Start LM Studio with configured `LMSTUDIO_BASE_URL` and models
- [x] Implement `server/services/rfp/analyzeRfp.ts` using `lmStudio.ts` + prompts
- [x] Wire `/api/rfps/[id]/analyze` to call the real service
- [x] Store `RfpAnalysis` in Supabase DB

### Phase 3 — Vector Search & Recommendations
- [x] Enable pgvector through migration `003_case_study_slide_embeddings.sql`
- [x] Embed case study slides with BGE-M3 and store 1024-dimensional vectors
- [x] Implement slide-level pgvector search with keyword fallback
- [x] Return strict-JSON LM Studio explanations with reason, requirements, confidence, and excerpts

### Phase 4 — Proposal Generation (persistence)
- [x] `pptxgenjs` installed and integrated
- [x] 7-slide proposal deck generated from real data
- [x] PPTX saved locally and served via download endpoint
- [x] Complete `generateProposal()` service with mock fallback
- [x] Supabase `dbInsertProposal()` for persistence (non-blocking)
- [ ] Replace local file storage with Supabase Storage bucket
- [ ] Add PDF export option
