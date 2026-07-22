import type { H3Event, MultiPartData } from 'h3'
import type { CaseStudy } from '~/types/case-study'
import { isSupabaseConfigured } from '../../services/supabase/client'
import { indexCaseStudy, PPTX_MIME } from '../../services/case-studies/indexCaseStudy'
import { MAX_UPLOAD_BYTES, readBoundedMultipartFormData } from '../../utils/upload'
import { logError } from '../../utils/logger'

const ACCEPTED_CONTENT_TYPES = new Set([PPTX_MIME, 'application/octet-stream'])
const MAX_BATCH_FILES = 10
export { readBoundedMultipartFormData } from '../../utils/upload'

export function validatePptxUpload(fileName: string, contentType?: string): void {
  if (!/\.pptx$/i.test(fileName)) {
    throw createError({ statusCode: 400, statusMessage: 'Only PPTX files are supported' })
  }
  if (!contentType || !ACCEPTED_CONTENT_TYPES.has(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid PPTX content type' })
  }
}

function isIntentionalHttpError(error: unknown): error is { statusCode: number } {
  return typeof error === 'object' && error !== null
    && 'statusCode' in error && typeof error.statusCode === 'number'
    && ((error.statusCode >= 400 && error.statusCode < 500) || error.statusCode === 503)
}

function isPptxValidationError(error: unknown): error is Error {
  return error instanceof Error && (
    error.message === 'Invalid PPTX file'
    || error.message === 'Invalid PPTX package'
    || error.message === 'PPTX contains no extractable text'
    || /^Invalid slide XML at slide \d+$/.test(error.message)
  )
}

interface UploadDependencies {
  readMultipartFormData: (event: H3Event) => Promise<MultiPartData[] | undefined>
  isSupabaseConfigured: typeof isSupabaseConfigured
  indexCaseStudy: typeof indexCaseStudy
}

interface CaseStudyUploadDraft {
  id: string
  fileName: string
  contentType?: string
  data: Buffer
  title: string
  client: string
  industry: string
}

interface CaseStudyUploadResult {
  id: string
  fileName: string
  status: 'success' | 'error'
  caseStudy?: CaseStudy
  error?: string
}

interface CaseStudyUploadBatchResponse {
  total: number
  success: number
  failed: number
  results: CaseStudyUploadResult[]
}

const defaultDependencies: UploadDependencies = {
  readMultipartFormData: readBoundedMultipartFormData,
  isSupabaseConfigured,
  indexCaseStudy,
}

function partToText(part: MultiPartData | undefined): string {
  return part?.data?.toString() ?? ''
}

function normalizeError(error: unknown): string {
  if (isPptxValidationError(error)) return error.message
  if (isIntentionalHttpError(error)) {
    const withStatusMessage = error as { statusMessage?: string }
    return withStatusMessage.statusMessage ?? 'Request failed'
  }
  return 'Case study indexing failed'
}

function getMetaValue(parts: MultiPartData[], key: string, id: string, fallbackKey = ''): string {
  const byId = partToText(parts.find(part => part.name === `${key}:${id}`)).trim()
  if (byId) return byId
  if (fallbackKey) {
    const fallback = partToText(parts.find(part => part.name === fallbackKey)).trim()
    if (fallback) return fallback
  }
  return ''
}

function parseBatchFiles(parts: MultiPartData[]): CaseStudyUploadDraft[] {
  const batchFileParts = parts.filter(part => part.name === 'files' && part.data && part.filename)
  const singleFilePart = parts.find(part => part.name === 'file' && part.data && part.filename)
  const fileParts = batchFileParts.length ? batchFileParts : (singleFilePart ? [singleFilePart] : [])
  if (!fileParts.length) throw createError({ statusCode: 400, statusMessage: 'File field missing' })
  if (fileParts.length > MAX_BATCH_FILES) {
    throw createError({ statusCode: 400, statusMessage: `Maximum ${MAX_BATCH_FILES} files per upload` })
  }

  const fileIds = parts
    .filter(part => part.name === 'fileIds')
    .map(part => part.data?.toString()?.trim() ?? '')

  return fileParts.map((part, index) => {
    const id = fileIds[index] || `item-${index + 1}`
    const fileName = part.filename as string
    const title = getMetaValue(parts, 'title', id, 'title') || fileName.replace(/\.pptx$/i, '')
    const client = getMetaValue(parts, 'client', id, 'client') || 'Unknown Client'
    const industry = getMetaValue(parts, 'industry', id, 'industry')

    return {
      id,
      fileName,
      contentType: part.type,
      data: part.data as Buffer,
      title,
      client,
      industry,
    }
  })
}

export async function handleCaseStudyUpload(event: H3Event, deps: UploadDependencies = defaultDependencies): Promise<CaseStudyUploadBatchResponse> {
  try {
    const parts = await deps.readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

    const uploads = parseBatchFiles(parts)
    if (uploads.some(upload => upload.data.length > MAX_UPLOAD_BYTES)) {
      throw createError({ statusCode: 413, statusMessage: 'PPTX file exceeds 50 MiB limit' })
    }

    if (!deps.isSupabaseConfigured()) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Case study indexing requires Supabase configuration',
      })
    }

    const results: CaseStudyUploadResult[] = []

    for (const upload of uploads) {
      try {
        validatePptxUpload(upload.fileName, upload.contentType)
        if (upload.data.length > MAX_UPLOAD_BYTES) {
          throw createError({ statusCode: 413, statusMessage: 'PPTX file exceeds 50 MiB limit' })
        }
        const caseStudy = await deps.indexCaseStudy({
          buffer: upload.data,
          fileName: upload.fileName,
          title: upload.title,
          client: upload.client,
          industry: upload.industry,
        })
        results.push({ id: upload.id, fileName: upload.fileName, status: 'success', caseStudy })
      } catch (error) {
        logError('case_study_batch_item_failed', error, { operation: 'case_study_upload', fileName: upload.fileName })
        results.push({ id: upload.id, fileName: upload.fileName, status: 'error', error: normalizeError(error) })
      }
    }

    return {
      total: results.length,
      success: results.filter(item => item.status === 'success').length,
      failed: results.filter(item => item.status === 'error').length,
      results,
    }
  } catch (error) {
    if (isIntentionalHttpError(error)) throw error
    if (isPptxValidationError(error)) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    logError('case_study_indexing_failed', error, { operation: 'case_study_upload' })
    throw createError({ statusCode: 500, statusMessage: 'Case study indexing failed' })
  }
}

export default defineEventHandler(event => handleCaseStudyUpload(event))
