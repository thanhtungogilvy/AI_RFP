import type { CaseStudy } from '~/types/case-study'
import {
  dbGetCaseStudyById,
  dbInsertCaseStudy,
  dbInsertCaseStudySlides,
  dbUpdateCaseStudyFilePath,
  dbUpdateCaseStudyStatus,
} from '../supabase/db'
import { uploadFile } from '../supabase/storage'
import { extractSlidesFromPptx } from '../pptx/extractSlides'
import { generateSlideEmbedding } from '../embeddings/generateEmbedding'

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const MAX_STORAGE_FILE_NAME_LENGTH = 180
const EMBEDDING_CONCURRENCY = 4

async function mapWithConcurrency<T, R>(items: T[], mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(EMBEDDING_CONCURRENCY, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index]!)
    }
  }))
  return results
}

export function storageFileName(fileName: string): string {
  const basename = fileName.replace(/\\/g, '/').split('/').pop() || 'upload.pptx'
  const safe = basename.replace(/[\u0000-\u001f\u007f]/g, '_').replace(/[^A-Za-z0-9._-]/g, '_')
  if (safe.length <= MAX_STORAGE_FILE_NAME_LENGTH) return safe
  const extension = safe.toLowerCase().endsWith('.pptx') ? '.pptx' : ''
  return `${safe.slice(0, MAX_STORAGE_FILE_NAME_LENGTH - extension.length)}${extension}`
}

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
  generateSlideEmbedding: typeof generateSlideEmbedding
}

const defaultDependencies: IndexCaseStudyDependencies = {
  insertCaseStudy: dbInsertCaseStudy,
  uploadFile,
  updateFilePath: dbUpdateCaseStudyFilePath,
  extractSlides: extractSlidesFromPptx,
  insertSlides: dbInsertCaseStudySlides,
  updateStatus: dbUpdateCaseStudyStatus,
  getCaseStudy: dbGetCaseStudyById,
  generateSlideEmbedding,
}

export async function indexCaseStudy(
  input: IndexCaseStudyInput,
  deps: IndexCaseStudyDependencies = defaultDependencies,
): Promise<CaseStudy> {
  // Validate the Office package and collect deterministic slide text before any
  // database/storage write. Invalid presentations must not leave a partial row.
  const extracted = await deps.extractSlides(input.buffer)
  const saved = await deps.insertCaseStudy({
    id: '',
    title: input.title,
    client: input.client,
    industry: input.industry,
    summary: '',
    tags: [],
    fileName: input.fileName,
    uploadedAt: new Date().toISOString(),
    status: 'processing',
  })
  if (!saved) throw new Error('Failed to create case study')

  try {
    const storagePath = `${saved.id}/${storageFileName(input.fileName)}`
    await deps.uploadFile('case-studies', storagePath, input.buffer, PPTX_MIME)
    await deps.updateFilePath(saved.id, storagePath)
    const slides = await mapWithConcurrency(extracted, async (slide) => {
      let embedding: number[] | null = null
      try {
        embedding = await deps.generateSlideEmbedding({ title: slide.title, content: slide.content })
      } catch (error) {
        console.error(`Failed to embed case study slide ${slide.slideNumber}`, error)
      }
      return { slideIndex: slide.slideNumber, title: slide.title, content: slide.content, embedding }
    })
    await deps.insertSlides(saved.id, slides)
    await deps.updateStatus(saved.id, 'indexed')
    const completed = await deps.getCaseStudy(saved.id)
    if (!completed || completed.status !== 'indexed' || completed.slides.length !== extracted.length) {
      throw new Error('Case study indexing did not complete')
    }
    return completed
  } catch (error) {
    try {
      await deps.updateStatus(saved.id, 'error')
    } catch (statusError) {
      console.error('Failed to mark case study indexing as error', statusError)
    }
    throw error
  }
}
