# Real PPTX Case Study Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse uploaded PPTX files into ordered slide text, persist the source file and one row per slide in Supabase, and show indexed content in the Knowledge Base.

**Architecture:** A pure `extractSlidesFromPptx(Buffer)` service reads OOXML with JSZip and fast-xml-parser. A testable case-study indexing service coordinates storage, extraction, and database state changes; the Nuxt endpoint handles multipart/HTTP concerns, while a small UI utility selects extracted preview content.

**Tech Stack:** Nuxt 4.4, TypeScript 5.9, Supabase JS 2.110, JSZip, fast-xml-parser, Vitest 4, pptxgenjs 4 fixture generation

## Global Constraints

- Accept only `.pptx` filenames, case-insensitively, with the standard PPTX MIME type or `application/octet-stream`.
- Validate the OOXML package rather than trusting extension or MIME alone.
- `ExtractedSlide` is exactly `{ slideNumber: number; title: string; content: string }` and slide numbers start at 1.
- Preserve every slide row when at least one slide in the deck has extractable text.
- Treat a deck with no slides or no extractable text anywhere as empty.
- Keep the uploaded file and case study row with status `error` after an indexing failure.
- Do not add OCR, image extraction, notes extraction, background jobs, or retry UI.
- A successful upload response means storage, slide persistence, and the `indexed` status update all completed.

## File Structure

- Modify `package.json`: add extraction dependencies, Vitest, and test/typecheck scripts.
- Modify `package-lock.json`: lock the new dependency graph through npm.
- Create `vitest.config.ts`: use the Node test environment and project aliases.
- Modify `server/services/pptx/extractSlides.ts`: validate OOXML, extract ordered text, and detect titles.
- Create `server/services/pptx/extractSlides.test.ts`: real-PPTX and malformed-package coverage.
- Modify `server/services/supabase/db.ts`: persist file path, insert slide batches, and update status.
- Create `server/services/case-studies/indexCaseStudy.ts`: coordinate storage, extraction, and persistence through injected dependencies.
- Create `server/services/case-studies/indexCaseStudy.test.ts`: verify successful sequencing and error-state behavior.
- Modify `server/api/case-studies/upload.post.ts`: validate multipart input and call the indexing service.
- Create `app/utils/caseStudyPreview.ts`: select summary or first extracted slide content.
- Create `app/utils/caseStudyPreview.test.ts`: verify preview selection.
- Modify `app/components/case-studies/CaseStudyCard.vue`: render extracted preview content.
- Modify `app/pages/case-studies/upload.vue`: report indexing completion accurately.

---

### Task 1: PPTX Parser and Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Modify: `server/services/pptx/extractSlides.ts`
- Create: `server/services/pptx/extractSlides.test.ts`

**Interfaces:**
- Consumes: a Node.js `Buffer` containing the entire upload.
- Produces: `extractSlidesFromPptx(buffer: Buffer): Promise<ExtractedSlide[]>` and `ExtractedSlide { slideNumber: number; title: string; content: string }`.

- [ ] **Step 1: Install parser and test dependencies and add scripts**

Run:

```bash
npm install jszip fast-xml-parser
npm install --save-dev vitest@^4.1.6
```

Update the `scripts` object in `package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "nuxt typecheck"
}
```

Expected: `package.json` contains `jszip`, `fast-xml-parser`, and Vitest; `package-lock.json` is updated.

- [ ] **Step 2: Configure Vitest for Node services and app aliases**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Write failing parser tests using a real PPTX fixture**

Create `server/services/pptx/extractSlides.test.ts` with tests that generate buffers using `pptxgenjs`, plus JSZip-built invalid packages:

