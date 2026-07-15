# Live Demo Polish Design

## Goal
Make the AI RFP Copilot flow understandable without narration and reliably demonstrable in under five minutes.

## Scope
- Use UI-only sample cards when Supabase returns no case studies or RFPs; do not write demo data to Supabase.
- Standardize status labels: Pending, Processing, Indexed, Analyzed, Generated, Failed.
- Provide visible loading, empty, error, success, and next-step states for uploads, knowledge base, RFPs, recommendations, and proposal results.
- Replace automatic success redirects with explicit continue CTAs.
- Add responsive layouts that stack panels and grids on narrower laptop/projector viewports.
- Add a visible four-step progress path and contextual CTAs.

## Architecture
Create a small demo-data utility with typed sample case studies and RFPs, plus a reusable demo badge/status mapping. List pages use samples only when their real query completes with an empty list. Upload/analyze/generate actions retain real server behavior and display success confirmations with a clear next action.

The header exposes the current stage, pages use consistent status labels, and cards expose clear action text. The recommendations layout collapses from a five-column desktop split to a stacked flow. Existing real data and error handling remain authoritative.

## Testing
Tests cover empty-list demo fallback, status label mapping, upload success CTA, recommendation/proposal error states, and responsive/CTA render expectations. Full Vitest, typecheck, and production build verify the change.
