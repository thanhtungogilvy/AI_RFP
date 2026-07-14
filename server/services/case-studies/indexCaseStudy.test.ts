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
    getCaseStudy: vi.fn().mockResolvedValue({ ...saved, status: 'indexed' }),
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
      { slideIndex: 1, title: 'Overview', content: 'Overview\nEvidence' },
    ])
    expect(deps.updateStatus).toHaveBeenLastCalledWith(saved.id, 'indexed')
    expect(result.status).toBe('indexed')
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
