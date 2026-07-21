type Environment = Record<string, string | undefined>

export interface ServerEnvironment {
  supabaseUrl?: string
  supabaseServiceKey?: string
  lmStudioBaseUrl: string
  lmStudioChatModel?: string
  lmStudioEmbeddingModel?: string
  pdfConverter?: string
  pdfConverterPath?: string
}

export interface EnvironmentCapabilities {
  supabase: boolean
  chatModel: boolean
  embeddingModel: boolean
  reasons: Partial<Record<'supabase' | 'chatModel' | 'embeddingModel', string>>
}

function isSet(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function value(environment: Environment, name: string): string | undefined {
  const configured = environment[name]?.trim()
  return configured || undefined
}

/** The sole server-side reader for application-owned environment variables. */
export function getServerEnvironment(environment: Environment = process.env): ServerEnvironment {
  return {
    supabaseUrl: value(environment, 'SUPABASE_URL'),
    supabaseServiceKey: value(environment, 'SUPABASE_SERVICE_KEY'),
    lmStudioBaseUrl: value(environment, 'LMSTUDIO_BASE_URL') ?? 'http://localhost:1234',
    lmStudioChatModel: value(environment, 'LMSTUDIO_CHAT_MODEL'),
    lmStudioEmbeddingModel: value(environment, 'LMSTUDIO_EMBEDDING_MODEL'),
    pdfConverter: value(environment, 'PDF_CONVERTER'),
    pdfConverterPath: value(environment, 'PDF_CONVERTER_PATH'),
  }
}

export function getEnvironmentCapabilities(environment: Environment = process.env): EnvironmentCapabilities {
  const configured = getServerEnvironment(environment)
  const supabase = isSet(configured.supabaseUrl) && isSet(configured.supabaseServiceKey)
  const chatModel = isSet(configured.lmStudioChatModel)
  const embeddingModel = isSet(configured.lmStudioEmbeddingModel)
  const reasons: EnvironmentCapabilities['reasons'] = {}

  if (!supabase) reasons.supabase = 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'
  if (!chatModel) reasons.chatModel = 'Set LMSTUDIO_CHAT_MODEL.'
  if (!embeddingModel) reasons.embeddingModel = 'Set LMSTUDIO_EMBEDDING_MODEL.'

  return { supabase, chatModel, embeddingModel, reasons }
}
