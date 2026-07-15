import { describe, expect, it, vi } from 'vitest'
import type { CaseStudy } from '~/types/case-study'
import { indexCaseStudy, PPTX_MIME } from './indexCaseStudy'

const input = {
  buffer: Buffer.from('pptx'),
  fileName: 'evidence.pptx',
  title: 'Evidence',
  client: 'Acme',
  industry: 'Technology',
}

const saved: CaseStudy = {
  id: 'case-study-1',
  title: input.title,
  client: input.client,
  industry: input.industry,
  summary: '',
  tags: [],
  slides: [],
  fileName: input.fileName,
  uploadedAt: '2026-07-14T00:00:00.000Z',
  status: 'processing',
}

function makeDeps() {
  return {
    insertCaseStudy: vi.fn().mockResolvedValue(saved),
    uploadFile: vi.fn().mockResolvedValue(`${saved.id}/${input.fileName}`),
    updateFilePath: vi.fn().mockResolvedValue(undefined),
    extractSlides: vi.fn().mockResolvedValue([
      { slideNumber: 1, title: 'Overview', content: 'Overview\nEvidence' },
    ]),
    insertSlides: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    generateSlideEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
    getCaseStudy: vi.fn().mockResolvedValue({ ...saved, status: 'indexed', slides: [
      { slideIndex: 1, title: 'Overview', content: 'Overview\nEvidence' },
    ] }),
  }
}

describe('indexCaseStudy', () => {
  it('persists, extracts, and indexes an uploaded presentation', async () => {
    const deps = makeDeps()

    const result = await indexCaseStudy(input, deps)

    expect(deps.uploadFile).toHaveBeenCalledWith(
      'case-studies',
      `${saved.id}/${input.fileName}`,
      input.buffer,
      PPTX_MIME,
    )
    expect(deps.updateFilePath).toHaveBeenCalledWith(saved.id, `${saved.id}/${input.fileName}`)
    expect(deps.insertSlides).toHaveBeenCalledWith(saved.id, [
      { slideIndex: 1, title: 'Overview', content: 'Overview\nEvidence', embedding: [0.1, 0.2] },
    ])
    expect(deps.updateStatus).toHaveBeenLastCalledWith(saved.id, 'indexed')
    expect(result.status).toBe('indexed')
    expect(result.slides).toEqual([{ slideIndex: 1, title: 'Overview', content: 'Overview\nEvidence' }])
  })

  it('stores a slide without an embedding when LM Studio is unavailable', async () => {
    const deps = makeDeps()
    deps.generateSlideEmbedding.mockRejectedValue(new Error('offline'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await indexCaseStudy(input, deps)

    expect(deps.insertSlides).toHaveBeenCalledWith(saved.id, [expect.objectContaining({ embedding: null })])
    expect(deps.updateStatus).toHaveBeenCalledWith(saved.id, 'indexed')
    error.mockRestore()
  })

  it('marks an indexed refetch as error when persisted slide count differs', async () => {
    const deps = makeDeps()
    deps.getCaseStudy.mockResolvedValue({ ...saved, status: 'indexed', slides: [] })
    await expect(indexCaseStudy(input, deps)).rejects.toThrow('Case study indexing did not complete')
    expect(deps.updateStatus).toHaveBeenLastCalledWith(saved.id, 'error')
  })

  it.each([
    ['../../secret deck.pptx', 'secret_deck.pptx'],
    ['bad\u0000/name?.pptx', 'name_.pptx'],
  ])('sanitizes storage name %s while retaining metadata', async (fileName, expected) => {
    const deps = makeDeps()
    await indexCaseStudy({ ...input, fileName }, deps)
    expect(deps.insertCaseStudy).toHaveBeenCalledWith(expect.objectContaining({ fileName }))
    expect(deps.uploadFile).toHaveBeenCalledWith('case-studies', `${saved.id}/${expected}`, input.buffer, PPTX_MIME)
  })

  it('caps the sanitized storage object filename while preserving the pptx extension', async () => {
    const deps = makeDeps()
    await indexCaseStudy({ ...input, fileName: `${'a'.repeat(240)}.pptx` }, deps)
    const path = deps.uploadFile.mock.calls[0]?.[1]
    expect(path).toBeTypeOf('string')
    if (typeof path !== 'string') throw new Error('Expected storage path')
    const objectName = path.split('/').pop()!
    expect(objectName).toHaveLength(180)
    expect(objectName).toMatch(/\.pptx$/)
  })

  it('marks the record as error and preserves extraction failures', async () => {
    const deps = makeDeps()
    const failure = new Error('extraction failed')
    deps.extractSlides.mockRejectedValue(failure)

    await expect(indexCaseStudy(input, deps)).rejects.toBe(failure)
    expect(deps.updateStatus).toHaveBeenCalledWith(saved.id, 'error')
    expect(deps.updateStatus).not.toHaveBeenCalledWith(saved.id, 'indexed')
  })

  it('marks the record as error and preserves slide insertion failures', async () => {
    const deps = makeDeps()
    const failure = new Error('slide insertion failed')
    deps.insertSlides.mockRejectedValue(failure)

    await expect(indexCaseStudy(input, deps)).rejects.toBe(failure)
    expect(deps.updateStatus).toHaveBeenCalledWith(saved.id, 'error')
    expect(deps.updateStatus).not.toHaveBeenCalledWith(saved.id, 'indexed')
  })

  it('rejects a refetched record that is not indexed and marks it as error', async () => {
    const deps = makeDeps()
    deps.getCaseStudy.mockResolvedValue(saved)

    await expect(indexCaseStudy(input, deps)).rejects.toThrow('Case study indexing did not complete')
    expect(deps.updateStatus).toHaveBeenNthCalledWith(1, saved.id, 'indexed')
    expect(deps.updateStatus).toHaveBeenNthCalledWith(2, saved.id, 'error')
  })

  it('preserves extraction failures when marking the record as error also fails', async () => {
    const deps = makeDeps()
    const failure = new Error('extraction failed')
    deps.extractSlides.mockRejectedValue(failure)
    deps.updateStatus.mockRejectedValue(new Error('status update failed'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(indexCaseStudy(input, deps)).rejects.toBe(failure)
    expect(deps.updateStatus).toHaveBeenCalledWith(saved.id, 'error')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
