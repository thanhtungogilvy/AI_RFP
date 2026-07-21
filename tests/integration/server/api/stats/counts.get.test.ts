import { beforeAll, describe, expect, it, vi } from 'vitest'

let handleDashboardStats: typeof import('#server/api/stats/counts.get')['handleDashboardStats']

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }))
  ;({ handleDashboardStats } = await import('#server/api/stats/counts.get'))
})

function deps(overrides = {}) {
  return {
    isSupabaseConfigured: vi.fn().mockReturnValue(true),
    countCaseStudiesIndexed: vi.fn().mockResolvedValue(3),
    countRfpsAnalyzed: vi.fn().mockResolvedValue(2),
    countProposalsGenerated: vi.fn().mockResolvedValue(1),
    ...overrides,
  }
}

describe('handleDashboardStats', () => {
  it('returns dashboard metrics using configured counting semantics', async () => {
    await expect(handleDashboardStats(deps())).resolves.toEqual({
      caseStudiesIndexed: 3,
      rfpsUploaded: 2,
      proposalsGenerated: 1,
    })
  })

  it('returns 503 when Supabase is not configured', async () => {
    await expect(handleDashboardStats(deps({ isSupabaseConfigured: vi.fn().mockReturnValue(false) }))).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Dashboard stats require Supabase configuration',
    })
  })

  it('normalizes nullable count values to zero', async () => {
    await expect(handleDashboardStats(deps({
      countCaseStudiesIndexed: vi.fn().mockResolvedValue(null),
      countRfpsAnalyzed: vi.fn().mockResolvedValue(null),
      countProposalsGenerated: vi.fn().mockResolvedValue(null),
    }))).resolves.toEqual({
      caseStudiesIndexed: 0,
      rfpsUploaded: 0,
      proposalsGenerated: 0,
    })
  })
})
