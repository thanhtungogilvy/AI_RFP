# Operations Guide

## Required services

- Supabase project with private buckets: `case-studies`, `rfps`, and `proposals`.
- LM Studio running an OpenAI-compatible server.
- Chat model: `google/gemma-4-e2b`.
- Embedding model: `gpustack/bge-m3-GGUF` (1024 dimensions).

## Configuration

Copy `.env.example` to `.env` and set:

```dotenv
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
LMSTUDIO_BASE_URL=http://localhost:1234
LMSTUDIO_CHAT_MODEL=google/gemma-4-e2b
LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF
```

Never expose `SUPABASE_SERVICE_KEY` to the browser.

## Database setup

Run these SQL files in order in the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rfp_analysis.sql`
3. `supabase/migrations/003_case_study_slide_embeddings.sql`

The final migration enables pgvector, adds `case_study_slides.embedding vector(1024)`, creates a cosine HNSW index, and creates `match_case_study_slides`.

## Embeddings and recommendations

Uploading a case-study PPTX extracts text from each slide and asks LM Studio for an embedding. A failed slide embedding is stored as `NULL`; the slide text remains indexed. Recommendation requests embed the RFP summary plus search keywords, search the RPC, group matching slides, then ask the chat model for a strict JSON explanation.

If embedding or vector search fails, keyword matching is used. If the chat model is unavailable or returns invalid explanation JSON, the endpoint returns `503 AI explanation unavailable`.

Existing slides without embeddings need re-indexing before they participate in vector search.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

After uploading a PPTX, verify embeddings:

```sql
select count(*) as embedded_slides
from public.case_study_slides
where embedding is not null;
```
