# AI Recommendation Explanations Design

## Goal

Make case-study recommendations explainable to presales users by asking the configured LM Studio chat model to produce a concise reason, matched requirements, and confidence for every vector-selected case study.

## Constraints

- pgvector remains the source of candidate selection, ranking, and `relevanceScore`.
- Use the existing LM Studio chat provider and strict JSON response mode.
- The model may only cite the supplied RFP requirements and matched slide excerpts.
- Explanation failures are not recoverable: the recommendation endpoint returns HTTP 503 with `AI explanation unavailable`.
- Keyword fallback remains available only for embedding or vector-search failures.

## Architecture

Add `SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER` and `buildRecommendationExplanationPrompt` to the AI prompts module. The prompt contains the RFP requirements, the already-ranked recommendation candidates, each candidate's matched slide excerpts, and an exact JSON schema:

```json
{
  "explanations": [
    {
      "caseStudyId": "string",
      "reason": "string",
      "matchedRequirements": ["string"],
      "confidence": 0
    }
  ]
}
```

The explanation service calls `AIProvider.complete`, removes optional code fences, parses JSON, and validates that every returned ID belongs to a candidate, every candidate is represented exactly once, `reason` is non-empty, requirements are strings drawn from the supplied RFP requirements, and confidence is a finite number in `[0, 1]`. Any provider, parsing, or validation error becomes a typed `RecommendationExplanationUnavailableError`.

`findRelevantCaseStudies` first performs its existing vector grouping/scoring (or keyword fallback for vector failures), then calls the explanation service with the final ranked candidates. It merges each explanation by ID: `relevanceScore` remains the vector/keyword score, `confidenceScore` becomes model confidence, `reasons` becomes `[reason]`, and `matchedRequirements` becomes the validated model requirements. It retains matched slide excerpts unchanged.

The RFP recommendations handler converts `RecommendationExplanationUnavailableError` into HTTP 503 with exactly `AI explanation unavailable`. This makes a missing/chat-model failure explicit instead of presenting lower-quality explanations as AI output.

## UI

`RecommendationCard` displays the first reason under a “Why recommended” label, matched requirements as chips, then each matched slide as an evidence card with slide title/index, excerpt, and similarity percentage. The confidence score remains visible and is labelled as AI confidence. Existing selection controls and relevance percentage remain unchanged.

## Testing

Tests cover prompt contents, strict parsing/validation, successful merge of AI explanations without changing vector relevance score, rejection for malformed or incomplete responses, service failure propagation, API 503 mapping, and UI rendering of reason, requirements, excerpts, and confidence.

## Out of scope

- Re-ranking candidates with an LLM.
- Persisting explanation text.
- Retrying or background generation.
- Fallback explanations when the chat model is unavailable.
