# Changelog

## [2026-07-15] — Semantic Recommendations, AI Explanations & Demo Polish

### Added
- pgvector migration `003_case_study_slide_embeddings.sql` with 1024-dimensional BGE-M3 slide embeddings, HNSW cosine index, and similarity RPC.
- LM Studio RFP analysis, semantic recommendations, matched slide excerpts, and keyword fallback.
- Strict-JSON AI recommendation explanations with reasons, matched requirements, and confidence.
- Demo-friendly empty-state sample cards, clearer CTAs, success confirmations, responsive recommendation layout, and normalized status labels.

### Important behavior
- A chat explanation failure returns `503 AI explanation unavailable`.
- UI-only demo RFP cards are not persisted and cannot call the real recommendation endpoint; use real uploaded data for an end-to-end demo.

## [2026-07-14] — TypeScript Verification & Documentation

### ✅ Completed
- **Case-study PPTX indexing**: Uploads now run a real synchronous indexing pipeline
  - Requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; no mock upload fallback
  - Stores the original deck in Supabase Storage and records its path
  - Extracts ordered slide text with JSZip and fast-xml-parser
  - Persists one-based slide rows, then transitions the case study to `indexed`
  - Rejects invalid, malformed, and text-free decks and records processing failures as `error`

- **TypeScript Checking**: Fixed all 8 TypeScript errors, `npx nuxi typecheck` now passes cleanly (0 errors in 4.2s)
  - Fixed Button component type imports (used `VariantProps` from CVA)
  - Added missing `lucide-vue-next` dependency for Checkbox and Dialog icons
  - Resolved Supabase SDK type inference issues with `as any` casts on insert/update operations
  - Fixed RFP type handling in proposal generation with proper undefined checks
  - Corrected download handler buffer return type using `event.node.res.end(buffer)`

- **Documentation**: Updated docs to reflect completion status
  - Updated README.md with completed features, setup instructions, Supabase activation guide
  - Updated docs/architecture.md with phase completion status
  - Created CHANGELOG.md for tracking major changes

- **Dependency Updates**
  - Downgraded vue-tsc from 3.3.7 to 2.1.6 (compatibility fix for TypeScript 5.9.3)
  - Installed lucide-vue-next for icon support

### 🎯 Current Status

**Phase 0-2: 100% Complete**
- Full Nuxt 4 + Vue 3 frontend with all pages
- Real PPTX generation with 7 professional slides
- Supabase PostgreSQL backend with complete type-safe query layer
- File upload/download with multipart parsing
- Mock fallback pattern for graceful degradation
- Zero TypeScript errors

**Phase 3-4: Not Started**
- AI analysis via LM Studio
- Vector search with pgvector
- PDF export

### 📝 Next Steps for User

1. **Activate Supabase** (manual)
   - Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
   - Run migration SQL in Supabase SQL editor
   - Create 3 storage buckets (case-studies, rfps, proposals)
   - Restart dev server

2. **Add AI analysis** (optional)
   - Start LM Studio with a local model
   - Implement RFP analysis service
   - Wire recommendations endpoint

---

## [2026-07-14] — Supabase Integration Complete

### ✅ Completed
- **Database Schema**: 4 tables (case_studies, case_study_slides, rfp_documents, proposals)
  - RLS enabled on all tables
  - Foreign keys, indexes, check constraints
  - pgvector-ready for future semantic search

- **Supabase Services**:
  - `server/services/supabase/client.ts` — Service-role authenticated client
  - `server/services/supabase/storage.ts` — File upload/download helpers
  - `server/services/supabase/db.ts` — 15+ typed query helpers
  - `server/services/supabase/types.ts` — Auto-gen-ready database types

- **API Routes Updated** (all with mock fallback):
  - POST /api/case-studies/upload
  - GET /api/case-studies/search?q=
  - POST /api/rfps/upload
  - POST /api/proposals/generate
  - GET /api/proposals/[id]/download

- **Configuration**:
  - `runtimeConfig` in nuxt.config.ts keeps secrets server-only
  - `.env.example` with all required variables
  - All relative paths fixed (~/server/ → ../../)

### 🔧 Technical Details
- Service role key never exposed to client
- Null-safe client returns `null` when env vars absent
- All queries throw `createError` on database errors
- Mock data used automatically when Supabase unconfigured

---

## [2026-07-14] — Real PPTX Generation

### ✅ Completed
- **pptxgenjs Integration**: Full PPTX generation pipeline
  - 7-slide professional layouts (16:9 widescreen)
  - Slide types: Cover, Executive Summary, Requirements, Approach, Case Studies, Per-Study, Next Steps
  - Design tokens: colors, spacing, typography
  - Real data rendering (RFP + case studies)

- **Proposal Service** (`server/services/proposal/generateProposal.ts`):
  - Full orchestration: fetch RFP → case studies → generate PPTX → save → persist
  - Mock fallback when Supabase unconfigured
  - Local file storage in `.generated/proposals/{id}.pptx`
  - Non-blocking Supabase persistence (errors logged, doesn't crash)

- **Download Route** (`server/api/proposals/[id]/download.get.ts`):
  - Streams PPTX with correct Content-Type header
  - 404 error if file not found
  - Filename includes proposal ID

### 📊 Slide Architecture
| Slide | Content |
|-------|---------|
| 1 | Cover slide with client name, date, accent bar |
| 2 | Executive summary + 3 value propositions |
| 3 | RFP requirements table (color-coded by priority) |
| 4 | 4-phase delivery approach |
| 5 | Case studies overview (numbered list) |
| 6–N | Per-case-study: Challenge / Solution / Results |
| Last | Thank you + next steps + RFP deadline |

---

## [2026-06-XX] — Initial Project Setup

- Nuxt 4 full-stack framework
- TailwindCSS + shadcn-vue UI components
- All 5 pages with mock data
- TypeScript configuration
- Mock case studies, RFPs, recommendations