```ts
import JSZip from 'jszip'
import pptxgen from 'pptxgenjs'
import { describe, expect, it } from 'vitest'
import { extractSlidesFromPptx } from './extractSlides'

async function makeDeck(slides: Array<Array<{ text: string; options?: Record<string, unknown> }>>) {
  const pptx = new pptxgen()
  for (const shapes of slides) {
    const slide = pptx.addSlide()
    for (const shape of shapes) slide.addText(shape.text, shape.options ?? {})
  }
  return Buffer.from(await pptx.write({ outputType: 'arraybuffer' }))
}

describe('extractSlidesFromPptx', () => {
  it('extracts text in one-based slide order and detects a fallback title', async () => {
    const buffer = await makeDeck([
      [{ text: 'Overview', options: { x: 1, y: 1, w: 8, h: 1 } }, { text: 'First result', options: { x: 1, y: 2, w: 8, h: 1 } }],
      [{ text: 'Impact', options: { x: 1, y: 1, w: 8, h: 1 } }, { text: '42% faster', options: { x: 1, y: 2, w: 8, h: 1 } }],
    ])

    await expect(extractSlidesFromPptx(buffer)).resolves.toEqual([
      { slideNumber: 1, title: 'Overview', content: 'Overview\nFirst result' },
      { slideNumber: 2, title: 'Impact', content: 'Impact\n42% faster' },
    ])
  })

  it('retains a text-empty slide when another slide has text', async () => {
    const buffer = await makeDeck([[], [{ text: 'Evidence' }]])
    const slides = await extractSlidesFromPptx(buffer)
    expect(slides).toHaveLength(2)
    expect(slides[0]).toEqual({ slideNumber: 1, title: '', content: '' })
  })

  it('rejects corrupt zip data', async () => {
    await expect(extractSlidesFromPptx(Buffer.from('not-a-zip'))).rejects.toThrow('Invalid PPTX file')
  })

  it('rejects a zip that is not an OOXML presentation', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hello')
    await expect(extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow('Invalid PPTX package')
  })

  it('rejects a deck with no extractable text', async () => {
    await expect(extractSlidesFromPptx(await makeDeck([[]]))).rejects.toThrow('PPTX contains no extractable text')
  })
})
```

Add one focused OOXML fixture test whose shape has `<p:ph type="title"/>` and assert that title text wins over the first body text shape.

- [ ] **Step 4: Run the parser tests and verify the placeholder fails**

Run:

```bash
npm test -- server/services/pptx/extractSlides.test.ts
```

Expected: FAIL because `extractSlidesFromPptx` throws `PPTX extraction not yet implemented`.

- [ ] **Step 5: Implement OOXML validation and extraction**

Replace `server/services/pptx/extractSlides.ts` with a focused implementation using these internal units:

```ts
import JSZip, { type JSZipObject } from 'jszip'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface ExtractedSlide {
  slideNumber: number
  title: string
  content: string
}

type OrderedNode = Record<string, unknown>

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: false,
  processEntities: { enabled: true, maxEntityCount: 50, maxExpandedLength: 50_000 },
  maxNestedTags: 200,
})

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function slideNumber(entry: JSZipObject): number | null {
  const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(entry.name)
  return match ? Number(match[1]) : null
}

function textFromNode(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(textFromNode)
  if (!node || typeof node !== 'object') return []
  return Object.entries(node as OrderedNode).flatMap(([key, value]) => {
    if (key === 'a:t') return textFromNode(value)
    if (key === '#text' && typeof value === 'string') {
      const text = normalizeText(value)
      return text ? [text] : []
    }
    return textFromNode(value)
  })
}

function parseSlide(xml: string, number: number): ExtractedSlide {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) throw new Error(`Invalid slide XML at slide ${number}`)
  const ordered = parser.parse(xml) as OrderedNode[]
  const shapes = collectShapeNodes(ordered)
  const blocks = shapes.map(shape => textFromNode(shape).join(' ')).filter(Boolean)
  const titleShape = shapes.find(isTitlePlaceholder)
  return {
    slideNumber: number,
    title: titleShape ? textFromNode(titleShape).join(' ') : (blocks[0] ?? ''),
    content: blocks.join('\n'),
  }
}
```

Implement `collectShapeNodes()` to recursively return `p:sp` nodes in document order and `isTitlePlaceholder()` to recursively find a `p:ph` attribute whose `@_type` is `title` or `ctrTitle`. In `extractSlidesFromPptx`, catch JSZip load errors as `Invalid PPTX file`, verify the three required package conditions, sort entries by parsed number, parse each XML string, and reject when `slides.every(slide => !slide.content)`.

