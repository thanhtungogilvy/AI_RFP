import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleGetRfp: typeof import('#server/api/rfps/[id]/index.get')['handleGetRfp']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleGetRfp } = await import('#server/api/rfps/[id]/index.get'))
})

describe('handleGetRfp', () => {
  const event = { context: { params: { id: 'rfp-123' } } } as any
  const rfp = {
    id: 'rfp-123',
    title: 'Core banking modernization',
    client: 'Example Bank',
    industry: 'Banking',
    fileName: 'rfp.pdf',
    uploadedAt: '2026-07-22T00:00:00.000Z',
    status: 'uploaded' as const,
  }

  it('returns an active RFP document by id', async () => {
    const deps = { getRfpById: vi.fn().mockResolvedValue(rfp) }

    await expect(handleGetRfp(event, deps as any)).resolves.toEqual(rfp)
    expect(deps.getRfpById).toHaveBeenCalledWith('rfp-123')
  })

  it('returns 404 when the RFP document is missing or deleted', async () => {
    const deps = { getRfpById: vi.fn().mockResolvedValue(null) }

    await expect(handleGetRfp(event, deps as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'RFP document not found',
    })
  })
})