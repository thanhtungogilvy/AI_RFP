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
4. `supabase/migrations/004_production_reliability.sql`

The final migration enables pgvector, adds `case_study_slides.embedding vector(1024)`, creates a cosine HNSW index, and creates `match_case_study_slides`.

## Embeddings and recommendations

Uploading a case-study PPTX extracts text from each slide and asks LM Studio for an embedding. A failed slide embedding is stored as `NULL`; the slide text remains indexed. Recommendation requests embed the RFP summary plus search keywords, search the RPC, group matching slides, then ask the chat model for a strict JSON explanation.

If embedding or vector search fails, keyword matching is used. If the chat model is unavailable or returns invalid explanation JSON after one retry, the UI shows deterministic evidence labelled as a fallback.

Existing slides without embeddings need re-indexing before they participate in vector search.

To backfill existing slide vectors without re-uploading decks, load the required environment variables and run `npm run backfill:embeddings`. The script processes 25 missing vectors at a time with concurrency 4 and exits safely when a full batch fails.

## Verification

```bash
npm run lint
npm test
npm run typecheck
npm run build
npm run test:e2e
```

The build may still print sourcemap/PURE-annotation warnings originating in Nuxt/VueUse dependencies. First-party source must not add build warnings.

After uploading a PPTX, verify embeddings:

```sql
select count(*) as embedded_slides
from public.case_study_slides
where embedding is not null;
```

## Status reference

| UI status | Persisted values | Meaning | Presenter action |
|---|---|---|---|
| Pending | `uploaded`, `pending` | File/request awaits work. | Start the next action. |
| Processing | `processing`, `analyzing`, `generating` | Server or AI is working. | Wait; do not refresh the page. |
| Indexed | `indexed` | PPTX slides were persisted; some embeddings can still be `NULL`. | Upload/analyze an RFP. |
| Analyzed | `analyzed` | RFP analysis is stored and recommendations can be requested. | View recommendations. |
| Generated | `completed`, `generated` | Proposal deck is ready. | Download PPTX. |
| Failed | `error`, `failed` | Server-side operation did not finish. | Read error, correct configuration/input, retry. |

## API behavior and recovery

| Endpoint | Success | Important failure behavior |
|---|---|---|
| `POST /api/case-studies/upload` | Stores PPTX, extracts slides, writes embeddings, marks indexed. | Requires Supabase; invalid/text-free PPTX returns 400. Individual embedding failures leave the slide row with `NULL` embedding. |
| `POST /api/rfps/[id]/analyze` | Stores strict RFP analysis. | LM Studio unavailable returns 503 and marks RFP error. |
| `GET /api/rfps/[id]/recommendations` | Returns score, reason, requirements, excerpts, and confidence. | Embedding/vector failure uses keyword fallback; failed explanations are visibly labelled fallback evidence. |
| `POST /api/proposals/generate` | Produces a durable PPTX proposal; optionally PDF. | Requires an analyzed RFP and at least one indexed case study. |

All API errors include a stable `data.code`, a correlated `data.requestId`, and the `X-Request-ID` header. Local structured JSON logs contain the request ID, route, operation/dependency when applicable, and status; credentials and file contents are redacted. Use the request ID to correlate a UI failure with the local server log. Dependency failures report an actionable 503 message and never expose a raw Supabase or model error.

## Demo data policy

The empty-list cards (`demo-cs-banking` and `demo-rfp-banking`) are presentation-only browser data. They deliberately do not create Supabase records, analyses, embeddings, or proposal files. Do not click the sample RFP's **View Recommendations** link during a live demo: it will return `404 RFP analysis not found` because the endpoint correctly reads persisted analysis only.

For an end-to-end demo, use one real indexed case study plus one real analyzed RFP. A future guided-demo feature must add a local API-compatible analysis/recommendation/proposal dataset before sample cards can support the full flow.

## Pre-demo checklist

- [ ] Run all four migrations in order.
- [ ] Confirm all three private Storage buckets exist.
- [ ] Start LM Studio and load both configured models.
- [ ] Run the `embedded_slides` query and confirm at least one non-null embedding.
- [ ] Confirm a real RFP has status `analyzed`.
- [ ] Open its recommendations page once; resolve any `503 AI explanation unavailable` before presenting.
- [ ] Generate and download one proposal deck once to confirm the download path.