- [ ] **Step 6: Run parser tests and typecheck**

Run:

```bash
npm test -- server/services/pptx/extractSlides.test.ts
npm run typecheck
```

Expected: parser tests PASS; typecheck exits 0.

- [ ] **Step 7: Commit the parser deliverable**

```bash
git add package.json package-lock.json vitest.config.ts server/services/pptx/extractSlides.ts server/services/pptx/extractSlides.test.ts
git commit -m "feat: extract text from PPTX slides"
```

---

### Task 2: Supabase Persistence Helpers

**Files:**
- Modify: `server/services/supabase/db.ts`

**Interfaces:**
- Consumes: `caseStudyId: string`, `filePath: string`, and `slides: ExtractedSlide[]` mapped by the caller.
- Produces: `dbUpdateCaseStudyFilePath(id, filePath)`, `dbInsertCaseStudySlides(caseStudyId, slides)`, and the existing `dbUpdateCaseStudyStatus`/`dbGetCaseStudyById` functions.

- [ ] **Step 1: Add typed persistence helper signatures**

Add these exports to `server/services/supabase/db.ts`:

```ts
export async function dbUpdateCaseStudyFilePath(id: string, filePath: string): Promise<void>

export async function dbInsertCaseStudySlides(
  caseStudyId: string,
  slides: Array<Pick<CaseStudySlide, 'slideIndex' | 'title' | 'content'>>
): Promise<void>
```

The insert maps each slide to:

```ts
{
  case_study_id: caseStudyId,
  slide_index: slide.slideIndex,
  title: slide.title,
  content: slide.content,
  tags: [],
}
```

- [ ] **Step 2: Typecheck to expose incomplete implementations**

Run:

```bash
npm run typecheck
```

Expected: FAIL until both declared functions return and handle Supabase errors.

- [ ] **Step 3: Implement the helpers with existing error conventions**

Use `getSupabaseClient()`, return immediately when unconfigured, call `.update({ file_path: filePath }).eq('id', id)` for the path, and call `.insert(rows)` once for all slide rows. For a non-null Supabase error, throw `createError({ statusCode: 500, statusMessage: error.message })` exactly as neighboring helpers do.

- [ ] **Step 4: Run typecheck and all tests**

Run:

```bash
npm run typecheck
npm test
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit persistence helpers**

```bash
git add server/services/supabase/db.ts
git commit -m "feat: persist case study slide indexing data"
```

---

### Task 3: Testable Indexing Workflow and Upload Endpoint

**Files:**
- Create: `server/services/case-studies/indexCaseStudy.ts`
- Create: `server/services/case-studies/indexCaseStudy.test.ts`
- Modify: `server/api/case-studies/upload.post.ts`

**Interfaces:**
- Consumes: `{ buffer, fileName, title, client, industry }` and injected storage/database/extraction functions.
- Produces: `indexCaseStudy(input, deps): Promise<CaseStudy>`; the endpoint returns that indexed `CaseStudy`.

- [ ] **Step 1: Write failing orchestration tests**

Create `server/services/case-studies/indexCaseStudy.test.ts` with `vi.fn()` dependencies. The success test must assert the exact calls and one-based mapping:

```ts
expect(deps.uploadFile).toHaveBeenCalledWith(
  'case-studies',
  `${saved.id}/${input.fileName}`,
  input.buffer,
  PPTX_MIME,
)
expect(deps.insertSlides).toHaveBeenCalledWith(saved.id, [
  { slideIndex: 1, title: 'Overview', content: 'Overview\nEvidence' },
])
expect(deps.updateStatus).toHaveBeenLastCalledWith(saved.id, 'indexed')
expect(result.status).toBe('indexed')
```

Add failure tests where `extractSlides` rejects and where `insertSlides` rejects. Both must assert `updateStatus(saved.id, 'error')`, preserve the original thrown error, and never report `indexed`. Add a best-effort test where the `error` status update also rejects and the original extraction error still wins.

- [ ] **Step 2: Run orchestration tests and verify the missing module fails**

Run:

```bash
npm test -- server/services/case-studies/indexCaseStudy.test.ts
```

Expected: FAIL because `indexCaseStudy.ts` does not exist.

- [ ] **Step 3: Implement dependency-injected indexing orchestration**

Create the service with explicit contracts:

```ts
export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export interface IndexCaseStudyInput {
  buffer: Buffer
  fileName: string
  title: string
  client: string
  industry: string
}

