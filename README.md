# AI_RFP — RFP Proposal Generator

> Start here: [documentation index](docs/README.md) · [live demo runbook](docs/live-demo-runbook.md) · [operations guide](docs/operations.md)

Nuxt 4 internal tool for presales teams to generate professional PPTX proposal decks from RFP documents using case study recommendations.

## Current capabilities

### AI Matching & Explainability
- ✅ LM Studio RFP analysis using `LMSTUDIO_CHAT_MODEL`
- ✅ Per-slide BGE-M3 embeddings using `LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF`
- ✅ Supabase pgvector cosine search over `case_study_slides.embedding` (`vector(1024)`)
- ✅ AI-written recommendation reasons, matched requirements, confidence, and matched-slide excerpts
- ✅ Deterministic keyword fallback when embedding/vector search fails

### Frontend & UI
- ✅ Nuxt 4 app base with full page structure
- ✅ TailwindCSS module for Nuxt (`@nuxtjs/tailwindcss`)
- ✅ shadcn-vue initialized with 10+ components auto-imported
- ✅ VueUse for Nuxt (`@vueuse/nuxt`)
- ✅ All pages: Dashboard, Case Studies, RFPs, Proposals, Recommendations

### Backend & Services  
- ✅ Real PPTX generation with 7 professional slide layouts (pptxgenjs)
- ✅ Real, synchronous case-study PPTX extraction and slide indexing (JSZip + fast-xml-parser)
- ✅ Supabase integration: client, storage, typed queries
- ✅ Complete API routes: case-studies, rfps, proposals (upload, list, generate, download)
- ✅ Multipart form file upload parsing
- ✅ Mock fallback pattern for all data layers

### Database & Infrastructure
- ✅ Supabase PostgreSQL schema (4 tables with RLS, FKs, indexes)
- ✅ Service role authentication (server-only, secure)
- ✅ Storage buckets configuration for PPTX uploads
- ✅ Type-safe Supabase client with proper null handling

### Development & Tooling
- ✅ TypeScript 5.9.3 with vue-tsc 2.1.6 (0 errors)
- ✅ Environment configuration with runtimeConfig (secrets never exposed to client)
- ✅ .env.example with all required variables
- ✅ All imports fixed (relative paths for server/, ~ alias for app/)
- ✅ Vue SFC compiler compatibility fixes (@vue-ignore on PrimitiveProps)


## Cấu hình chính

- **Nuxt**: `nuxt.config.ts` with `runtimeConfig` for secrets
- **Tailwind**: `tailwind.config.ts` (TypeScript) + `app/assets/css/tailwind.css`
- **shadcn-vue**: `components.json` with `pathPrefix: false`
- **Database**: `supabase/migrations/001_initial_schema.sql`
- **Environment**: Copy `.env.example` → `.env` and fill in Supabase credentials

## Chạy dự án

### Cài đặt dependencies
```bash
npm install
```

### Dev server (HTTP on port 3000)
```bash
npm run dev
```

### TypeScript typecheck (0 errors)
```bash
npm run typecheck
```

### Build & preview
```bash
npm run build
npm run preview
```

## Supabase Activation (Manual Setup)

To enable real data persistence, follow these steps:

### 1. Setup Supabase environment variables
Copy `.env.example` to `.env` and fill in your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 2. Run migrations
In Supabase SQL editor, execute these migrations in order:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rfp_analysis.sql`
- `supabase/migrations/003_case_study_slide_embeddings.sql`
- `supabase/migrations/004_production_reliability.sql`
- Creates 4 tables: `case_studies`, `case_study_slides`, `rfp_documents`, `proposals`
- Enables RLS on all tables (service role bypasses)
- Sets up foreign keys, indexes, check constraints

### 3. Create storage buckets
In Supabase Storage, create 3 **private** buckets (public access must remain disabled; downloads use short-lived signed URLs):
- `case-studies` — uploaded PPTX case study decks
- `rfps` — uploaded RFP documents
- `proposals` — generated proposal PPTX files

### 4. Restart dev server
```bash
npm run dev
```

Production data requires Supabase. Listing, upload, analysis, and proposal routes return a clear configuration error rather than fabricated mock records when it is unavailable.

Case-study uploads are indexed synchronously in the upload request. The server stores the original PPTX in the `case-studies` bucket, extracts text from its slide XML with JSZip and fast-xml-parser, writes one-based slide rows to `case_study_slides`, and returns only after the case study reaches `indexed`. Invalid, malformed, or text-free decks are rejected; processing failures mark the case study as `error`.

## API Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **Case Studies** | | |
| GET | `/api/case-studies` | List all case studies |
| POST | `/api/case-studies/upload` | Upload, extract, and synchronously index a PPTX case study (Supabase required) |
| GET | `/api/case-studies/search?q=` | Search case studies |
| **RFPs** | | |
| GET | `/api/rfps` | List all RFP documents |
| POST | `/api/rfps/upload` | Upload RFP document |
| POST | `/api/rfps/[id]/analyze` | Analyze persisted RFP text with LM Studio |
| GET | `/api/rfps/[id]/recommendations` | pgvector recommendations with AI explanations |
| **Proposals** | | |
| GET | `/api/capabilities` | Read non-secret service and PDF capabilities |
| POST | `/api/proposals/generate` | Generate durable PPTX proposal deck, optionally PDF |
| GET | `/api/proposals/[id]` | Get proposal metadata |
| GET | `/api/proposals/[id]/download` | Download proposal PPTX |

## Demo in five minutes

1. Configure Supabase and LM Studio using [Operations](docs/operations.md).
2. Upload a case-study PPTX and wait for **Indexed**.
3. Upload a text-bearing RFP and click **Analyze RFP**.
4. Review AI recommendations, their evidence slides, and confidence.
5. Click **Generate Proposal**, then **Download PPTX**.

Use [Live Demo Runbook](docs/live-demo-runbook.md) for presenter recovery steps.

## Production flow

Use one real indexed case study and one real analyzed RFP for the full flow. Generated proposal artifacts are stored in the private `proposals` bucket and remain downloadable after restart.

## AI and Semantic Search

Case-study upload extracts slide text, generates a 1024-dimensional embedding for each slide, and stores it in `case_study_slides.embedding`. Recommendation requests embed the RFP summary plus search keywords, call `match_case_study_slides`, group matching slides by case study, then ask the chat model to explain the selected results. If the embedding model or vector search fails, keyword matching is used. If the chat model cannot provide a valid explanation, the endpoint returns `503 AI explanation unavailable`.
