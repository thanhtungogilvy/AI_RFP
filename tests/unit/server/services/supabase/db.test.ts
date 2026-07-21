import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseClient } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('#server/services/supabase/client', () => ({ getSupabaseClient }))

import {
  dbCountCaseStudiesIndexed,
  dbCountProposalsGenerated,
  dbCountRfpsAnalyzed,
  dbGetCaseStudyById,
  dbInsertCaseStudy,
  dbInsertCaseStudySlides,
  dbSearchCaseStudies,
  dbUpdateCaseStudyFilePath,
  dbUpdateCaseStudyStatus,
} from '#server/services/supabase/db'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
})

it('returns early from case-study write/read helpers when Supabase is unconfigured', async () => {
  getSupabaseClient.mockReturnValue(null)
  await expect(dbGetCaseStudyById('id')).resolves.toBeNull()
  await expect(dbInsertCaseStudy({ id: '', title: '', client: '', industry: '', summary: '', tags: [], fileName: '', uploadedAt: '', status: 'processing' })).resolves.toBeNull()
  await expect(dbUpdateCaseStudyStatus('id', 'error')).resolves.toBeUndefined()
  await expect(dbUpdateCaseStudyFilePath('id', 'path')).resolves.toBeUndefined()
  await expect(dbInsertCaseStudySlides('id', [])).resolves.toBeUndefined()
  await expect(dbCountCaseStudiesIndexed()).resolves.toBeNull()
  await expect(dbCountRfpsAnalyzed()).resolves.toBeNull()
  await expect(dbCountProposalsGenerated()).resolves.toBeNull()
})

describe('dashboard count helpers', () => {
  it('counts indexed case studies', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 3, error: null })
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    getSupabaseClient.mockReturnValue({ from })

    await expect(dbCountCaseStudiesIndexed()).resolves.toBe(3)
    expect(from).toHaveBeenCalledWith('case_studies')
    expect(select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(eq).toHaveBeenCalledWith('status', 'indexed')
  })

  it('counts analyzed RFP documents', async () => {
    const eq = vi.fn().mockResolvedValue({ count: 2, error: null })
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    getSupabaseClient.mockReturnValue({ from })

    await expect(dbCountRfpsAnalyzed()).resolves.toBe(2)
    expect(from).toHaveBeenCalledWith('rfp_documents')
    expect(eq).toHaveBeenCalledWith('status', 'analyzed')
  })

  it('counts generated proposals including completed and error statuses', async () => {
    const inFilter = vi.fn().mockResolvedValue({ count: 5, error: null })
    const select = vi.fn(() => ({ in: inFilter }))
    const from = vi.fn(() => ({ select }))
    getSupabaseClient.mockReturnValue({ from })

    await expect(dbCountProposalsGenerated()).resolves.toBe(5)
    expect(from).toHaveBeenCalledWith('proposals')
    expect(inFilter).toHaveBeenCalledWith('status', ['completed', 'error'])
  })

  it('throws a safe 500 when count query fails', async () => {
    const eq = vi.fn().mockResolvedValue({ count: null, error: { message: 'count failed with secret-value' } })
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    getSupabaseClient.mockReturnValue({ from })

    await expect(dbCountCaseStudiesIndexed()).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'The database request could not be completed.',
    })
  })
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

  it('throws a safe 500 error when the update fails', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'update failed with secret-value' } })
    getSupabaseClient.mockReturnValue({ from: () => ({ update: () => ({ eq }) }) })

    await expect(dbUpdateCaseStudyFilePath('case-study-1', 'deck.pptx')).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'The database request could not be completed.',
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
      { case_study_id: 'case-study-1', slide_index: 1, title: 'Overview', content: 'The overview', tags: [], embedding: null },
      { case_study_id: 'case-study-1', slide_index: 2, title: 'Results', content: 'The results', tags: [], embedding: null },
    ])
  })

  it('throws a safe 500 error when the insert fails', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'insert failed with secret-value' } })
    getSupabaseClient.mockReturnValue({ from: () => ({ insert }) })

    await expect(dbInsertCaseStudySlides('case-study-1', [])).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'The database request could not be completed.',
    })
  })
})

describe('dbSearchCaseStudies', () => {
  it('uses the server-side slide-aware search RPC before loading case studies', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const inFilter = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ in: inFilter }))
    const from = vi.fn(() => ({ select }))
    const rpc = vi.fn().mockResolvedValue({ data: [{ case_study_id: 'case-study-1' }], error: null })
    getSupabaseClient.mockReturnValue({ rpc, from })

    await expect(dbSearchCaseStudies('zero downtime')).resolves.toEqual([])

    expect(rpc).toHaveBeenCalledWith('search_case_studies', { search_text: 'zero downtime' })
    expect(inFilter).toHaveBeenCalledWith('id', ['case-study-1'])
  })
})
