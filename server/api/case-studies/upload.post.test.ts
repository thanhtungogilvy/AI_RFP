import { beforeAll, describe, expect, it, vi } from 'vitest'

type Validator = (fileName: string, contentType?: string) => void
let validatePptxUpload: Validator

beforeAll(async () => {
  vi.stubGlobal('createError', (input: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
  )
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  ;({ validatePptxUpload } = await import('./upload.post'))
})

describe('validatePptxUpload', () => {
  it.each([
    ['deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['DECK.PPTX', 'application/octet-stream'],
  ])('accepts %s with %s', (fileName, contentType) => {
    expect(() => validatePptxUpload(fileName, contentType)).not.toThrow()
  })

  it.each([
    ['deck.pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['deck.pptx', undefined],
    ['deck.pptx', 'application/pdf'],
  ])('rejects %s with %s as HTTP 400', (fileName, contentType) => {
    expect(() => validatePptxUpload(fileName, contentType)).toThrow(expect.objectContaining({ statusCode: 400 }))
  })
})
