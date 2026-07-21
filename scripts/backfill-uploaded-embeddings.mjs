import { createClient } from '@supabase/supabase-js'

const batchSize = 25
const concurrency = 4
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'LMSTUDIO_BASE_URL', 'LMSTUDIO_EMBEDDING_MODEL']
const missing = required.filter(name => !process.env[name])
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
if (!process.argv.includes('--apply')) throw new Error('Refusing to write embeddings without --apply')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const baseUrl = process.env.LMSTUDIO_BASE_URL.replace(/\/+$/, '')
const maxChunkCharacters = 12_000

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function splitTextIntoChunks(text) {
  const paragraphs = String(text ?? '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)
  const chunks = []
  let current = ''
  const push = () => {
    if (current) chunks.push(current)
    current = ''
  }
  for (const paragraph of paragraphs.length ? paragraphs : [String(text ?? '').trim()]) {
    if (paragraph.length > maxChunkCharacters) {
      push()
      for (let start = 0; start < paragraph.length; start += maxChunkCharacters) {
        chunks.push(paragraph.slice(start, start + maxChunkCharacters))
      }
      continue
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChunkCharacters) {
      push()
      current = paragraph
    } else current = candidate
  }
  push()
  return chunks
}

async function embedDocument(text) {
  const chunks = splitTextIntoChunks(text)
  if (!chunks.length) throw new Error('Document text is empty')
  const vectors = await mapWithConcurrency(chunks, embed)
  const dimensions = vectors[0]?.length ?? 0
  const totals = Array.from({ length: dimensions }, () => 0)
  for (const vector of vectors) {
    for (let index = 0; index < dimensions; index++) totals[index] += vector[index] ?? 0
  }
  return totals.map(total => total / vectors.length)
}

async function mapWithConcurrency(items, mapper) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index])
    }
  }))
  return results
}

async function embed(text) {
  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.LMSTUDIO_EMBEDDING_MODEL, input: text }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Embedding request failed (${response.status})`)
  const data = await response.json()
  const embedding = data?.data?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.length !== 1024 || embedding.some(value => !Number.isFinite(value))) {
    throw new Error('Embedding response is not a finite 1024-dimensional vector')
  }
  return embedding
}

async function backfillCaseStudySlides() {
  let updated = 0
  let failed = 0
  while (true) {
    const { data: slides, error } = await supabase
      .from('case_study_slides')
      .select('id,title,content')
      .is('embedding', null)
      .limit(batchSize)
    if (error) throw error
    if (!slides?.length) break
    await mapWithConcurrency(slides, async slide => {
      try {
        const embedding = await embed([slide.title, slide.content].map(normalize).filter(Boolean).join('\n'))
        const { error: updateError } = await supabase.from('case_study_slides').update({ embedding }).eq('id', slide.id)
        if (updateError) throw updateError
        updated++
      } catch (error) {
        failed++
        console.error(`Failed to embed case study slide ${slide.id}:`, error instanceof Error ? error.message : error)
      }
    })
    if (failed === slides.length) break
  }
  return { updated, failed }
}

async function backfillRfps() {
  let updated = 0
  let failed = 0
  while (true) {
    const { data: rfps, error } = await supabase
      .from('rfp_documents')
      .select('id,title,client,industry,content,analysis')
      .is('embedding', null)
      .limit(batchSize)
    if (error) throw error
    if (!rfps?.length) break
    await mapWithConcurrency(rfps, async rfp => {
      try {
        const text = [rfp.content, rfp.title, rfp.client, rfp.industry].map(normalize).filter(Boolean).join('\n')
        if (!text) return
        const embedding = await embedDocument(text)
        const { error: updateError } = await supabase.from('rfp_documents').update({ embedding }).eq('id', rfp.id)
        if (updateError) throw updateError
        updated++
      } catch (error) {
        failed++
        console.error(`Failed to embed RFP ${rfp.id}:`, error instanceof Error ? error.message : error)
      }
    })
    if (failed === rfps.length) break
  }
  return { updated, failed }
}

const [caseStudyResult, rfpResult] = await Promise.all([backfillCaseStudySlides(), backfillRfps()])
console.log(JSON.stringify({ caseStudySlides: caseStudyResult, rfps: rfpResult }))