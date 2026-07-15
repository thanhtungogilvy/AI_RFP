# Semantic Case Study Recommendations Design

## Goal

Recommend the most relevant case studies for an analyzed RFP by comparing its summary and search keywords with slide-level embeddings stored in Supabase pgvector. Recommendations must include a score, reasons, and matched slide excerpts, while retaining keyword search whenever embedding generation or vector search fails.

## Constraints

- Generate embeddings through the existing LM Studio OpenAI-compatible API.
- Use `LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF` and 1024-dimensional vectors.
- Keep `LMSTUDIO_CHAT_MODEL` independent from the embedding model.
- Preserve existing upload, extraction, analysis, and recommendation response behavior outside this feature.
- A failed embedding must not discard successfully extracted slide text.

## Architecture

### Embedding service

Add a focused embedding service above the AI provider. It composes stable slide input from the slide title and content, delegates to `AIProvider.embed`, and validates that every returned value is finite and that the vector contains exactly 1024 dimensions. The provider interface will expose `embed(input: string): Promise<number[]>`; LM Studio already calls `/v1/embeddings` and will remain the concrete implementation.

The service will also compose the recommendation query from the RFP summary followed by its search keywords. Empty components are omitted and whitespace is normalized.

### Slide indexing

After PPTX extraction, `indexCaseStudy` will request an embedding for each extracted slide. Slides are persisted in their original order with their text and either a valid embedding or `null`.

Embedding failures are recoverable: the failure is logged, the slide is stored without an embedding, and indexing continues. Storage, extraction, or slide persistence failures retain the existing fatal behavior and mark the case study as `error`. A case study is `indexed` once all extracted slide rows have been persisted, regardless of whether some embeddings are null.

### Database and vector search

Add a migration that:

- enables the `vector` extension;
- adds `case_study_slides.embedding vector(1024)` if absent;
- adds an HNSW index using `vector_cosine_ops` for non-null embeddings;
- creates `match_case_study_slides(query_embedding vector(1024), match_threshold float, match_count int)`.

The function uses cosine distance and returns slide identity, case-study identity and metadata, slide text, and `1 - cosine_distance` as similarity. It excludes null embeddings and similarities below the threshold, orders by ascending cosine distance, and caps results to `match_count`.

The server calls the function through `supabase.rpc`. The initial defaults are a `0.45` similarity threshold and `20` slide matches; these are internal constants so they can be tuned without changing the public API.

## Recommendation flow

`findRelevantCaseStudies(analysis, caseStudies, dependencies?)` performs these steps:

1. Build a query from `analysis.summary` and `analysis.searchKeywords`.
2. Generate the query embedding.
3. Search Supabase for similar slides.
4. Group matched slides by `caseStudyId`.
5. Sort each group's slides by similarity and retain at most three matched excerpts.
6. Calculate the case-study relevance score as `0.7 * bestSimilarity + 0.3 * mean(topThreeSimilarities)`.
7. Return case studies sorted by descending score, limited to the top five.

Scores are clamped to `[0, 1]` and rounded for stable API output. `confidenceScore` is the mean of the retained slide similarities. The first recommendation is selected by default, preserving the existing proposal-selection behavior.

Reasons are deterministic and evidence-based. They identify the strongest matched slide, mention an industry match when applicable, and list query keywords found in matched excerpts. The service does not make an additional chat-model request.

Each recommendation includes `matchedSlideExcerpts`, with slide index, title, excerpt, and similarity. Excerpts are whitespace-normalized and length-limited. Existing recommendation fields remain available.

## Keyword fallback

If query embedding generation, Supabase configuration, or the vector RPC fails, recommendation continues with local keyword scoring over the case studies already supplied to the service. Search terms come from `searchKeywords`, summary tokens, industry, required capabilities, and technical requirements.

Keyword scoring compares normalized terms with case-study title, client, industry, summary, tags, slide titles, slide content, and slide tags. It groups matching slides, emits the same recommendation shape and excerpt fields, and ranks the top five case studies. If no terms match, it returns an empty recommendation list rather than unrelated results.

## API integration

The RFP recommendation endpoint will require a persisted RFP analysis, load real indexed case studies, and call `findRelevantCaseStudies`. It will no longer return hard-coded recommendations. A missing RFP id returns 400, and a missing analysis returns 404. Runtime embedding/vector failures are handled by the service fallback and therefore still return 200 with keyword recommendations.

## Types and configuration

- Extend `AIProvider` with `embed`.
- Add the embedding field to the Supabase slide row types without exposing the full vector through the browser-facing `CaseStudySlide` type.
- Extend `CaseStudyRecommendation` with typed `matchedSlideExcerpts`.
- Document `LMSTUDIO_CHAT_MODEL` and `LMSTUDIO_EMBEDDING_MODEL` in `.env.example`.

## Testing

Implementation follows red-green-refactor cycles. Tests will cover:

- embedding input composition and 1024-dimension validation;
- LM Studio embedding model selection and response validation;
- slide indexing with embeddings and recoverable per-slide embedding failure;
- Supabase slide persistence and RPC argument/result mapping;
- vector grouping, scoring, ordering, reasons, and excerpt limits;
- keyword fallback after embedding and RPC failures;
- recommendation endpoint use of persisted analysis and real case studies;
- type checking and the full Vitest suite.

The SQL migration will be reviewed through exact migration assertions because the local test suite has no live Supabase database. Live acceptance requires applying the migration, uploading a case study, confirming non-null embeddings, analyzing an RFP, and requesting its recommendations.

## Out of scope

- Background queues or scheduled embedding backfills.
- Re-embedding existing slides automatically during migration.
- LLM-generated recommendation explanations.
- User-facing controls for thresholds or result counts.
