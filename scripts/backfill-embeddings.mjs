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

async function embed(slide) {
  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.LMSTUDIO_EMBEDDING_MODEL, input: [slide.title, slide.content].filter(Boolean).join('\n') }),
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

let updated = 0
let failed = 0
while (true) {
  const { data: slides, error } = await supabase
    .from('case_study_slides').select('id,title,content').is('embedding', null).limit(batchSize)
  if (error) throw error
  if (!slides?.length) break
  await mapWithConcurrency(slides, async slide => {
    try {
      const embedding = await embed(slide)
      const { error: updateError } = await supabase.from('case_study_slides').update({ embedding }).eq('id', slide.id)
      if (updateError) throw updateError
      updated++
    } catch (error) {
      failed++
      console.error(`Failed to embed slide ${slide.id}:`, error instanceof Error ? error.message : error)
    }
  })
  if (failed === slides.length) break
}
console.log(JSON.stringify({ updated, failed }))
