import { generateProposal } from '../../services/proposal/generateProposal'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body || typeof body.rfpId !== 'string' || !Array.isArray(body.selectedRequirementGroupIds)) {
    throw createError({ statusCode: 400, statusMessage: 'rfpId and selectedRequirementGroupIds are required' })
  }

  const proposal = await generateProposal({
    rfpId: body.rfpId,
    selectedRequirementGroupIds: body.selectedRequirementGroupIds,
    includePdf: body.includePdf === true,
  })
  return proposal
})
