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

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

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
}

const defaultDependencies: IndexCaseStudyDependencies = {
  insertCaseStudy: dbInsertCaseStudy,
  uploadFile,
  updateFilePath: dbUpdateCaseStudyFilePath,
  extractSlides: extractSlidesFromPptx,
  insertSlides: dbInsertCaseStudySlides,
  updateStatus: dbUpdateCaseStudyStatus,
  getCaseStudy: dbGetCaseStudyById,
}

export async function indexCaseStudy(
  input: IndexCaseStudyInput,
  deps: IndexCaseStudyDependencies = defaultDependencies,
): Promise<CaseStudy> {
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
    const storagePath = `${saved.id}/${input.fileName}`
    await deps.uploadFile('case-studies', storagePath, input.buffer, PPTX_MIME)
    await deps.updateFilePath(saved.id, storagePath)
    const extracted = await deps.extractSlides(input.buffer)
    await deps.insertSlides(saved.id, extracted.map(slide => ({
      slideIndex: slide.slideNumber,
      title: slide.title,
      content: slide.content,
    })))
    await deps.updateStatus(saved.id, 'indexed')
    const completed = await deps.getCaseStudy(saved.id)
    if (!completed || completed.status !== 'indexed') {
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
