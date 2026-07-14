export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const format = (query.format as string) ?? 'pptx'

  // TODO: Fetch the generated file URL from Supabase Storage by proposal id and format
  // TODO: Stream the file or redirect to a signed Supabase Storage URL

  // Mock: return a placeholder response until real file generation is implemented
  setResponseHeader(event, 'Content-Type', 'application/json')
  return {
    message: `Download for proposal ${id} in ${format} format is not yet implemented. Connect Supabase Storage to enable downloads.`,
  }
})
