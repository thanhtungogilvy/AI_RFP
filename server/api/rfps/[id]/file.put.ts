import { handleRfpAnalysis } from './analyze.post'
import { validateRfpUpload } from '../upload.post'
import { extractRfpText } from '../../../services/rfp/extractRfpText'
import { isSupabaseConfigured } from '../../../services/supabase/client'
import { dbGetRfpById, dbReplaceRfpFile } from '../../../services/supabase/db'
import { uploadFile } from '../../../services/supabase/storage'
import { MAX_UPLOAD_BYTES, readBoundedMultipartFormData, storageObjectName } from '../../../utils/upload'

interface Dependencies {
  readMultipartFormData: typeof readBoundedMultipartFormData
  isSupabaseConfigured: typeof isSupabaseConfigured
  validateRfpUpload: typeof validateRfpUpload
  getRfpById: typeof dbGetRfpById
  extractRfpText: typeof extractRfpText
  uploadFile: typeof uploadFile
  replaceRfpFile: typeof dbReplaceRfpFile
  analyze?: (rfpId: string) => Promise<unknown>
}

const defaultDependencies: Dependencies = {
  readMultipartFormData: readBoundedMultipartFormData,
  isSupabaseConfigured,
  validateRfpUpload,
  getRfpById: dbGetRfpById,
  extractRfpText,
  uploadFile,
  replaceRfpFile: dbReplaceRfpFile,
}

export async function handleReplaceRfpFile(
  event: Parameters<typeof getRouterParam>[0],
  deps: Dependencies = defaultDependencies,
) {
  const rfpId = getRouterParam(event, 'id')
  if (!rfpId) throw createError({ statusCode: 400, statusMessage: 'RFP id is required' })
  if (!deps.isSupabaseConfigured()) throw createError({ statusCode: 503, statusMessage: 'RFP upload requires Supabase configuration' })

  const rfp = await deps.getRfpById(rfpId)
  if (!rfp) throw createError({ statusCode: 404, statusMessage: 'RFP document not found' })

  const parts = await deps.readMultipartFormData(event)
  const filePart = parts?.find(part => part.name === 'file')
  if (!filePart?.data || !filePart.filename) throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  if (filePart.data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'RFP file exceeds 50 MiB limit' })
  deps.validateRfpUpload(filePart.filename, filePart.type, filePart.data)

  let content: string
  try {
    content = await deps.extractRfpText(filePart.data, filePart.filename)
  } catch (error) {
    if (error instanceof Error && error.message === 'The RFP document contains no extractable text') {
      throw createError({
        statusCode: 422,
        statusMessage: 'This RFP has no extractable text. Upload a text-bearing PDF or DOCX; OCR is not available.',
      })
    }
    throw error
  }

  const storagePath = `${rfp.id}/${storageObjectName(filePart.filename)}`
  await deps.uploadFile('rfps', storagePath, filePart.data, filePart.type || 'application/octet-stream')
  const updated = await deps.replaceRfpFile(rfp.id, { fileName: filePart.filename, filePath: storagePath, content })
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'RFP document not found' })

  if (deps.analyze) await deps.analyze(rfp.id)
  else await handleRfpAnalysis(event)
  return updated
}

export default defineEventHandler(event => handleReplaceRfpFile(event))