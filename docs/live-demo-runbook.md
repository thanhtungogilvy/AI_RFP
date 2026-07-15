# Live Demo Runbook

## Prerequisites

- Supabase migrations `001`, `002`, and `003` have been applied.
- Private buckets `case-studies`, `rfps`, and `proposals` exist.
- `.env` contains Supabase credentials, `LMSTUDIO_CHAT_MODEL`, and `LMSTUDIO_EMBEDDING_MODEL=gpustack/bge-m3-GGUF`.
- LM Studio has both the chat and embedding models loaded.

## Five-minute flow

1. Open **Case Studies** and select **Upload Case Study**.
2. Upload a text-bearing PPTX and wait for the visible **Indexed** confirmation. This extracts slides and stores one vector per slide.
3. Open **RFP Documents**, select **Upload RFP**, complete the required title/client fields, then select **Analyze RFP**.
4. Open **AI Recommendations**. Confirm each card displays the vector relevance score, AI reason, matched requirements, evidence excerpts, and AI confidence.
5. Select one or more case studies, choose **Generate Proposal**, then select **Download PPTX** from the result page.

## Failure messages

- `Supabase vector search is not configured`: check Supabase credentials and migration `003`.
- `AI explanation unavailable`: load the configured LM Studio chat model and retry.
- A slide can be indexed with `embedding = null` if embedding generation fails; recommendation requests use keyword fallback if semantic search is unavailable.
- Demo cards on empty list pages are UI-only. They are not a substitute for the real upload-to-proposal flow.
