import type { RfpDocument } from '~/types/rfp'
import { dbInsertRfp, dbUpdateRfpFilePath } from '../../services/supabase/db'
import { uploadFile } from '../../services/supabase/storage'
import { isSupabaseConfigured } from '../../services/supabase/client'
import { extractRfpText } from '../../services/rfp/extractRfpText'
import { MAX_UPLOAD_BYTES, readBoundedMultipartFormData, storageObjectName } from '../../utils/upload'

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/octet-stream'])
const DOCX_MIME_TYPES = new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'])

export function validateRfpUpload(fileName: string, contentType: string | undefined, data: Buffer): void {
  const lower = fileName.toLowerCase()
  const pdf = lower.endsWith('.pdf')
  const docx = lower.endsWith('.docx')
  if (!pdf && !docx) throw createError({ statusCode: 400, statusMessage: 'Only PDF and DOCX RFP files are supported' })
  if (!contentType || (pdf && !PDF_MIME_TYPES.has(contentType)) || (docx && !DOCX_MIME_TYPES.has(contentType))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid RFP content type' })
  }
  if (pdf && !data.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid PDF file signature' })
  }
  if (docx && !data.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid DOCX file signature' })
  }
}

interface UploadDependencies {
  readMultipartFormData: typeof readBoundedMultipartFormData
  isSupabaseConfigured: typeof isSupabaseConfigured
  extractRfpText: typeof extractRfpText
  insertRfp: typeof dbInsertRfp
  uploadFile: typeof uploadFile
  updateFilePath: typeof dbUpdateRfpFilePath
  updateStatus: (id: string, status: RfpDocument['status']) => Promise<void>
}

const defaultDependencies: UploadDependencies = {
  readMultipartFormData: readBoundedMultipartFormData,
  isSupabaseConfigured,
  extractRfpText,
  insertRfp: dbInsertRfp,
  uploadFile,
  updateFilePath: dbUpdateRfpFilePath,
  updateStatus: async (id, status) => {
    const { dbUpdateRfpStatus } = await import('../../services/supabase/db')
    await dbUpdateRfpStatus(id, status)
  },
}

export async function handleRfpUpload(event: any, deps: UploadDependencies = defaultDependencies) {
  const parts = await deps.readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

  const filePart = parts.find(p => p.name === 'file')
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  }
  if (filePart.data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'RFP file exceeds 50 MiB limit' })
  validateRfpUpload(filePart.filename, filePart.type, filePart.data)
  if (!deps.isSupabaseConfigured()) throw createError({ statusCode: 503, statusMessage: 'RFP upload requires Supabase configuration' })

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

  let content: string
  try {
    content = await deps.extractRfpText(filePart.data, fileName)
  } catch (error) {
    if (error instanceof Error && error.message === 'The RFP document contains no extractable text') {
      throw createError({
        statusCode: 422,
        statusMessage: 'This RFP has no extractable text. Upload a text-bearing PDF or DOCX; OCR is not available.',
      })
    }
    throw error
  }
  const saved = await deps.insertRfp({ ...record, content })
  if (!saved) throw createError({ statusCode: 500, statusMessage: 'Failed to create RFP record' })
  try {
    const storagePath = `${saved.id}/${storageObjectName(fileName)}`
    await deps.uploadFile('rfps', storagePath, filePart.data, filePart.type || 'application/octet-stream')
    await deps.updateFilePath(saved.id, storagePath)
    return saved
  } catch (error) {
    await deps.updateStatus(saved.id, 'error').catch(() => undefined)
    throw error
  }
}

export default defineEventHandler(event => handleRfpUpload(event))
