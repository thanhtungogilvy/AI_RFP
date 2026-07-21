import { generateProposal } from '../../services/proposal/generateProposal'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body || typeof body.rfpId !== 'string' || !Array.isArray(body.selectedCaseStudyIds)) {
    throw createError({ statusCode: 400, statusMessage: 'rfpId and selectedCaseStudyIds are required' })
  }

  const proposal = await generateProposal({
    rfpId: body.rfpId,
    selectedCaseStudyIds: body.selectedCaseStudyIds,
    includePdf: body.includePdf === true,
  })
  return proposal
})
