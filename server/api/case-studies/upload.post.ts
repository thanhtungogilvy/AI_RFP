import { readMultipartFormData as parseH3Multipart, type H3Event, type MultiPartData } from 'h3'
import { isSupabaseConfigured } from '../../services/supabase/client'
import { indexCaseStudy, PPTX_MIME } from '../../services/case-studies/indexCaseStudy'

const ACCEPTED_CONTENT_TYPES = new Set([PPTX_MIME, 'application/octet-stream'])
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export async function readBoundedMultipartFormData(event: H3Event, limit = MAX_UPLOAD_BYTES): Promise<MultiPartData[] | undefined> {
  const request = event.node.req as typeof event.node.req & { rawBody?: Buffer }
  const declaredLength = Number.parseInt(request.headers['content-length'] || '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw createError({ statusCode: 413, statusMessage: 'Multipart request exceeds 50 MiB limit' })
  }

  request.rawBody = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
    }
    const onData = (value: Buffer | string) => {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      total += chunk.length
      if (total > limit) {
        cleanup()
        request.pause()
        reject(createError({ statusCode: 413, statusMessage: 'Multipart request exceeds 50 MiB limit' }))
        return
      }
      chunks.push(chunk)
    }
    const onEnd = () => {
      cleanup()
      resolve(Buffer.concat(chunks, total))
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    request.on('data', onData)
    request.on('end', onEnd)
    request.on('error', onError)
  })
  return parseH3Multipart(event)
}

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

const defaultDependencies: UploadDependencies = {
  readMultipartFormData: readBoundedMultipartFormData,
  isSupabaseConfigured,
  indexCaseStudy,
}

export async function handleCaseStudyUpload(event: H3Event, deps: UploadDependencies = defaultDependencies) {
  try {
    const parts = await deps.readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

    const filePart = parts.find(part => part.name === 'file')
    if (!filePart?.data || !filePart.filename) {
      throw createError({ statusCode: 400, statusMessage: 'File field missing' })
    }

    validatePptxUpload(filePart.filename, filePart.type)
    if (filePart.data.length > MAX_UPLOAD_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'PPTX file exceeds 50 MiB limit' })
    }

    if (!deps.isSupabaseConfigured()) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Case study indexing requires Supabase configuration',
      })
    }

    const titlePart = parts.find(part => part.name === 'title')?.data?.toString()
    const clientPart = parts.find(part => part.name === 'client')?.data?.toString()
    const industryPart = parts.find(part => part.name === 'industry')?.data?.toString()

    return await deps.indexCaseStudy({
      buffer: filePart.data,
      fileName: filePart.filename,
      title: titlePart || filePart.filename.replace(/\.pptx$/i, ''),
      client: clientPart || 'Unknown Client',
      industry: industryPart || '',
    })
  } catch (error) {
    if (isIntentionalHttpError(error)) throw error
    if (isPptxValidationError(error)) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    console.error('Case study indexing failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Case study indexing failed' })
  }
}

export default defineEventHandler(event => handleCaseStudyUpload(event))
