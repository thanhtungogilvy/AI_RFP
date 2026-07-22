import { beforeAll, describe, expect, it, vi } from 'vitest'

let handlePatchRfp: typeof import('#server/api/rfps/[id]/index.patch')['handlePatchRfp']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  vi.stubGlobal('readBody', vi.fn())
  ;({ handlePatchRfp } = await import('#server/api/rfps/[id]/index.patch'))
})

describe('handlePatchRfp', () => {
  const event = { context: { params: { id: 'rfp-123' } } } as any
  const fields = { title: 'Updated RFP', client: 'Example Bank', industry: 'Banking', deadline: '2026-08-01' }

  it('updates active RFP metadata', async () => {
    const updated = { id: 'rfp-123', ...fields, fileName: 'rfp.pdf', uploadedAt: '2026-07-22T00:00:00.000Z', status: 'uploaded' as const }
    const deps = {
      readBody: vi.fn().mockResolvedValue(fields),
      getRfpById: vi.fn().mockResolvedValue({ id: 'rfp-123' }),
      updateRfpMetadata: vi.fn().mockResolvedValue(updated),
    }

    await expect(handlePatchRfp(event, deps as any)).resolves.toEqual(updated)
    expect(deps.updateRfpMetadata).toHaveBeenCalledWith('rfp-123', fields)
  })

  it('rejects manually supplied status changes', async () => {
    const deps = {
      readBody: vi.fn().mockResolvedValue({ ...fields, status: 'analyzed' }),
      getRfpById: vi.fn(),
      updateRfpMetadata: vi.fn(),
    }

    await expect(handlePatchRfp(event, deps as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'RFP status is managed by analysis',
    })
    expect(deps.updateRfpMetadata).not.toHaveBeenCalled()
  })

  it('returns 404 when the RFP document is missing or deleted', async () => {
    const deps = {
      readBody: vi.fn().mockResolvedValue(fields),
      getRfpById: vi.fn().mockResolvedValue(null),
      updateRfpMetadata: vi.fn(),
    }

    await expect(handlePatchRfp(event, deps as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(deps.updateRfpMetadata).not.toHaveBeenCalled()
  })
})