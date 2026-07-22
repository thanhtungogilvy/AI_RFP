/**
 * Typed Supabase DB query helpers.
 * A missing Supabase client is represented as null for callers to translate into a
 * dependency-unavailable response. Query failures are logged and sanitized.
 */
import type { CaseStudy, CaseStudySlide } from '~/types/case-study'
import type { RfpAnalysis, RfpDocument } from '~/types/rfp'
import type { ProposalGeneration } from '~/types/proposal'
import type { RequirementRecommendation } from '~/types/recommendation'
import { getSupabaseClient } from './client'
import type { CaseStudyRow, SlideRow, RfpRow, ProposalRow } from './types'
import { databaseFailure } from '../../utils/errors'
import { logError } from '../../utils/logger'

function throwDatabaseFailure(operation: string, error: unknown): never {
  logError('database_failure', error, { operation, dependency: 'supabase' })
  throw databaseFailure(error).toH3()
}

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
  const slides = (row.case_study_slides ?? []).map(mapSlide).sort((a, b) => a.slideIndex - b.slideIndex)
  const embeddedSlideCount = (row.case_study_slides ?? []).filter(slide => slide.embedding?.length).length
  const embeddingStatus: CaseStudy['embeddingStatus'] = row.status === 'processing'
    ? 'pending'
    : !slides.length || !embeddedSlideCount ? 'failed'
      : embeddedSlideCount === slides.length ? 'complete' : 'partial'
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    industry: row.industry,
    summary: row.summary,
    tags: row.tags,
    slides,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    status: row.status,
    embeddingStatus,
    embeddedSlideCount,
    totalSlideCount: slides.length,
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
    updatedAt: row.updated_at,
    status: row.status,
  }
}

function mapProposal(row: ProposalRow): ProposalGeneration {
  return {
    id: row.id,
    rfpId: row.rfp_id ?? '',
    title: row.title,
    status: row.status,
    selectedRequirementGroupIds: row.selected_requirement_group_ids,
    selectedCaseStudyIds: row.selected_case_study_ids,
    pptxUrl: row.pptx_url,
    pdfUrl: row.pdf_url,
    pdfStatus: row.pdf_status ?? 'not_requested',
    pdfErrorMessage: row.pdf_error_message ?? undefined,
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

  if (error) throwDatabaseFailure('list_case_studies', error)
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

  const { data: matches, error: matchError } = await (sb as any).rpc('search_case_studies', { search_text: query })
  if (matchError) throwDatabaseFailure('search_case_studies', matchError)
  const ids = (matches ?? []).map((match: { case_study_id: string }) => match.case_study_id)
  if (!ids.length) return []
  const { data, error } = await sb
    .from('case_studies')
    .select('*, case_study_slides(*)')
    .in('id', ids)
    .order('uploaded_at', { ascending: false })

  if (error) throwDatabaseFailure('load_search_case_studies', error)
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

  if (error) throwDatabaseFailure('insert_case_study', error)
  return mapCaseStudy(data as any)
}

export async function dbUpdateCaseStudyStatus(
  id: string,
  status: CaseStudy['status']
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const { error } = await (sb as any).from('case_studies').update({ status }).eq('id', id)
  if (error) throwDatabaseFailure('update_case_study_status', error)
}

export async function dbUpdateCaseStudyFilePath(id: string, filePath: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const { error } = await (sb as any)
    .from('case_studies')
    .update({ file_path: filePath })
    .eq('id', id)

  if (error) throwDatabaseFailure('update_case_study_file_path', error)
}

export async function dbInsertCaseStudySlides(
  caseStudyId: string,
  slides: Array<Pick<CaseStudySlide, 'slideIndex' | 'title' | 'content'> & { embedding?: number[] | null }>
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return

  const rows = slides.map(slide => ({
    case_study_id: caseStudyId,
    slide_index: slide.slideIndex,
    title: slide.title,
    content: slide.content,
    tags: [],
    embedding: slide.embedding ?? null,
  }))
  const { error } = await (sb as any).from('case_study_slides').insert(rows)

  if (error) throwDatabaseFailure('insert_case_study_slides', error)
}

export interface VectorSlideMatch {
  slideId: string
  caseStudyId: string
  caseStudyTitle: string
  caseStudyClient: string
  caseStudyIndustry: string
  slideIndex: number
  slideTitle: string
  slideContent: string
  similarity: number
}

export async function dbMatchCaseStudySlides(
  queryEmbedding: number[], matchThreshold = 0.45, matchCount = 20,
): Promise<VectorSlideMatch[]> {
  const sb = getSupabaseClient()
  if (!sb) throw new Error('Supabase vector search is not configured')
  const { data, error } = await (sb as any).rpc('match_case_study_slides', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })
  if (error) throw new Error(`Supabase vector search failed: ${error.message}`)
  return (data ?? []).map((row: any) => ({
    slideId: row.slide_id, caseStudyId: row.case_study_id,
    caseStudyTitle: row.case_study_title, caseStudyClient: row.case_study_client,
    caseStudyIndustry: row.case_study_industry, slideIndex: row.slide_index,
    slideTitle: row.slide_title, slideContent: row.slide_content, similarity: row.similarity,
  }))
}

