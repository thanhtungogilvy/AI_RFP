import type { RfpDocument } from '~/types/rfp'
import { dbInsertRfp, dbUpdateRfpFilePath } from '../../services/supabase/db'
import { uploadFile } from '../../services/supabase/storage'
import { isSupabaseConfigured } from '../../services/supabase/client'
import { extractRfpText } from '../../services/rfp/extractRfpText'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  }

  const fileName  = filePart.filename
  const title     = parts.find(p => p.name === 'title')?.data?.toString() ?? fileName.replace(/\.[^/.]+$/, '')
  const client    = parts.find(p => p.name === 'client')?.data?.toString() ?? 'Unknown Client'
  const industry  = parts.find(p => p.name === 'industry')?.data?.toString() ?? ''
  const deadline  = parts.find(p => p.name === 'deadline')?.data?.toString() || undefined
  const now       = new Date().toISOString()

  const record: Omit<RfpDocument, 'id'> = {
    title, client, industry, deadline, fileName,
    uploadedAt: now,
    status: 'uploaded',
  }

  if (isSupabaseConfigured()) {
    const content = await extractRfpText(filePart.data, fileName)
    const saved = await dbInsertRfp({ ...record, content })
    if (saved) {
      const storagePath = `${saved.id}/${fileName}`
      await uploadFile('rfps', storagePath, filePart.data, filePart.type || 'application/octet-stream')
      await dbUpdateRfpFilePath(saved.id, storagePath)
      return saved
    }
  }

  // Mock fallback
  return { id: `rfp-${Date.now()}`, ...record } satisfies RfpDocument
})
