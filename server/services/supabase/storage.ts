// TODO: Implement file upload to Supabase Storage
// import { supabase } from './client'

export async function uploadFile(
  _bucket: string,
  _path: string,
  _file: Buffer | Uint8Array,
  _contentType: string
): Promise<string> {
  // TODO: Upload file to Supabase Storage bucket
  // const { data, error } = await supabase.storage.from(bucket).upload(path, file, { contentType })
  // if (error) throw error
  // return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  throw new Error('Supabase Storage not yet configured')
}

export async function getSignedUrl(_bucket: string, _path: string, _expiresIn = 3600): Promise<string> {
  // TODO: Generate a signed URL for file download
  // const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  // if (error) throw error
  // return data.signedUrl
  throw new Error('Supabase Storage not yet configured')
}
