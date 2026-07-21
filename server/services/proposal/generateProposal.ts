import type { CaseStudy } from '~/types/case-study'
import type { ProposalGeneration } from '~/types/proposal'
import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import { generateProposalDeck } from '../pptx/generateProposalDeck'
import { buildProposalData } from './buildProposalData'
import { isSupabaseConfigured } from '../supabase/client'
import {
  dbGetCaseStudyById,
  dbGetRfpAnalysis,
  dbGetRfpById,
  dbInsertProposal,
  dbUpdateProposal,
  type ProposalUpdate,
} from '../supabase/db'
import { uploadFile } from '../supabase/storage'
import { canExportPdf, convertPptxToPdf } from '../pdf/convertProposal'
import { AppError, asAppError } from '../../utils/errors'

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export interface GenerateProposalInput {
  rfpId: string
  selectedCaseStudyIds: string[]
  includePdf?: boolean
}

export interface GenerateProposalDependencies {
  isConfigured: typeof isSupabaseConfigured
  getRfp: (id: string) => Promise<RfpDocument | null>
  getAnalysis: (id: string) => Promise<RfpAnalysis | null>
  getCaseStudy: (id: string) => Promise<CaseStudy | null>
  insertProposal: typeof dbInsertProposal
  updateProposal: (id: string, update: ProposalUpdate) => Promise<void>
  generateDeck: typeof generateProposalDeck
  uploadFile: typeof uploadFile
  canExportPdf: typeof canExportPdf
  convertPdf: typeof convertPptxToPdf
  newId: () => string
}

const defaultDependencies: GenerateProposalDependencies = {
  isConfigured: isSupabaseConfigured,
  getRfp: dbGetRfpById,
  getAnalysis: dbGetRfpAnalysis,
  getCaseStudy: dbGetCaseStudyById,
  insertProposal: dbInsertProposal,
  updateProposal: dbUpdateProposal,
  generateDeck: generateProposalDeck,
  uploadFile,
  canExportPdf,
  convertPdf: convertPptxToPdf,
  newId: () => `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}

function httpError(statusCode: number, statusMessage: string): Error {
  return createError({ statusCode, statusMessage })
}

export async function generateProposal(
  input: GenerateProposalInput,
  deps: GenerateProposalDependencies = defaultDependencies,
): Promise<ProposalGeneration> {
  if (!input.rfpId?.trim()) throw httpError(400, 'rfpId is required')
  if (!Array.isArray(input.selectedCaseStudyIds) || !input.selectedCaseStudyIds.length) {
    throw httpError(400, 'Select at least one indexed case study')
  }
  if (!input.selectedCaseStudyIds.every(id => typeof id === 'string' && id.trim())) {
    throw httpError(400, 'selectedCaseStudyIds must contain valid ids')
  }
  if (input.includePdf && !deps.canExportPdf()) throw httpError(422, 'PDF export is unavailable on this server')
  if (!deps.isConfigured()) throw httpError(503, 'Proposal generation requires Supabase configuration')

  const [rfp, analysis, ...selected] = await Promise.all([
    deps.getRfp(input.rfpId),
    deps.getAnalysis(input.rfpId),
    ...input.selectedCaseStudyIds.map(id => deps.getCaseStudy(id)),
  ])
  if (!rfp) throw httpError(404, 'RFP not found')
  if (rfp.status !== 'analyzed' || !analysis) throw httpError(409, 'RFP must be analyzed before generating a proposal')
  if (selected.some(item => !item || item.status !== 'indexed')) {
    throw httpError(400, 'Every selected case study must exist and be indexed')
  }

  const proposalId = deps.newId()
  const now = new Date().toISOString()
  const proposal: ProposalGeneration = {
    id: proposalId,
    rfpId: rfp.id,
    title: `Proposal for ${rfp.client}`,
    status: 'generating',
    selectedCaseStudyIds: input.selectedCaseStudyIds,
    pptxUrl: null,
    pdfUrl: null,
    pdfStatus: 'not_requested',
    createdAt: now,
  }
  await deps.insertProposal(proposal)

  try {
    const data = buildProposalData(rfp, analysis, selected as CaseStudy[])
    const buffer = await deps.generateDeck(data)
    const pptxPath = `${proposalId}/proposal.pptx`
    await deps.uploadFile('proposals', pptxPath, buffer, PPTX_MIME)
    const completedAt = new Date().toISOString()
    let pdfStatus: NonNullable<ProposalGeneration['pdfStatus']> = 'not_requested'
    let pdfUrl: string | null = null
    let pdfPath: string | null = null
    let pdfErrorMessage: string | undefined
    if (input.includePdf) {
      try {
        const pdf = await deps.convertPdf(buffer)
        pdfPath = `${proposalId}/proposal.pdf`
        await deps.uploadFile('proposals', pdfPath, pdf, 'application/pdf')
        pdfUrl = `/api/proposals/${proposalId}/download?format=pdf`
        pdfStatus = 'completed'
      } catch (error) {
        pdfStatus = 'error'
        pdfErrorMessage = error instanceof AppError ? error.publicMessage : 'PDF conversion failed'
      }
    }
    const completed: ProposalGeneration = {
      ...proposal,
      status: 'completed',
      pptxUrl: `/api/proposals/${proposalId}/download?format=pptx`,
      pdfUrl,
      pdfStatus,
      pdfErrorMessage,
      completedAt,
    }
    await deps.updateProposal(proposalId, {
      status: 'completed', pptxPath, pptxUrl: completed.pptxUrl,
      completedAt, pdfPath, pdfUrl, pdfStatus, pdfErrorMessage: pdfErrorMessage ?? null, errorMessage: null,
    })
    return completed
  } catch (error) {
    const errorMessage = asAppError(error).publicMessage
    await deps.updateProposal(proposalId, { status: 'error', errorMessage }).catch(() => undefined)
    throw error
  }
}
