import { isSupabaseConfigured } from '../services/supabase/client'
import { canExportPdf } from '../services/pdf/convertProposal'

export default defineEventHandler(() => ({
  supabase: isSupabaseConfigured(),
  chatModel: !!process.env.LMSTUDIO_CHAT_MODEL,
  embeddingModel: !!process.env.LMSTUDIO_EMBEDDING_MODEL,
  pdfExport: canExportPdf(),
}))
