/**
 * Typed Supabase DB query helpers.
 * All functions return null when Supabase is not configured — callers use mock data.
 * All functions throw createError on Supabase query errors.
 */
import type { CaseStudy, CaseStudySlide } from '~/types/case-study'
import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import type { ProposalGeneration } from '~/types/proposal'
import { getSupabaseClient } from './client'
import type { CaseStudyRow, SlideRow, RfpRow, ProposalRow } from './types'

// ── Row → Type mappers ────────────────────────────────────────────────────────

function mapSlide(row: SlideRow): CaseStudySlide {
  return {
    slideIndex: row.slide_index,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    tags: row.tags,
  }
}

function mapCaseStudy(row: CaseStudyRow & { case_study_slides?: SlideRow[] }): CaseStudy {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    industry: row.industry,
    summary: row.summary,
    tags: row.tags,
    slides: (row.case_study_slides ?? []).map(mapSlide).sort((a, b) => a.slideIndex - b.slideIndex),
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    status: row.status,
  }
}

function mapRfp(row: RfpRow): RfpDocument {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    industry: row.industry,
    deadline: row.deadline ?? undefined,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    status: row.status,
  }
}

function mapProposal(row: ProposalRow): ProposalGeneration {
  return {
    id: row.id,
    rfpId: row.rfp_id ?? '',
    title: row.title,
    status: row.status,
    selectedCaseStudyIds: row.selected_case_study_ids,
    pptxUrl: row.pptx_url,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
  }
}

// ── Case Studies ──────────────────────────────────────────────────────────────

export async function dbGetCaseStudies(): Promise<CaseStudy[] | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('case_studies')
    .select('*, case_study_slides(*)')
    .order('uploaded_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data as any[]).map(mapCaseStudy)
}

export async function dbGetCaseStudyById(id: string): Promise<CaseStudy | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('case_studies')
    .select('*, case_study_slides(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return mapCaseStudy(data as any)
}

export async function dbSearchCaseStudies(query: string): Promise<CaseStudy[] | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const q = `%${query.toLowerCase()}%`

  const { data, error } = await sb
    .from('case_studies')
    .select('*, case_study_slides(*)')
    .or(`title.ilike.${q},client.ilike.${q},industry.ilike.${q},summary.ilike.${q}`)
    .order('uploaded_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data as any[]).map(mapCaseStudy)
}

export async function dbInsertCaseStudy(
  fields: Omit<CaseStudy, 'slides'>
): Promise<CaseStudy | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('case_studies')
    .insert({
      title:       fields.title,
      client:      fields.client,
      industry:    fields.industry,
      summary:     fields.summary,
      tags:        fields.tags,
      file_name:   fields.fileName,
      status:      fields.status,
      uploaded_at: fields.uploadedAt,
    } as any)
    .select('*, case_study_slides(*)')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return mapCaseStudy(data as any)
}

export async function dbUpdateCaseStudyStatus(
  id: string,
  status: CaseStudy['status']
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const { error } = await (sb as any).from('case_studies').update({ status }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function dbUpdateCaseStudyFilePath(id: string, filePath: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const { error } = await (sb as any)
    .from('case_studies')
    .update({ file_path: filePath })
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function dbInsertCaseStudySlides(
  caseStudyId: string,
  slides: Array<Pick<CaseStudySlide, 'slideIndex' | 'title' | 'content'>>
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const rows = slides.map(slide => ({
    case_study_id: caseStudyId,
    slide_index: slide.slideIndex,
    title: slide.title,
    content: slide.content,
    tags: [],
  }))
  const { error } = await (sb as any).from('case_study_slides').insert(rows)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// ── RFP Documents ─────────────────────────────────────────────────────────────

export async function dbGetRfps(): Promise<RfpDocument[] | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('rfp_documents')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data as RfpRow[]).map(mapRfp)
}

export async function dbGetRfpById(id: string): Promise<RfpDocument | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('rfp_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return mapRfp(data as RfpRow)
}

export async function dbInsertRfp(
  fields: Omit<RfpDocument, 'id'> & { id?: string; filePath?: string; content?: string }
): Promise<RfpDocument | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('rfp_documents')
    .insert({
      id:          fields.id,
      title:       fields.title,
      client:      fields.client,
      industry:    fields.industry,
      deadline:    fields.deadline ?? null,
      file_name:   fields.fileName,
      status:      fields.status,
      uploaded_at: fields.uploadedAt,
      file_path:   fields.filePath ?? null,
      content:     fields.content ?? '',
    } as any)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return mapRfp(data as RfpRow)
}

export async function dbGetRfpAnalysisInput(id: string): Promise<{ text: string } | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any).from('rfp_documents').select('content').eq('id', id).single()
  if (error || !data) return null
  return typeof data.content === 'string' ? { text: data.content } : null
}

export async function dbSaveRfpAnalysis(id: string, analysis: RfpAnalysis): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ analysis }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function dbGetRfpAnalysis(id: string): Promise<RfpAnalysis | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any).from('rfp_documents').select('analysis').eq('id', id).single()
  if (error || !data?.analysis) return null
  return data.analysis as RfpAnalysis
}

export async function dbUpdateRfpStatus(id: string, status: RfpDocument['status']): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ status }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function dbUpdateRfpFilePath(id: string, filePath: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ file_path: filePath }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export async function dbGetProposalById(id: string): Promise<ProposalGeneration | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return mapProposal(data as ProposalRow)
}

export async function dbInsertProposal(
  proposal: ProposalGeneration
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const { error } = await sb.from('proposals').insert({
    id:                      proposal.id,
    rfp_id:                  proposal.rfpId || null,
    title:                   proposal.title,
    status:                  proposal.status,
    selected_case_study_ids: proposal.selectedCaseStudyIds,
    pptx_url:                proposal.pptxUrl,
    pdf_url:                 proposal.pdfUrl,
    created_at:              proposal.createdAt,
    completed_at:            proposal.completedAt ?? null,
  } as any)

  if (error) {
    // Log but don't crash — PPTX was already generated successfully
    console.error('[Supabase] Failed to persist proposal record:', error.message)
  }
}
