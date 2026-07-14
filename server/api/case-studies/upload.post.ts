import { isSupabaseConfigured } from '../../services/supabase/client'
import { indexCaseStudy, PPTX_MIME } from '../../services/case-studies/indexCaseStudy'

const ACCEPTED_CONTENT_TYPES = new Set([PPTX_MIME, 'application/octet-stream'])

export function validatePptxUpload(fileName: string, contentType?: string): void {
  if (!/\.pptx$/i.test(fileName)) {
    throw createError({ statusCode: 400, statusMessage: 'Only PPTX files are supported' })
  }
  if (!contentType || !ACCEPTED_CONTENT_TYPES.has(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid PPTX content type' })
  }
}

function isHttpError(error: unknown): error is { statusCode: number } {
  return typeof error === 'object' && error !== null
    && 'statusCode' in error && typeof error.statusCode === 'number'
}

function isPptxValidationError(error: unknown): error is Error {
  return error instanceof Error && (
    error.message === 'Invalid PPTX file'
    || error.message === 'Invalid PPTX package'
    || error.message === 'PPTX contains no extractable text'
    || /^Invalid slide XML at slide \d+$/.test(error.message)
  )
}

export default defineEventHandler(async (event) => {
  try {
    const parts = await readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

    const filePart = parts.find(part => part.name === 'file')
    if (!filePart?.data || !filePart.filename) {
      throw createError({ statusCode: 400, statusMessage: 'File field missing' })
    }

    validatePptxUpload(filePart.filename, filePart.type)

    if (!isSupabaseConfigured()) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Case study indexing requires Supabase configuration',
      })
    }

    const titlePart = parts.find(part => part.name === 'title')?.data?.toString()
    const clientPart = parts.find(part => part.name === 'client')?.data?.toString()
    const industryPart = parts.find(part => part.name === 'industry')?.data?.toString()

    return await indexCaseStudy({
      buffer: filePart.data,
      fileName: filePart.filename,
      title: titlePart || filePart.filename.replace(/\.pptx$/i, ''),
      client: clientPart || 'Unknown Client',
      industry: industryPart || '',
    })
  } catch (error) {
    if (isHttpError(error)) throw error
    if (isPptxValidationError(error)) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to index case study' })
  }
})
