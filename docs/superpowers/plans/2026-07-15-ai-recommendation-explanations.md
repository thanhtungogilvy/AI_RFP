# AI Recommendation Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict LM Studio explanations to vector-ranked case-study recommendations and surface their evidence in the UI.

**Architecture:** A focused explanation service builds a constrained prompt from ranked candidates and validates its JSON. The recommendation service merges valid explanations without changing vector scores, while the API maps any explanation-provider/validation failure to a clear 503.

**Tech Stack:** Nuxt 4, TypeScript, Vitest, LM Studio OpenAI-compatible chat completions

## Global Constraints

- pgvector remains the candidate-selection and relevance-score source.
- Explanation failures return HTTP 503 `AI explanation unavailable`.
- Explanations can only cite supplied RFP requirements and slide excerpts.
- Do not persist explanations or use an LLM to re-rank candidates.

---

### Task 1: Prompt and Strict Explanation Service

**Files:**
- Modify: `server/services/ai/prompts.ts`
- Create: `server/services/recommendations/explainRecommendations.ts`
- Create: `server/services/recommendations/explainRecommendations.test.ts`

**Interfaces:**
- Produces `explainRecommendations(analysis, recommendations, ai?): Promise<RecommendationExplanation[]>` and `RecommendationExplanationUnavailableError`.

- [ ] **Step 1: Write failing tests**

Test a valid JSON response, invalid JSON, duplicate/missing IDs, unrecognised requirements, and confidence outside `[0,1]`:

```ts
await expect(explainRecommendations(analysis, recommendations, ai)).resolves.toEqual([
  { caseStudyId: 'cs-1', reason: 'Banking cloud migration evidence.', matchedRequirements: ['Cloud migration'], confidence: 0.82 },
])
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- server/services/recommendations/explainRecommendations.test.ts`

Expected: FAIL because the service is absent.

- [ ] **Step 3: Implement prompt and validator**

Add an explainer system prompt and a prompt builder with serialized requirements/candidate excerpts. Implement strict parse/validation and normalize all provider, parse, and validation failures to `RecommendationExplanationUnavailableError('AI explanation unavailable')`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- server/services/recommendations/explainRecommendations.test.ts`

Expected: PASS.

```bash
git add server/services/ai/prompts.ts server/services/recommendations/explainRecommendations.ts server/services/recommendations/explainRecommendations.test.ts
git commit -m "feat: generate recommendation explanations"
```

### Task 2: Recommendation Merge and 503 API Contract

**Files:**
- Modify: `server/services/recommendations/findRelevantCaseStudies.ts`
- Modify: `server/services/recommendations/findRelevantCaseStudies.test.ts`
- Modify: `server/api/rfps/[id]/recommendations.get.ts`
- Create: `server/api/rfps/[id]/recommendations.get.test.ts`

**Interfaces:**
- Consumes the explanation service after vector/keyword ranking.
- Produces unchanged relevance score, AI `reason`, `matchedRequirements`, and `confidenceScore`; API returns 503 for unavailable explanations.

- [ ] **Step 1: Write failing merge and API tests**

Assert vector `relevanceScore` remains `0.9`, AI confidence becomes `0.82`, `reasons` is the model reason, and the handler maps the typed error to `{ statusCode: 503, statusMessage: 'AI explanation unavailable' }`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- server/services/recommendations/findRelevantCaseStudies.test.ts server/api/rfps/[id]/recommendations.get.test.ts`

Expected: FAIL because explanation output is not merged or mapped.

- [ ] **Step 3: Implement merge and mapping**

Inject `explainRecommendations`; call it after scoring; replace only `reasons`, `matchedRequirements`, and `confidenceScore`. Catch `RecommendationExplanationUnavailableError` in the endpoint and throw the prescribed 503.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- server/services/recommendations/findRelevantCaseStudies.test.ts server/api/rfps/[id]/recommendations.get.test.ts`

Expected: PASS.

```bash
git add server/services/recommendations/findRelevantCaseStudies.ts server/services/recommendations/findRelevantCaseStudies.test.ts server/api/rfps/[id]/recommendations.get.ts server/api/rfps/[id]/recommendations.get.test.ts
git commit -m "feat: explain vector recommendations"
```

### Task 3: Recommendation Evidence UI and Verification

**Files:**
- Modify: `app/components/recommendations/RecommendationCard.vue`
- Create: `app/components/recommendations/RecommendationCard.test.ts`

- [ ] **Step 1: Write failing UI test**

Render a recommendation and assert “Why recommended”, its reason, matched-requirement chips, slide title/excerpt, similarity, and “AI confidence” are visible.

- [ ] **Step 2: Verify RED**

Run: `npm test -- app/components/recommendations/RecommendationCard.test.ts`

Expected: FAIL because evidence sections are absent.

- [ ] **Step 3: Implement the evidence sections**

Render `recommendation.reasons[0]`, loop `matchedRequirements`, and loop `matchedSlideExcerpts`; keep the existing selection checkbox and relevance score.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.

```bash
git add app/components/recommendations/RecommendationCard.vue app/components/recommendations/RecommendationCard.test.ts
git commit -m "feat: show recommendation evidence"
```
