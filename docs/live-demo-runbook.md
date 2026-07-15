# Live Demo Runbook

## Presenter flow (under five minutes)

1. Open **Case Studies** and show an indexed case study; upload a PPTX only if there is no real case study already available.
2. Open **RFP Documents**, upload a text-bearing PDF/DOCX, then click **Analyze RFP**.
3. Open **View Recommendations** and explain the vector relevance score, AI reason, matched requirements, evidence slides, and AI confidence.
4. Select at least one case study and click **Generate Proposal**.
5. Click **Download PPTX** on the result page.

Demo cards on empty list pages only explain the UI; they do not create an RFP analysis or support the recommendation endpoint.

## Presenter recovery

| Symptom | Explain / do |
|---|---|
| `RFP analysis not found` | You opened a UI-only demo RFP. Return to RFPs and use a real analyzed RFP. |
| `AI explanation unavailable` | Start/load the LM Studio chat model, then refresh recommendations. |
| No vector-like recommendation | Confirm the embedding model is loaded and slides have non-null embeddings; keyword fallback may still return matches. |
| No recommendations | Select an RFP with requirements related to an indexed case study, or upload an appropriate deck. |
| Proposal still processing/failed | Wait for completion; if failed, return to recommendations, confirm at least one selected case study, and generate again. |

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
