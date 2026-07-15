# Semantic Case Study Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist 1024-dimensional BGE-M3 embeddings for extracted case-study slides and return evidence-backed RFP recommendations using Supabase pgvector with a keyword fallback.

**Architecture:** A small embedding service validates all vectors and supplies normalized slide/query input. Case-study indexing persists nullable embeddings, Supabase exposes slide matches through one cosine-similarity RPC, and the recommendation service groups those matches into stable case-study scores; any embedding or RPC error switches to an in-process keyword scorer over loaded case studies.

**Tech Stack:** Nuxt 4.4, TypeScript 5.9, LM Studio OpenAI-compatible embeddings, BGE-M3 (1024 dimensions), Supabase JS 2.110, PostgreSQL pgvector, Vitest 4

## Global Constraints

- Use `LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF` independently from `LMSTUDIO_CHAT_MODEL`.
- Store only finite vectors containing exactly 1024 numbers.
- Persist extracted slide text even when its embedding cannot be generated; store `null` for that embedding.
- Use RFP summary and search keywords as the semantic query.
- Rank at most five case studies using at most three evidence slides per recommendation.
- Preserve all existing `CaseStudyRecommendation` fields and add typed matched slide excerpts.
- Fall back to deterministic keyword scoring when query embedding generation, Supabase configuration, or vector RPC execution fails.
- Do not add queues, automatic historical backfills, LLM-written reasons, or user-configurable thresholds.

## File Structure

- Modify `server/services/ai/provider.ts`: expose embedding generation on the provider contract.
- Create `server/services/embeddings/generateEmbedding.ts`: compose inputs and validate 1024-dimensional vectors.
- Create `server/services/embeddings/generateEmbedding.test.ts`: test input normalization and validation.
- Modify `server/services/ai/lmStudio.test.ts`: lock down the configured BGE-M3 request and malformed response behavior.
- Create `supabase/migrations/003_case_study_slide_embeddings.sql`: add the vector column, HNSW index, and slide-match RPC.
- Create `supabase/migrations/003_case_study_slide_embeddings.test.ts`: assert the migration's database contract.
- Modify `server/services/supabase/types.ts`: represent nullable embeddings and the RPC result.
- Modify `server/services/supabase/db.ts`: persist embeddings and call the vector RPC.
- Modify `server/services/supabase/db.test.ts`: test vector persistence, RPC mapping, and unconfigured Supabase behavior.
- Modify `server/services/case-studies/indexCaseStudy.ts`: generate embeddings per extracted slide without making embedding failures fatal.
- Modify `server/services/case-studies/indexCaseStudy.test.ts`: test successful and degraded embedding indexing.
- Modify `app/types/recommendation.ts`: add `MatchedSlideExcerpt` and `matchedSlideExcerpts`.
- Replace `server/services/recommendations/findRelevantCaseStudies.ts`: implement vector grouping/scoring and keyword fallback.
- Create `server/services/recommendations/findRelevantCaseStudies.test.ts`: test ranking, evidence, and both fallback triggers.
- Replace `server/api/rfps/[id]/recommendations.get.ts`: load persisted data and call the real service.
- Create `server/api/rfps/[id]/recommendations.get.test.ts`: test the HTTP-facing orchestration and errors.
- Modify `.env.example`: document independent chat and embedding model variables.

---

### Task 1: Embedding Contract and Validation Service

**Files:**
- Modify: `server/services/ai/provider.ts`
- Create: `server/services/embeddings/generateEmbedding.ts`
- Create: `server/services/embeddings/generateEmbedding.test.ts`
- Modify: `server/services/ai/lmStudio.test.ts`

**Interfaces:**
- Consumes: `AIProvider.embed(input: string): Promise<number[]>`, slide title/content, and RFP summary/search keywords.
- Produces: `EMBEDDING_DIMENSIONS`, `generateEmbedding(input, provider?)`, `generateSlideEmbedding(slide, provider?)`, and `buildRecommendationQuery(analysis)`.

- [ ] **Step 1: Write failing embedding service tests**

