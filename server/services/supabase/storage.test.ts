import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseClient } = vi.hoisted(() => ({ getSupabaseClient: vi.fn() }))
vi.mock('./client', () => ({ getSupabaseClient }))

import { uploadFile } from './storage'

describe('uploadFile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a missing private bucket before uploading', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const createBucket = vi.fn().mockResolvedValue({ error: null })
    const getBucket = vi.fn().mockResolvedValue({ data: null, error: { message: 'Bucket not found' } })
    getSupabaseClient.mockReturnValue({ storage: { getBucket, createBucket, from: vi.fn(() => ({ upload })) } })

    await expect(uploadFile('rfps', 'rfp-1/source.pdf', Buffer.from('pdf'), 'application/pdf')).resolves.toBe('rfp-1/source.pdf')

    expect(createBucket).toHaveBeenCalledWith('rfps', { public: false })
    expect(upload).toHaveBeenCalledWith('rfp-1/source.pdf', expect.any(Buffer), {
      contentType: 'application/pdf', upsert: true,
    })
  })
})
