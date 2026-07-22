import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleDeleteRfp: typeof import('#server/api/rfps/[id]/index.delete')['handleDeleteRfp']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: { id?: string } } }, key: string) => event.context.params[key as 'id'])
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleDeleteRfp } = await import('#server/api/rfps/[id]/index.delete'))
})

describe('handleDeleteRfp', () => {
  const event = { context: { params: { id: 'rfp-123' } } } as any

  it('soft-deletes an active RFP document', async () => {
    const deps = {
      getRfpById: vi.fn().mockResolvedValue({ id: 'rfp-123' }),
      softDeleteRfp: vi.fn().mockResolvedValue(undefined),
    }

    await expect(handleDeleteRfp(event, deps as any)).resolves.toEqual({ id: 'rfp-123', deleted: true })
    expect(deps.getRfpById).toHaveBeenCalledWith('rfp-123')
    expect(deps.softDeleteRfp).toHaveBeenCalledWith('rfp-123')
  })

  it('returns 404 without modifying a missing RFP document', async () => {
    const deps = {
      getRfpById: vi.fn().mockResolvedValue(null),
      softDeleteRfp: vi.fn(),
    }

    await expect(handleDeleteRfp(event, deps as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'RFP document not found',
    })
    expect(deps.softDeleteRfp).not.toHaveBeenCalled()
  })
})