export interface IndexCaseStudyDependencies {
  insertCaseStudy: typeof dbInsertCaseStudy
  uploadFile: typeof uploadFile
  updateFilePath: typeof dbUpdateCaseStudyFilePath
  extractSlides: typeof extractSlidesFromPptx
  insertSlides: typeof dbInsertCaseStudySlides
  updateStatus: typeof dbUpdateCaseStudyStatus
  getCaseStudy: typeof dbGetCaseStudyById
}
```

`indexCaseStudy` creates the `processing` record first, derives `${saved.id}/${fileName}`, uploads and stores the path, extracts all slides, maps `slideNumber` to `slideIndex`, inserts one batch, sets `indexed`, then refetches and returns the completed record. Wrap all work after record creation in `try/catch`; on failure, await `updateStatus(id, 'error')` inside its own `try/catch`, log only the secondary status-update failure, and rethrow the original error.

- [ ] **Step 4: Run orchestration tests**

Run:

```bash
npm test -- server/services/case-studies/indexCaseStudy.test.ts
```

Expected: PASS for success sequencing and all failure-state cases.

- [ ] **Step 5: Write endpoint validation tests around an exported validator**

Export a pure helper from `upload.post.ts`:

```ts
export function validatePptxUpload(fileName: string, contentType?: string): void
```

Test that it accepts `.pptx`/`.PPTX` with the standard MIME or `application/octet-stream`, and throws a 400 error for `.pdf`, a missing content type, or `application/pdf`. Keep these tests in `server/api/case-studies/upload.post.test.ts` and stub Nuxt's `createError` global with `vi.stubGlobal`.

- [ ] **Step 6: Update the endpoint to validate and invoke the workflow**

The endpoint must:

```ts
validatePptxUpload(filePart.filename, filePart.type)

if (!isSupabaseConfigured()) {
  throw createError({
    statusCode: 503,
    statusMessage: 'Case study indexing requires Supabase configuration',
  })
}

return await indexCaseStudy({
  buffer: filePart.data,
  fileName: filePart.filename,
  title: titlePart || filePart.filename.replace(/\.pptx$/i, ''),
  client: clientPart || 'Unknown Client',
  industry: industryPart || '',
})
```

Normalize known parser validation/empty-deck errors into HTTP 400. Normalize unexpected errors into HTTP 500 while preserving existing `createError` status codes. Remove the mock success response so the endpoint cannot claim indexing without persistence.

- [ ] **Step 7: Run focused tests, all tests, and typecheck**

Run:

```bash
npm test -- server/services/case-studies/indexCaseStudy.test.ts server/api/case-studies/upload.post.test.ts
npm test
npm run typecheck
```

Expected: all tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit the complete upload workflow**

```bash
git add server/services/case-studies/indexCaseStudy.ts server/services/case-studies/indexCaseStudy.test.ts server/api/case-studies/upload.post.ts server/api/case-studies/upload.post.test.ts
git commit -m "feat: index uploaded case study presentations"
```

---

### Task 4: Knowledge Base Content Preview and Clear Upload Status

**Files:**
- Create: `app/utils/caseStudyPreview.ts`
- Create: `app/utils/caseStudyPreview.test.ts`
- Modify: `app/components/case-studies/CaseStudyCard.vue`
- Modify: `app/pages/case-studies/upload.vue`

**Interfaces:**
- Consumes: a `CaseStudy` returned by the existing list endpoint.
- Produces: `getCaseStudyPreview(caseStudy: CaseStudy): string` and truthful upload/indexing copy.

- [ ] **Step 1: Write failing preview tests**

Create `app/utils/caseStudyPreview.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { CaseStudy } from '~/types/case-study'
import { getCaseStudyPreview } from './caseStudyPreview'

