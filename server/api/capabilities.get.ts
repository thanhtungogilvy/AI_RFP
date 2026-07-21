import { canExportPdf } from '../services/pdf/convertProposal'
import { getEnvironmentCapabilities } from '../utils/environment'

export function buildCapabilities(environment: Record<string, string | undefined> = process.env, pdfExport = canExportPdf()) {
  const capabilities = getEnvironmentCapabilities(environment)
  const reasons = { ...capabilities.reasons } as Record<string, string>
  if (!pdfExport) reasons.pdfExport = 'Install and configure LibreOffice, then set PDF_CONVERTER=libreoffice.'

  return {
    supabase: capabilities.supabase,
    chatModel: capabilities.chatModel,
    embeddingModel: capabilities.embeddingModel,
    pdfExport,
    reasons,
  }
}

export default defineEventHandler(() => buildCapabilities())