// ── RFP Documents ─────────────────────────────────────────────────────────────

export async function dbGetRfps(): Promise<RfpDocument[] | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('rfp_documents')
    .select('*')
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) throwDatabaseFailure('list_rfps', error)
  return (data as RfpRow[]).map(mapRfp)
}

export async function dbGetRfpById(id: string): Promise<RfpDocument | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('rfp_documents')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return null
  return mapRfp(data as RfpRow)
}

export interface RfpDebugRecord extends RfpRow {
  embedding: number[] | null
}

export async function dbGetRfpDebugById(id: string): Promise<RfpDebugRecord | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await (sb as any)
    .from('rfp_documents')
    .select('id,title,client,industry,deadline,file_name,file_path,content,analysis,embedding,status,uploaded_at,created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as RfpDebugRecord
}

export async function dbInsertRfp(
  fields: Omit<RfpDocument, 'id'> & { id?: string; filePath?: string; content?: string; embedding?: number[] | null }
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
      embedding:   fields.embedding ?? null,
    } as any)
    .select('*')
    .single()

  if (error) throwDatabaseFailure('insert_rfp', error)
  return mapRfp(data as RfpRow)
}

export async function dbGetRfpAnalysisInput(id: string): Promise<{ text: string } | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any).from('rfp_documents').select('content').eq('id', id).is('deleted_at', null).single()
  if (error || !data) return null
  return typeof data.content === 'string' ? { text: data.content } : null
}

export async function dbSaveRfpAnalysis(id: string, analysis: RfpAnalysis): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ analysis }).eq('id', id)
  if (error) throwDatabaseFailure('save_rfp_analysis', error)
}

export async function dbUpdateRfpEmbedding(id: string, embedding: number[]): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ embedding }).eq('id', id)
  if (error) throwDatabaseFailure('update_rfp_embedding', error)
}

export async function dbGetRfpAnalysis(id: string): Promise<RfpAnalysis | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any).from('rfp_documents').select('analysis').eq('id', id).is('deleted_at', null).single()
  if (error || !data?.analysis) return null
  return data.analysis as RfpAnalysis
}

export async function dbUpdateRfpStatus(id: string, status: RfpDocument['status']): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ status }).eq('id', id)
  if (error) throwDatabaseFailure('update_rfp_status', error)
}

export async function dbUpdateRfpFilePath(id: string, filePath: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any).from('rfp_documents').update({ file_path: filePath }).eq('id', id)
  if (error) throwDatabaseFailure('update_rfp_file_path', error)
}

export type RfpMetadata = Pick<RfpDocument, 'title' | 'client' | 'industry' | 'deadline'>

export async function dbUpdateRfpMetadata(id: string, fields: RfpMetadata): Promise<RfpDocument | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await (sb as any)
    .from('rfp_documents')
    .update({
      title: fields.title,
      client: fields.client,
      industry: fields.industry,
      deadline: fields.deadline ?? null,
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()
  if (error || !data) return null
  return mapRfp(data as RfpRow)
}

export interface RfpFileReplacement {
  fileName: string
  filePath: string
  content: string
}

export async function dbReplaceRfpFile(id: string, fields: RfpFileReplacement): Promise<RfpDocument | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { data, error } = await (sb as any)
    .from('rfp_documents')
    .update({
      file_name: fields.fileName,
      file_path: fields.filePath,
      content: fields.content,
      analysis: null,
      embedding: null,
      status: 'uploaded',
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()
  if (error || !data) return null
  return mapRfp(data as RfpRow)
}

export async function dbSoftDeleteRfp(id: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any)
    .from('rfp_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throwDatabaseFailure('soft_delete_rfp', error)
}

export async function dbCountCaseStudiesIndexed(): Promise<number | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { count, error } = await (sb as any)
    .from('case_studies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'indexed')

  if (error) throwDatabaseFailure('count_case_studies_indexed', error)
  return count ?? 0
}

export async function dbCountRfpsAnalyzed(): Promise<number | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { count, error } = await (sb as any)
    .from('rfp_documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'analyzed')

  if (error) throwDatabaseFailure('count_rfps_analyzed', error)
  return count ?? 0
}

export async function dbCountProposalsGenerated(): Promise<number | null> {
  const sb = getSupabaseClient()
  if (!sb) return null

  const { count, error } = await (sb as any)
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .in('status', ['completed', 'error'])

  if (error) throwDatabaseFailure('count_proposals_generated', error)
  return count ?? 0
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
    selected_requirement_group_ids: proposal.selectedRequirementGroupIds,
    selected_case_study_ids: proposal.selectedCaseStudyIds,
    pptx_url:                proposal.pptxUrl,
    pptx_path:               null,
    pdf_url:                 proposal.pdfUrl,
    pdf_path:                null,
    pdf_status:              proposal.pdfStatus ?? 'not_requested',
    pdf_error_message:       proposal.pdfErrorMessage ?? null,
    created_at:              proposal.createdAt,
    completed_at:            proposal.completedAt ?? null,
  } as any)

  if (error) throwDatabaseFailure('update_proposal', error)
}

