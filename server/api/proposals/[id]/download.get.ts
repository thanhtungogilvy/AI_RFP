import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { getPptxPath } from '../../../services/proposal/generateProposal'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing proposal id' })

  const filePath = getPptxPath(id)

  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: `Proposal file not found. Generate the proposal first.`,
    })
  }

  const buffer = await readFile(filePath)

  setResponseHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="proposal-${id}.pptx"`)
  setResponseHeader(event, 'Content-Length', String(buffer.length))

  return send(event, buffer)
})