Create `server/services/embeddings/generateEmbedding.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { buildRecommendationQuery, EMBEDDING_DIMENSIONS, generateEmbedding, generateSlideEmbedding } from './generateEmbedding'

const vector = () => Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => index / EMBEDDING_DIMENSIONS)
const provider = (embedding = vector()) => ({
  complete: vi.fn(),
  embed: vi.fn().mockResolvedValue(embedding),
})

describe('embedding service', () => {
  it('normalizes slide title and content before embedding', async () => {
    const ai = provider()
    await generateSlideEmbedding({ title: ' Results ', content: '  42%   faster\n delivery ' }, ai)
    expect(ai.embed).toHaveBeenCalledWith('Results\n42% faster delivery')
  })

  it('builds an RFP query from summary and unique keywords', () => {
    expect(buildRecommendationQuery({ summary: ' Cloud migration ', searchKeywords: ['banking', 'cloud migration', 'banking'] })).toBe(
      'Cloud migration\nbanking\ncloud migration',
    )
  })

  it.each([[1, 2], Array(EMBEDDING_DIMENSIONS).fill(Number.NaN)])('rejects invalid embeddings', async (embedding) => {
    await expect(generateEmbedding('input', provider(embedding))).rejects.toThrow('LM Studio returned an invalid 1024-dimensional embedding')
  })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- server/services/embeddings/generateEmbedding.test.ts
```

Expected: FAIL because `generateEmbedding.ts` does not exist.

- [ ] **Step 3: Extend the provider and implement the minimal embedding service**

Change `AIProvider` in `server/services/ai/provider.ts` to:

```ts
export interface AIProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>
  embed(input: string): Promise<number[]>
}
```

Create `server/services/embeddings/generateEmbedding.ts`:

```ts
import type { AIProvider } from '../ai/provider'
import { getAIProvider } from '../ai/provider'

export const EMBEDDING_DIMENSIONS = 1024

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export async function generateEmbedding(input: string, ai?: AIProvider): Promise<number[]> {
  const provider = ai ?? await getAIProvider()
  const embedding = await provider.embed(normalize(input))
  if (embedding.length !== EMBEDDING_DIMENSIONS || embedding.some(value => !Number.isFinite(value))) {
    throw new Error('LM Studio returned an invalid 1024-dimensional embedding')
  }
  return embedding
}

export function generateSlideEmbedding(
  slide: { title: string; content: string },
  ai?: AIProvider,
): Promise<number[]> {
  return generateEmbedding([normalize(slide.title), normalize(slide.content)].filter(Boolean).join('\n'), ai)
}

export function buildRecommendationQuery(analysis: { summary: string; searchKeywords: string[] }): string {
  const keywords = [...new Set(analysis.searchKeywords.map(normalize).filter(Boolean))]
  return [normalize(analysis.summary), ...keywords].filter(Boolean).join('\n')
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- server/services/embeddings/generateEmbedding.test.ts
```

Expected: all embedding service tests PASS.

- [ ] **Step 5: Strengthen the LM Studio provider tests**

In `server/services/ai/lmStudio.test.ts`, change the configured embedding model in the existing test to `gpustack/bge-m3-GGUF`, assert that exact model is sent, and add:

```ts
it('rejects an empty embedding response', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }))
  await expect(new LMStudioProvider({ fetcher }).embed('text')).rejects.toThrow('LM Studio returned an empty embedding')
})
```

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
npm test -- server/services/embeddings/generateEmbedding.test.ts server/services/ai/lmStudio.test.ts
```

Expected: both files PASS.

```bash
git add server/services/ai/provider.ts server/services/ai/lmStudio.test.ts server/services/embeddings/generateEmbedding.ts server/services/embeddings/generateEmbedding.test.ts
git commit -m "feat: add validated embedding generation"
```

---

### Task 2: pgvector Migration and Supabase Access

**Files:**
- Create: `supabase/migrations/003_case_study_slide_embeddings.sql`
- Create: `supabase/migrations/003_case_study_slide_embeddings.test.ts`
- Modify: `server/services/supabase/types.ts`
- Modify: `server/services/supabase/db.ts`
- Modify: `server/services/supabase/db.test.ts`

**Interfaces:**
- Consumes: nullable slide embeddings and `queryEmbedding`, `matchThreshold`, `matchCount`.
- Produces: `VectorSlideMatch` and `dbMatchCaseStudySlides(queryEmbedding, matchThreshold?, matchCount?)`.

- [ ] **Step 1: Write failing migration contract and database helper tests**

Create `supabase/migrations/003_case_study_slide_embeddings.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(fileURLToPath(new URL('./003_case_study_slide_embeddings.sql', import.meta.url)), 'utf8')

