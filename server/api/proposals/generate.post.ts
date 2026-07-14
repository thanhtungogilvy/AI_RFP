import { generateProposal } from '../../services/proposal/generateProposal'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rfpId: string = body?.rfpId ?? 'rfp-001'
  const selectedCaseStudyIds: string[] = Array.isArray(body?.selectedCaseStudyIds)
    ? body.selectedCaseStudyIds
    : []

  const proposal = await generateProposal(rfpId, selectedCaseStudyIds)
  return proposal
})
