# AI_RFP — RFP Proposal Generator

Nuxt 4 internal tool for presales teams to generate professional PPTX proposal decks from RFP documents using case study recommendations.

## ✅ Hoàn thành

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

All configured data now persists to Supabase automatically. Listing and search routes can fall back to mock data when Supabase is unconfigured. Case-study PPTX upload does not use a mock fallback: it requires both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` and returns `503` without them.

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
| POST | `/api/proposals/generate` | Generate PPTX proposal deck |
| GET | `/api/proposals/[id]` | Get proposal metadata |
| GET | `/api/proposals/[id]/download` | Download proposal PPTX |

## Demo Data

Out of the box (no Supabase required):
- **3 Case Studies**: Vietcombank, Masan Group, VinGroup
- **2 RFPs**: ABC Bank, RetailCo Vietnam
- Empty Case Study and RFP lists show UI-only demo cards to explain the flow.

### Demo limitations

UI demo RFP cards are not persisted in Supabase, so they cannot open the real recommendations endpoint. For a complete live demo, upload one real case study and one text-bearing RFP after configuring Supabase and LM Studio. A guided end-to-end local demo remains future work.

## AI and Semantic Search

Case-study upload extracts slide text, generates a 1024-dimensional embedding for each slide, and stores it in `case_study_slides.embedding`. Recommendation requests embed the RFP summary plus search keywords, call `match_case_study_slides`, group matching slides by case study, then ask the chat model to explain the selected results. If the embedding model or vector search fails, keyword matching is used. If the chat model cannot provide a valid explanation, the endpoint returns `503 AI explanation unavailable`.
