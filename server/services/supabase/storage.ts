import { getSupabaseClient } from './client'

async function ensurePrivateBucket(bucket: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.')

  const { data, error } = await sb.storage.getBucket(bucket)
  if (data) return
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Failed to check storage bucket ${bucket}: ${error.message}`)
  }

  const { error: createError } = await sb.storage.createBucket(bucket, { public: false })
  if (createError && !/already exists|duplicate/i.test(createError.message)) {
    throw new Error(`Failed to create storage bucket ${bucket}: ${createError.message}`)
  }
}

/**
 * Upload a file buffer to a Supabase Storage bucket.
 * Returns the storage object path (not a public URL — use getSignedUrl for downloads).
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.')

  await ensurePrivateBucket(bucket)

  const { error } = await sb.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

/**
 * Generate a short-lived signed URL for private file downloads.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) throw new Error(`Failed to create signed URL: ${error?.message}`)
  return data.signedUrl
}

/**
 * Download a file from Supabase Storage as a Buffer.
 */
export async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase is not configured.')

  const { data, error } = await sb.storage.from(bucket).download(path)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
