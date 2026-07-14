import type { RfpDocument } from '~/types/rfp'

export default defineEventHandler(async (event) => {
  // TODO: Parse multipart form data and extract the uploaded RFP file (PDF/DOCX)
  // TODO: Store file in Supabase Storage via server/services/supabase/storage.ts
  // TODO: Extract text content from file
  // TODO: Persist RfpDocument record in Supabase DB
  // TODO: Return the created RfpDocument record

  const newRfp: RfpDocument = {
    id: `rfp-${Date.now()}`,
    title: 'New RFP Document',
    client: 'Unknown Client',
    industry: 'Unknown Industry',
    fileName: 'uploaded-rfp.pdf',
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  }

  return newRfp
})