describe('case-study slide embedding migration', () => {
  it('defines the 1024-dimensional column, cosine HNSW index, and matching RPC', () => {
    expect(sql).toMatch(/embedding\s+extensions\.vector\(1024\)/i)
    expect(sql).toMatch(/using\s+hnsw\s*\(embedding\s+extensions\.vector_cosine_ops\)/i)
    expect(sql).toMatch(/match_case_study_slides\s*\(/i)
    expect(sql).toContain('1 - (s.embedding <=> query_embedding)')
  })
})
```

Extend `server/services/supabase/db.test.ts` with a persistence expectation containing `embedding`, plus:

```ts
it('calls the slide match RPC with vector search controls', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: [{ slide_id: 'slide-1', similarity: 0.8 }], error: null })
  getSupabaseClient.mockReturnValue({ rpc })
  await expect(dbMatchCaseStudySlides([0.1, 0.2], 0.45, 20)).resolves.toEqual([
    expect.objectContaining({ slideId: 'slide-1', similarity: 0.8 }),
  ])
  expect(rpc).toHaveBeenCalledWith('match_case_study_slides', {
    query_embedding: [0.1, 0.2], match_threshold: 0.45, match_count: 20,
  })
})

it('throws when vector search is unavailable so the caller can fall back', async () => {
  getSupabaseClient.mockReturnValue(null)
  await expect(dbMatchCaseStudySlides([0.1])).rejects.toThrow('Supabase vector search is not configured')
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- supabase/migrations/003_case_study_slide_embeddings.test.ts server/services/supabase/db.test.ts
```

Expected: FAIL because the migration and `dbMatchCaseStudySlides` are absent.

- [ ] **Step 3: Add the migration**

Create `supabase/migrations/003_case_study_slide_embeddings.sql`:

```sql
create extension if not exists vector with schema extensions;

alter table public.case_study_slides
  add column if not exists embedding extensions.vector(1024);

create index if not exists idx_case_study_slides_embedding_hnsw
  on public.case_study_slides
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_case_study_slides(
  query_embedding extensions.vector(1024),
  match_threshold double precision default 0.45,
  match_count integer default 20
)
returns table (
  slide_id uuid,
  case_study_id uuid,
  case_study_title text,
  case_study_client text,
  case_study_industry text,
  slide_index integer,
  slide_title text,
  slide_content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select s.id, c.id, c.title, c.client, c.industry,
         s.slide_index, s.title, s.content,
         1 - (s.embedding <=> query_embedding) as similarity
  from public.case_study_slides s
  join public.case_studies c on c.id = s.case_study_id
  where s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) >= match_threshold
  order by s.embedding <=> query_embedding
  limit greatest(0, least(match_count, 100));
$$;
```

- [ ] **Step 4: Add database types and helpers**

Add `embedding: number[] | null` to `case_study_slides.Row`, exclude it from required inserts, and add the `match_case_study_slides` function signature to `Database.public.Functions`. In `db.ts`, export:

```ts
export interface VectorSlideMatch {
  slideId: string
  caseStudyId: string
  caseStudyTitle: string
  caseStudyClient: string
  caseStudyIndustry: string
  slideIndex: number
  slideTitle: string
  slideContent: string
  similarity: number
}

export async function dbMatchCaseStudySlides(
  queryEmbedding: number[], matchThreshold = 0.45, matchCount = 20,
): Promise<VectorSlideMatch[]> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase vector search is not configured')
  const { data, error } = await sb.rpc('match_case_study_slides', {
    query_embedding: queryEmbedding, match_threshold: matchThreshold, match_count: matchCount,
  })
  if (error) throw new Error(`Supabase vector search failed: ${error.message}`)
  return (data ?? []).map(row => ({
    slideId: row.slide_id,
    caseStudyId: row.case_study_id,
    caseStudyTitle: row.case_study_title,
    caseStudyClient: row.case_study_client,
    caseStudyIndustry: row.case_study_industry,
    slideIndex: row.slide_index,
    slideTitle: row.slide_title,
    slideContent: row.slide_content,
    similarity: row.similarity,
  }))
}
```

Extend `dbInsertCaseStudySlides` input with `embedding?: number[] | null` and include `embedding: slide.embedding ?? null` in every inserted row.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npm test -- supabase/migrations/003_case_study_slide_embeddings.test.ts server/services/supabase/db.test.ts
```

Expected: both files PASS.

```bash
git add supabase/migrations/003_case_study_slide_embeddings.sql supabase/migrations/003_case_study_slide_embeddings.test.ts server/services/supabase/types.ts server/services/supabase/db.ts server/services/supabase/db.test.ts
git commit -m "feat: add pgvector slide similarity search"
```

---

### Task 3: Generate Embeddings During Case-Study Indexing

**Files:**
- Modify: `server/services/case-studies/indexCaseStudy.ts`
- Modify: `server/services/case-studies/indexCaseStudy.test.ts`

**Interfaces:**
- Consumes: extracted slides and injected `generateSlideEmbedding`.
- Produces: slide insert rows containing `embedding: number[] | null` while retaining current indexing status semantics.

- [ ] **Step 1: Write failing indexing tests**

Add `generateSlideEmbedding` to `makeDeps()` and assert the success insert is:

```ts
expect(deps.insertSlides).toHaveBeenCalledWith(saved.id, [{
  slideIndex: 1,
  title: 'Overview',
  content: 'Overview\nEvidence',
  embedding: [0.1, 0.2],
}])
```

Add:

```ts
it('persists slide text with a null embedding when embedding generation fails', async () => {
  const deps = makeDeps()
  deps.generateSlideEmbedding.mockRejectedValue(new Error('embedding offline'))
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await expect(indexCaseStudy(input, deps)).resolves.toMatchObject({ status: 'indexed' })
  expect(deps.insertSlides).toHaveBeenCalledWith(saved.id, [expect.objectContaining({ embedding: null })])
  expect(deps.updateStatus).toHaveBeenCalledWith(saved.id, 'indexed')
  consoleError.mockRestore()
})
```

- [ ] **Step 2: Run the indexing tests and verify RED**

Run:

```bash
npm test -- server/services/case-studies/indexCaseStudy.test.ts
```

Expected: FAIL because the dependency and embedding field are not used.

- [ ] **Step 3: Implement recoverable per-slide embedding generation**

Import `generateSlideEmbedding`, add it to `IndexCaseStudyDependencies` and defaults, then replace the slide insertion mapping with:

```ts
const slides = await Promise.all(extracted.map(async (slide) => {
  let embedding: number[] | null = null
  try {
    embedding = await deps.generateSlideEmbedding({ title: slide.title, content: slide.content })
  } catch (error) {
    console.error(`Failed to embed case study slide ${slide.slideNumber}`, error)
  }
  return { slideIndex: slide.slideNumber, title: slide.title, content: slide.content, embedding }
}))
await deps.insertSlides(saved.id, slides)
```

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- server/services/case-studies/indexCaseStudy.test.ts server/services/supabase/db.test.ts
```

Expected: all focused tests PASS.

```bash
git add server/services/case-studies/indexCaseStudy.ts server/services/case-studies/indexCaseStudy.test.ts
git commit -m "feat: embed extracted case study slides"
```

---

### Task 4: Vector Recommendation Ranking and Keyword Fallback

**Files:**
- Modify: `app/types/recommendation.ts`
- Replace: `server/services/recommendations/findRelevantCaseStudies.ts`
- Create: `server/services/recommendations/findRelevantCaseStudies.test.ts`

**Interfaces:**
- Consumes: `RfpAnalysis`, loaded `CaseStudy[]`, query embedding generator, and slide matcher.
- Produces: `findRelevantCaseStudies(analysis, caseStudies, deps?): Promise<CaseStudyRecommendation[]>`.

- [ ] **Step 1: Write failing vector-ranking and fallback tests**

Create fixtures for two case studies and two vector match groups. Assert:

```ts
it('groups slide matches, calculates scores, and returns evidence excerpts', async () => {
  const deps = {
    generateEmbedding: vi.fn().mockResolvedValue([0.1]),
    matchSlides: vi.fn().mockResolvedValue([
      match({ caseStudyId: 'cs-1', slideIndex: 2, similarity: 0.9, slideContent: 'Cloud banking migration delivered.' }),
      match({ caseStudyId: 'cs-1', slideIndex: 3, similarity: 0.6, slideContent: 'Zero downtime cutover.' }),
      match({ caseStudyId: 'cs-2', slideIndex: 1, similarity: 0.7, slideContent: 'Retail platform.' }),
    ]),
  }
  const result = await findRelevantCaseStudies(analysis, caseStudies, deps)
  expect(result.map(item => item.caseStudyId)).toEqual(['cs-1', 'cs-2'])
  expect(result[0]).toMatchObject({ relevanceScore: 0.855, confidenceScore: 0.75, selected: true })
  expect(result[0]?.matchedSlideExcerpts[0]).toMatchObject({ slideIndex: 2, similarity: 0.9 })
  expect(result[0]?.reasons.join(' ')).toContain('Cloud banking migration')
})
```

Add one test where `generateEmbedding` rejects and one where `matchSlides` rejects. For both, assert a case study containing `cloud migration` in its slide ranks first with keyword-derived excerpts. Add a no-match test that returns `[]`, and an excerpt test that verifies whitespace normalization and the chosen maximum length.

- [ ] **Step 2: Run the recommendation tests and verify RED**

Run:

```bash
npm test -- server/services/recommendations/findRelevantCaseStudies.test.ts
```

Expected: FAIL because the current service throws `Recommendation engine not yet implemented`.

- [ ] **Step 3: Add the response evidence type**

Add to `app/types/recommendation.ts`:

```ts
export interface MatchedSlideExcerpt {
  slideIndex: number
  title: string
  excerpt: string
  similarity: number
}
```

Add `matchedSlideExcerpts: MatchedSlideExcerpt[]` to `CaseStudyRecommendation`.

- [ ] **Step 4: Implement vector grouping and deterministic scoring**

In `findRelevantCaseStudies.ts`, define injected dependencies using `generateEmbedding` and `dbMatchCaseStudySlides`. Build the query with `buildRecommendationQuery`, retain the top three matches per group, and calculate:

```ts
const relevanceScore = round(clamp(0.7 * similarities[0]! + 0.3 * mean(similarities)))
const confidenceScore = round(clamp(mean(similarities)))
```

Use a three-decimal `round`, `[0, 1]` clamp, a 280-character whitespace-normalized excerpt, stable recommendation ids `${analysis.rfpId}:${caseStudyId}`, descending score order, and `.slice(0, 5)`. Set only index zero to `selected: true`. Reasons must cite the strongest slide, add the same-industry reason case-insensitively, and mention query keywords actually present in retained evidence. Set `matchedRequirements` to the matching search keywords.

- [ ] **Step 5: Implement keyword fallback in the same service**

Wrap both query embedding and vector matching in one `try/catch` and call `keywordRecommendations` on any error. Normalize terms from search keywords, summary tokens of at least three characters, industry, required capabilities, and technical requirements. Score each case study from unique term occurrences across metadata and slides, retain only matching slides, normalize the raw score by the maximum score in the result set, and emit the same result shape/reason/excerpt rules. Return `[]` when no case study has a positive raw score.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
npm test -- server/services/recommendations/findRelevantCaseStudies.test.ts
```

Expected: vector ranking, embedding fallback, RPC fallback, no-match, and excerpt tests PASS.

```bash
git add app/types/recommendation.ts server/services/recommendations/findRelevantCaseStudies.ts server/services/recommendations/findRelevantCaseStudies.test.ts
git commit -m "feat: rank relevant case studies"
```

---

### Task 5: Real Recommendation API

**Files:**
- Replace: `server/api/rfps/[id]/recommendations.get.ts`
- Create: `server/api/rfps/[id]/recommendations.get.test.ts`

**Interfaces:**
- Consumes: router RFP id, persisted `RfpAnalysis`, indexed case studies, and the recommendation service.
- Produces: `{ analysis, recommendations }` or an H3 400/404 error.

- [ ] **Step 1: Write failing API orchestration tests**

Create a test using hoisted Nuxt globals and injected dependencies, following `analyze.post.test.ts`. Cover:

```ts
it('returns recommendations from persisted analysis and indexed case studies', async () => {
  const deps = makeDeps()
  await expect(handleRecommendations(event('rfp-1'), deps)).resolves.toEqual({ analysis, recommendations })
  expect(deps.findRelevant).toHaveBeenCalledWith(analysis, caseStudies)
})

it('rejects a missing RFP id', async () => {
  await expect(handleRecommendations(event(undefined), makeDeps())).rejects.toMatchObject({ statusCode: 400 })
})

it('rejects an RFP without persisted analysis', async () => {
  const deps = makeDeps()
  deps.getAnalysis.mockResolvedValue(null)
  await expect(handleRecommendations(event('rfp-1'), deps)).rejects.toMatchObject({ statusCode: 404 })
})
```

Also assert that a null case-study query is treated as an empty list, allowing the recommendation service to return `[]`.

- [ ] **Step 2: Run the endpoint tests and verify RED**

Run:

```bash
npm test -- server/api/rfps/[id]/recommendations.get.test.ts
```

Expected: FAIL because the endpoint does not export a handler with dependencies and returns mock recommendations.

- [ ] **Step 3: Replace the mock endpoint with the real handler**

Implement:

```ts
interface Dependencies {
  getAnalysis: typeof dbGetRfpAnalysis
  getCaseStudies: typeof dbGetCaseStudies
  findRelevant: typeof findRelevantCaseStudies
}

const defaultDependencies: Dependencies = {
  getAnalysis: dbGetRfpAnalysis,
  getCaseStudies: dbGetCaseStudies,
  findRelevant: findRelevantCaseStudies,
}

export async function handleRecommendations(
  event: Parameters<typeof getRouterParam>[0], deps: Dependencies = defaultDependencies,
) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })
  const analysis = await deps.getAnalysis(rfpId)
  if (!analysis) throw createError({ statusCode: 404, statusMessage: 'RFP analysis not found' })
  const caseStudies = (await deps.getCaseStudies()) ?? []
  const recommendations = await deps.findRelevant(analysis, caseStudies.filter(item => item.status === 'indexed'))
  return { analysis, recommendations }
}

export default defineEventHandler(event => handleRecommendations(event))
```

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- server/api/rfps/[id]/recommendations.get.test.ts
```

Expected: all endpoint tests PASS.

```bash
git add server/api/rfps/[id]/recommendations.get.ts server/api/rfps/[id]/recommendations.get.test.ts
git commit -m "feat: serve semantic case study recommendations"
```

---

### Task 6: Configuration and Full Verification

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: LM Studio server URL and separate chat/embedding model names.
- Produces: documented local configuration and verified repository state.

- [ ] **Step 1: Document independent model configuration**

Replace the LM Studio model lines in `.env.example` with:

```dotenv
LMSTUDIO_BASE_URL=http://localhost:1234
LMSTUDIO_CHAT_MODEL=google/gemma-4-e2b
LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF
```

- [ ] **Step 2: Run the complete automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all Vitest tests PASS, Nuxt typecheck exits 0, production build exits 0, and `git diff --check` prints nothing.

- [ ] **Step 3: Commit configuration**

```bash
git add .env.example
git commit -m "docs: configure LM Studio embedding model"
```

- [ ] **Step 4: Record live acceptance steps**

After applying `003_case_study_slide_embeddings.sql` to the configured Supabase project and loading both LM Studio models, verify:

```sql
select count(*) as embedded_slides
from public.case_study_slides
where embedding is not null;
```

Upload a PPTX, confirm `embedded_slides` increases by its extracted slide count, analyze an RFP, then request `GET /api/rfps/<rfp-id>/recommendations`. Expected: the response contains ranked recommendations with `relevanceScore`, non-empty `reasons`, and `matchedSlideExcerpts`; stopping the embedding model still returns keyword-based recommendations.
