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

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| Styling | TailwindCSS, shadcn-vue |
| Server | Nitro (Nuxt built-in) |
| Database / Storage | Supabase (planned) |
| Vector Search | Supabase pgvector (planned) |
| AI Provider | LM Studio — local OpenAI-compatible API (planned) |
| PPTX generation | pptxgenjs (planned) |

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
    │   └── generateProposalDeck.ts # Render proposal PPTX via pptxgenjs (TODO)
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
        └── generateProposal.ts     # Full orchestration pipeline (TODO)
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

All composables call Nitro API routes via `$fetch`. Mock data is returned at this stage.

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
4. `/proposals/proposal-demo-001` → download card

---

## Implementation Roadmap (TODOs)

### Phase 1 — Storage & File Handling
- [ ] Configure Supabase project, set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars
- [ ] Implement `server/services/supabase/storage.ts` (`uploadFile`, `getSignedUrl`)
- [ ] Parse real multipart uploads in `upload.post.ts` routes
- [ ] Integrate a PPTX parser in `server/services/pptx/extractSlides.ts`

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

### Phase 4 — Proposal Generation
- [ ] Install `pptxgenjs`: `npm install pptxgenjs`
- [ ] Design slide templates in `generateProposalDeck.ts`
- [ ] Implement `buildProposalData.ts` and `generateProposal.ts` pipeline
- [ ] Wire `/api/proposals/generate` to the real pipeline
- [ ] Implement `/api/proposals/[id]/download` to stream PPTX from Supabase Storage
