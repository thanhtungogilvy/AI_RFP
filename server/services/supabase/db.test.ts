import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseClient } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('./client', () => ({ getSupabaseClient }))

import { dbInsertCaseStudySlides, dbUpdateCaseStudyFilePath } from './db'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
})

describe('dbUpdateCaseStudyFilePath', () => {
  it('updates the case study file path by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    getSupabaseClient.mockReturnValue({ from })

    await dbUpdateCaseStudyFilePath('case-study-1', 'case-studies/case-study-1.pptx')

    expect(from).toHaveBeenCalledWith('case_studies')
    expect(update).toHaveBeenCalledWith({ file_path: 'case-studies/case-study-1.pptx' })
    expect(eq).toHaveBeenCalledWith('id', 'case-study-1')
  })

  it('throws a 500 error when the update fails', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } })
    getSupabaseClient.mockReturnValue({ from: () => ({ update: () => ({ eq }) }) })

    await expect(dbUpdateCaseStudyFilePath('case-study-1', 'deck.pptx')).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'update failed',
    })
  })
})

describe('dbInsertCaseStudySlides', () => {
  it('inserts every slide in one call with persistence fields', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({ insert }))
    getSupabaseClient.mockReturnValue({ from })

    await dbInsertCaseStudySlides('case-study-1', [
      { slideIndex: 1, title: 'Overview', content: 'The overview' },
      { slideIndex: 2, title: 'Results', content: 'The results' },
    ])

    expect(from).toHaveBeenCalledWith('case_study_slides')
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith([
      { case_study_id: 'case-study-1', slide_index: 1, title: 'Overview', content: 'The overview', tags: [] },
      { case_study_id: 'case-study-1', slide_index: 2, title: 'Results', content: 'The results', tags: [] },
    ])
  })

  it('throws a 500 error when the insert fails', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } })
    getSupabaseClient.mockReturnValue({ from: () => ({ insert }) })

    await expect(dbInsertCaseStudySlides('case-study-1', [])).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'insert failed',
    })
  })
})
