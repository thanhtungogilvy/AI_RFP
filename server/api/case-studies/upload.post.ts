import type { CaseStudy } from '~/types/case-study'
import { dbInsertCaseStudy } from '../../services/supabase/db'
import { uploadFile } from '../../services/supabase/storage'
import { isSupabaseConfigured } from '../../services/supabase/client'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  }

  const fileName = filePart.filename
  const now = new Date().toISOString()
  const proposedId = `cs-${Date.now()}`

  const record: Omit<CaseStudy, 'slides'> = {
    id:         proposedId,
    title:      (parts.find(p => p.name === 'title')?.data?.toString() ?? fileName.replace(/\.pptx$/i, '')),
    client:     parts.find(p => p.name === 'client')?.data?.toString() ?? 'Unknown Client',
    industry:   parts.find(p => p.name === 'industry')?.data?.toString() ?? '',
    summary:    '',
    tags:       [],
    fileName,
    uploadedAt: now,
    status:     'processing',
  }

  if (isSupabaseConfigured()) {
    // Upload file to Supabase Storage
    const storagePath = `${proposedId}/${fileName}`
    await uploadFile('case-studies', storagePath, filePart.data, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')

    // Persist metadata to DB
    const saved = await dbInsertCaseStudy(record)
    if (saved) {
      // TODO: Queue slide extraction job here
      return saved
    }
  }

  // Mock fallback (no Supabase)
  return { ...record, slides: [] } satisfies CaseStudy
})