const base = {
  id: 'cs-1', title: 'Example', client: 'Client', industry: '', tags: [],
  fileName: 'example.pptx', uploadedAt: '2026-07-14T00:00:00Z', status: 'indexed',
} satisfies Omit<CaseStudy, 'summary' | 'slides'>

it('prefers an explicit summary', () => {
  expect(getCaseStudyPreview({ ...base, summary: 'Summary', slides: [{ slideIndex: 1, title: 'Title', content: 'Slide content', tags: [] }] })).toBe('Summary')
})

it('falls back to the first non-empty extracted slide', () => {
  expect(getCaseStudyPreview({ ...base, summary: '', slides: [
    { slideIndex: 1, title: '', content: '', tags: [] },
    { slideIndex: 2, title: 'Impact', content: 'Reduced cost by 20%', tags: [] },
  ] })).toBe('Reduced cost by 20%')
})
```

- [ ] **Step 2: Run the preview test and verify it fails**

Run:

```bash
npm test -- app/utils/caseStudyPreview.test.ts
```

Expected: FAIL because `caseStudyPreview.ts` does not exist.

- [ ] **Step 3: Implement and use the preview selector**

Create `app/utils/caseStudyPreview.ts`:

```ts
import type { CaseStudy } from '~/types/case-study'

export function getCaseStudyPreview(caseStudy: CaseStudy): string {
  return caseStudy.summary.trim()
    || caseStudy.slides.find(slide => slide.content.trim())?.content.trim()
    || 'No extractable slide text'
}
```

Import it in `CaseStudyCard.vue`, replace `{{ caseStudy.summary }}` with `{{ getCaseStudyPreview(caseStudy) }}`, and retain the existing two-line clamp and persisted slide count.

- [ ] **Step 4: Make upload completion copy truthful**

In `app/pages/case-studies/upload.vue`, change the success message to:

```html
Presentation indexed successfully! Redirecting to the knowledge base...
```

Keep the dropzone loading for the existing `upload()` promise duration; no polling or retry UI is added.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
npm test -- app/utils/caseStudyPreview.test.ts
npm test
npm run typecheck
```

Expected: all tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit UI visibility changes**

```bash
git add app/utils/caseStudyPreview.ts app/utils/caseStudyPreview.test.ts app/components/case-studies/CaseStudyCard.vue app/pages/case-studies/upload.vue
git commit -m "feat: show indexed case study content"
```

---

### Task 5: Full Verification and Documentation Alignment

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: all completed parser, workflow, database, and UI changes.
- Produces: verified build output and documentation that no longer describes extraction as pending.

- [ ] **Step 1: Update project documentation to match implemented behavior**

In `README.md`, document that case-study PPTX extraction is real, synchronous, and requires configured Supabase. In `docs/architecture.md`, replace the parser and upload queue markers with the JSZip/fast-xml-parser synchronous flow. In `CHANGELOG.md`, move real PPTX extraction from planned work into the current implemented section without claiming manual Supabase verification unless it was actually performed.

- [ ] **Step 2: Run the complete automated verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests PASS; typecheck exits 0; Nuxt production build exits 0.

- [ ] **Step 3: Inspect the final diff for scope and generated artifacts**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff
```

Expected: no whitespace errors, no credentials, no generated PPTX fixtures, and only files named in this plan plus dependency lock changes.

- [ ] **Step 4: Perform conditional Supabase acceptance verification**

If `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are configured, start the Nuxt app, upload a real text-bearing PPTX, and verify:

```sql
select id, file_path, status from case_studies order by created_at desc limit 1;
select case_study_id, slide_index, title, content from case_study_slides where case_study_id = '<verified-id>' order by slide_index;
```

Expected: one new case study has a non-null storage path and status `indexed`; its slide rows are one-based and contain extracted text. If credentials are absent, record that this manual check was not run and rely only on automated evidence.

- [ ] **Step 5: Commit documentation and final verification state**

```bash
git add README.md docs/architecture.md CHANGELOG.md
git commit -m "docs: document PPTX case study indexing"
```

