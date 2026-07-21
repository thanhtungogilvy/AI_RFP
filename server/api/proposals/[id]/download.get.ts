import { dbGetProposalArtifact } from '../../../services/supabase/db'
import { downloadFile } from '../../../services/supabase/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing proposal id' })

  const format = getQuery(event).format === 'pdf' ? 'pdf' : 'pptx'
  const artifact = await dbGetProposalArtifact(id)
  const path = format === 'pdf' ? artifact?.pdfPath : artifact?.pptxPath
  if (!artifact || artifact.status !== 'completed' || !path) {
    throw createError({
      statusCode: 404,
      statusMessage: `Proposal ${format.toUpperCase()} file not found. Generate the proposal first.`,
    })
  }
  let buffer: Buffer
  try {
    buffer = await downloadFile('proposals', path)
  } catch {
    throw createError({ statusCode: 404, statusMessage: `Proposal ${format.toUpperCase()} artifact is unavailable` })
  }

  setResponseHeader(event, 'Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="proposal-${id}.${format}"`)

  event.node.res.end(buffer)
})