export interface ProposalUpdate {
  status?: ProposalGeneration['status']
  pptxPath?: string
  pptxUrl?: string | null
  pdfPath?: string | null
  pdfUrl?: string | null
  pdfStatus?: NonNullable<ProposalGeneration['pdfStatus']>
  pdfErrorMessage?: string | null
  errorMessage?: string | null
  completedAt?: string | null
}

export async function dbUpdateProposal(id: string, update: ProposalUpdate): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) throw createError({ statusCode: 503, statusMessage: 'Supabase is not configured' })
  const values: Record<string, unknown> = {}
  if (update.status !== undefined) values.status = update.status
  if (update.pptxPath !== undefined) values.pptx_path = update.pptxPath
  if (update.pptxUrl !== undefined) values.pptx_url = update.pptxUrl
  if (update.pdfPath !== undefined) values.pdf_path = update.pdfPath
  if (update.pdfUrl !== undefined) values.pdf_url = update.pdfUrl
  if (update.pdfStatus !== undefined) values.pdf_status = update.pdfStatus
  if (update.pdfErrorMessage !== undefined) values.pdf_error_message = update.pdfErrorMessage
  if (update.errorMessage !== undefined) values.error_message = update.errorMessage
  if (update.completedAt !== undefined) values.completed_at = update.completedAt
  const { error } = await (sb as any).from('proposals').update(values).eq('id', id)
  if (error) throwDatabaseFailure('update_proposal', error)
}

export interface ProposalArtifact {
  id: string
  status: ProposalGeneration['status']
  pptxPath: string | null
  pdfPath: string | null
}

export async function dbGetProposalArtifact(id: string): Promise<ProposalArtifact | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any).from('proposals').select('id,status,pptx_path,pdf_path').eq('id', id).single()
  if (error || !data) return null
  return { id: data.id, status: data.status, pptxPath: data.pptx_path, pdfPath: data.pdf_path }
}

// ── Recommendations Cache ─────────────────────────────────────────────────────

export async function dbGetRfpRecommendations(
  id: string,
): Promise<{ recommendations: RequirementRecommendation[]; generatedAt: Date } | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any)
    .from('rfp_documents')
    .select('recommendations,recommendations_generated_at')
    .eq('id', id)
    .single()
  if (error || !data?.recommendations) return null
  return {
    recommendations: data.recommendations as RequirementRecommendation[],
    generatedAt: new Date(data.recommendations_generated_at as string),
  }
}

export async function dbSaveRfpRecommendations(
  id: string,
  recommendations: RequirementRecommendation[],
): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any)
    .from('rfp_documents')
    .update({ recommendations, recommendations_generated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) logError('save_rfp_recommendations', error, { rfpId: id })
}

export async function dbClearRfpRecommendations(id: string): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  const { error } = await (sb as any)
    .from('rfp_documents')
    .update({ recommendations: null, recommendations_generated_at: null })
    .eq('id', id)
  if (error) logError('clear_rfp_recommendations', error, { rfpId: id })
}

export async function dbGetLatestIndexedCaseStudyAt(): Promise<Date | null> {
  const sb = getSupabaseClient()
  if (!sb) return null
  const { data, error } = await (sb as any)
    .from('case_studies')
    .select('uploaded_at')
    .eq('status', 'indexed')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return new Date(data.uploaded_at as string)
}
