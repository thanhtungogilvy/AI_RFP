# Real PPTX Case Study Extraction Design

## Goal

Replace the case study upload flow's extraction placeholder with real, server-side PPTX text extraction. A successful upload stores the original presentation, persists one database row per slide, and exposes the indexed slide content on the Knowledge Base page.

## Scope

This change extracts visible text from `.pptx` slide XML. It does not extract images, speaker notes, animations, embedded documents, charts' backing data, or text contained only inside images. It does not add background jobs or retry controls.

## Technical Approach

Use `jszip` to read the uploaded PPTX as an Office Open XML ZIP archive and `fast-xml-parser` to parse slide XML while preserving node order and attributes. This is a pure Node.js implementation suitable for the existing Nuxt server and avoids requiring Python, LibreOffice, or another system runtime.

`server/services/pptx/extractSlides.ts` owns PPTX validation and extraction only. It has no Supabase dependency and exposes:

```ts
interface ExtractedSlide {
  slideNumber: number
  title: string
  content: string
}

function extractSlidesFromPptx(buffer: Buffer): Promise<ExtractedSlide[]>
```

Slide numbers are one-based. The upload API maps `slideNumber` directly to the existing `case_study_slides.slide_index` column, so stored indexes match the slide numbers users see in PowerPoint.

## PPTX Validation and Extraction

The upload endpoint accepts filenames ending in `.pptx`, case-insensitively. It accepts the standard PPTX MIME type and `application/octet-stream`, because browsers and clients may use the generic binary MIME type. Extension and MIME checks provide an early error but are not the only validation.

The extraction service loads the buffer as a ZIP and verifies that it contains:

- `[Content_Types].xml`
- `ppt/presentation.xml`
- at least one `ppt/slides/slideN.xml` entry

Slide entries are sorted by the numeric `N`, not lexicographically. Each slide XML file is validated and parsed with attributes and document order preserved. Text runs are normalized by trimming surrounding whitespace, collapsing redundant internal whitespace, and removing empty runs. Runs belonging to the same text block are joined naturally; distinct text blocks are separated by newlines.

Title detection uses the following precedence:

1. Text in a shape whose placeholder type is `title` or `ctrTitle`.
2. The first non-empty text shape on the slide.
3. An empty string when the slide itself has no text.

The complete slide text, including detected title text, remains in `content`. This avoids losing searchable text and keeps the parser contract straightforward.

An empty presentation is either a PPTX with no slide entries or a presentation in which every slide has no extractable text. Individual text-empty slides are retained as rows when another slide contains text; their title and content are empty strings.

## Upload and Persistence Flow

`server/api/case-studies/upload.post.ts` performs indexing synchronously so that a successful HTTP response means the case study is fully indexed:

1. Read multipart data and validate the file field, extension, and MIME type.
2. Insert one `case_studies` row with status `processing`.
3. Upload the original buffer to the private `case-studies` Supabase Storage bucket under a path derived from the database-generated case study ID.
4. Persist that object path to `case_studies.file_path`.
5. Extract all slides in memory.
6. Insert all `case_study_slides` rows in one batch.
7. Update the case study status to `indexed`.
8. Fetch and return the case study with its ordered slides.

Database helpers will be added for updating `file_path`, inserting a slide batch, and retrieving the completed record. The parser's output is mapped to database rows in the API layer, preserving separation between file parsing and persistence.

No partial slide set is intentionally persisted: extraction completes before the batch insert begins. If the database rejects the slide batch, the case study remains available but is marked `error`.

When Supabase is not configured, the existing mock fallback remains available, but it must not claim that a case study was indexed or return fabricated extracted slides. Real persistence acceptance criteria require a configured Supabase instance.

## Error Handling

If a case study row has been created and any later indexing step fails, the endpoint makes a best-effort status update to `error`. The original file and database record are retained when storage already succeeded, supporting diagnosis and a future retry feature.

Expected client errors return HTTP 400 with a clear message:

- missing file field
- invalid filename extension or MIME type
- corrupt or non-ZIP data
- ZIP that is not a PPTX package
- PPTX with no slides
- PPTX with no extractable text anywhere

Unexpected extraction, storage, or database failures return HTTP 500 without exposing credentials or internal stack traces. Failure to perform the best-effort `error` status update is logged without replacing the original error.

## UI Behavior

The upload page remains in its loading state for storage, extraction, and persistence. It shows success only when the API returns the fully indexed case study, and the success copy states that indexing completed rather than merely that upload completed. API errors remain visible through the existing composable error state.

The Knowledge Base uses its existing status badge to show `Processing`, `Indexed`, or `Error`. Indexed cards show the actual persisted slide count and preview the first non-empty extracted slide content when the case study's summary is empty. This makes newly indexed material visible without adding a new detail page. Failed records remain visible with status `Error` and no retry action in this scope.

## Testing

Unit tests for the extraction service cover:

- a real PPTX fixture with multiple slides
- title placeholder detection
- fallback title detection
- fragmented text runs and text-block ordering
- an individual image-only or text-empty slide within an otherwise valid deck
- a deck with no extractable text
- corrupt ZIP input
- a valid ZIP that is not a PPTX

The happy-path fixture is generated with the repository's existing `pptxgenjs` dependency so the test exercises a real PPTX package. Focused XML fixtures may supplement it for placeholder and run-order edge cases.

Upload-flow tests verify the operation sequence and outcomes:

- success: `processing` record, storage upload, file path update, slide batch insert, `indexed`, and response containing slides
- extraction failure: best-effort update to `error` and an appropriate HTTP error
- persistence failure: best-effort update to `error` with no false success response
- invalid file type: rejection before creating storage or database data

Verification includes the automated tests, TypeScript checking, and a Nuxt production build. A manual end-to-end upload against Supabase is performed only when valid local Supabase configuration is available; otherwise that environmental limitation is reported explicitly.

## Acceptance Criteria

- Uploading a valid, text-bearing PPTX creates exactly one case study record.
- The original PPTX is present in Supabase Storage and its path is stored on the record.
- One `case_study_slides` row is saved for every slide, in one-based slide order.
- The case study becomes `indexed` only after slide persistence succeeds.
- Invalid, empty, and failed extractions produce clear errors and do not produce a false indexed state.
- The Knowledge Base page displays the indexed status, extracted slide count, and a preview of extracted content supplied by its existing case study query.
