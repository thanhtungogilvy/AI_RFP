import type { RequirementRecommendation, MatchedSlideExcerpt, RequirementSupportingCaseStudy } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'
import type { CaseStudy } from '~/types/case-study'
import { buildRecommendationQuery, generateEmbedding } from '../embeddings/generateEmbedding'
import { dbMatchCaseStudySlides, type VectorSlideMatch } from '../supabase/db'
import { explainRecommendations } from './explainRecommendations'
import { logError } from '../../utils/logger'

const MAX_RESULTS = 6
const MAX_CASE_STUDIES_PER_REQUIREMENT = 3
const MAX_SLIDES = 3

function round(value: number): number { return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000 }
function normalize(value: string): string { return value.replace(/\s+/g, ' ').trim() }
function excerpt(content: string): string { return normalize(content).slice(0, 280) }
function mean(values: number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length }
function terms(analysis: RfpAnalysis): string[] {
  return [...new Set([
    ...analysis.searchKeywords, analysis.industry, ...analysis.requiredCapabilities, ...analysis.technicalRequirements,
    ...analysis.summary.split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 3),
  ].map(value => normalize(value).toLowerCase()).filter(Boolean))]
}

function termTokens(value: string): string[] {
  return normalize(value).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3)
}

function scoreTermInSlide(term: string, slide: Pick<VectorSlideMatch, 'slideTitle' | 'slideContent'>): number {
  const text = `${slide.slideTitle} ${slide.slideContent}`.toLowerCase()
  const tokens = termTokens(term)
  if (!tokens.length) return text.includes(term.toLowerCase()) ? 1 : 0
  return tokens.filter(token => text.includes(token)).length
}

function reasons(analysis: RfpAnalysis, requirement: string, slides: MatchedSlideExcerpt[]): string[] {
  const strongest = slides[0]
  const found = analysis.searchKeywords.filter(keyword => slides.some(slide => slide.excerpt.toLowerCase().includes(keyword.toLowerCase())))
  return [
    `Addresses requirement: ${requirement}`,
    strongest
      ? `Strongest evidence: ${strongest.caseStudyClient} · slide ${strongest.slideIndex}${strongest.title ? `, ${strongest.title}` : ''} — ${strongest.excerpt}`
      : '',
    found.length ? `Matched RFP keywords: ${found.join(', ')}` : '',
  ].filter(Boolean)
}

function toSupportingCaseStudies(slides: VectorSlideMatch[]): RequirementSupportingCaseStudy[] {
  const byCaseStudy = new Map<string, VectorSlideMatch[]>()
  for (const slide of slides) {
    byCaseStudy.set(slide.caseStudyId, [...(byCaseStudy.get(slide.caseStudyId) ?? []), slide])
  }
  return [...byCaseStudy.values()]
    .map(group => ({
      caseStudyId: group[0]!.caseStudyId,
      caseStudyTitle: group[0]!.caseStudyTitle,
      caseStudyClient: group[0]!.caseStudyClient,
      caseStudyIndustry: group[0]!.caseStudyIndustry,
      relevanceScore: round(mean(group.map(item => item.similarity))),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_CASE_STUDIES_PER_REQUIREMENT)
}

function toRecommendation(
  analysis: RfpAnalysis,
  requirement: string,
  requirementType: RequirementRecommendation['requirementType'],
  matches: VectorSlideMatch[],
  selected: boolean,
): RequirementRecommendation {
  const sorted = [...matches].sort((a, b) => b.similarity - a.similarity).slice(0, MAX_SLIDES)
  const excerpts = sorted.map(slide => ({
    caseStudyId: slide.caseStudyId,
    caseStudyTitle: slide.caseStudyTitle,
    caseStudyClient: slide.caseStudyClient,
    caseStudyIndustry: slide.caseStudyIndustry,
    slideIndex: slide.slideIndex,
    title: slide.slideTitle,
    excerpt: excerpt(slide.slideContent),
    similarity: round(slide.similarity),
  }))
  const similarities = sorted.map(slide => slide.similarity)
  const supporting = toSupportingCaseStudies(sorted)
  return {
    id: `${analysis.rfpId}:${requirementType}:${normalize(requirement).toLowerCase()}`,
    rfpId: analysis.rfpId,
    requirement,
    requirementType,
    relevanceScore: round(0.7 * similarities[0]! + 0.3 * mean(similarities)),
    confidenceScore: round(mean(similarities)),
    reasons: reasons(analysis, requirement, excerpts),
    matchedRequirements: analysis.searchKeywords.filter(keyword => excerpts.some(slide => slide.excerpt.toLowerCase().includes(keyword.toLowerCase()))),
    matchedCaseStudies: supporting,
    matchedSlideExcerpts: excerpts,
    explanationSource: 'fallback',
    selected,
  }
}

interface RequirementCandidate {
  requirement: string
  requirementType: RequirementRecommendation['requirementType']
}

function requirementCandidates(analysis: RfpAnalysis): RequirementCandidate[] {
  const values: RequirementCandidate[] = [
    ...analysis.requiredCapabilities.map(value => ({ requirement: value, requirementType: 'capability' as const })),
    ...analysis.technicalRequirements.map(value => ({ requirement: value, requirementType: 'technical' as const })),
    ...analysis.evaluationCriteria.map(value => ({ requirement: value, requirementType: 'evaluation' as const })),
  ]
  if (!values.length) {
    values.push(...analysis.searchKeywords.map(value => ({ requirement: value, requirementType: 'keyword' as const })))
  }
  const seen = new Set<string>()
  return values.filter(item => {
    const key = `${item.requirementType}:${normalize(item.requirement).toLowerCase()}`
    if (!item.requirement.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function recommendationFromMatches(
  analysis: RfpAnalysis,
  candidates: RequirementCandidate[],
  allMatches: VectorSlideMatch[],
): RequirementRecommendation[] {
  const groups = candidates.map(candidate => {
    const scored = allMatches
      .map(match => {
        const tokenScore = scoreTermInSlide(candidate.requirement, match)
        if (!tokenScore) return null
        return { match, score: tokenScore + match.similarity }
      })
      .filter((item): item is { match: VectorSlideMatch; score: number } => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SLIDES)
      .map(item => item.match)

    return scored.length
      ? toRecommendation(analysis, candidate.requirement, candidate.requirementType, scored, false)
      : null
  }).filter((item): item is RequirementRecommendation => item !== null)

  return groups
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_RESULTS)
    .map((item, index) => ({ ...item, selected: index === 0 }))
}

function keywordRecommendations(analysis: RfpAnalysis, caseStudies: CaseStudy[]): RequirementRecommendation[] {
  const candidates = requirementCandidates(analysis)
  const keywordPool = terms(analysis)
  const recommendations = candidates.map(candidate => {
    const slideMatches: VectorSlideMatch[] = []
    for (const caseStudy of caseStudies) {
      for (const slide of caseStudy.slides) {
        const text = normalize([slide.title, slide.content, ...slide.tags].join(' ')).toLowerCase()
        const termScore = scoreTermInSlide(candidate.requirement, { slideTitle: slide.title, slideContent: slide.content })
        const keywordScore = keywordPool.filter(keyword => text.includes(keyword)).length
        const score = termScore * 2 + keywordScore
        if (!score) continue
        slideMatches.push({
          slideId: `${caseStudy.id}:${slide.slideIndex}`,
          caseStudyId: caseStudy.id,
          caseStudyTitle: caseStudy.title,
          caseStudyClient: caseStudy.client,
          caseStudyIndustry: caseStudy.industry,
          slideIndex: slide.slideIndex,
          slideTitle: slide.title,
          slideContent: slide.content,
          similarity: round(Math.min(1, score / 10)),
        })
      }
    }
    if (!slideMatches.length) return null
    return toRecommendation(analysis, candidate.requirement, candidate.requirementType, slideMatches, false)
  }).filter((item): item is RequirementRecommendation => item !== null)

  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_RESULTS)
    .map((item, index) => ({ ...item, selected: index === 0 }))
}

export interface RecommendationDependencies {
  generateEmbedding: typeof generateEmbedding
  matchSlides: typeof dbMatchCaseStudySlides
  explain: typeof explainRecommendations
}
const defaultDependencies: RecommendationDependencies = { generateEmbedding, matchSlides: dbMatchCaseStudySlides, explain: explainRecommendations }

export async function findRelevantCaseStudies(
  analysis: RfpAnalysis, caseStudies: CaseStudy[], deps: RecommendationDependencies = defaultDependencies,
): Promise<RequirementRecommendation[]> {
  let ranked: RequirementRecommendation[]
  const candidates = requirementCandidates(analysis)
  try {
    const query = buildRecommendationQuery(analysis)
    if (!query) ranked = keywordRecommendations(analysis, caseStudies)
    else {
      const matches = await deps.matchSlides(await deps.generateEmbedding(query))
      if (!matches.length) return []
      ranked = recommendationFromMatches(analysis, candidates, matches)
    }
  } catch (error) {
    logError('recommendation_vector_fallback', error, { rfpId: analysis.rfpId, dependency: 'vector_search' })
    ranked = keywordRecommendations(analysis, caseStudies)
  }

  if (!ranked.length) return []
  try {
    const explanations = await deps.explain(analysis, ranked)
    const byId = new Map(explanations.map(item => [item.recommendationId, item]))
    return ranked.map(item => ({
      ...item,
      reasons: [byId.get(item.id)!.reason],
      matchedRequirements: byId.get(item.id)!.matchedRequirements,
      confidenceScore: byId.get(item.id)!.confidence,
      explanationSource: 'ai' as const,
      explanationWarning: undefined,
    }))
  } catch (error) {
    logError('recommendation_explanation_fallback', error, { rfpId: analysis.rfpId, dependency: 'lm_studio' })
    return ranked.map(item => ({ ...item, explanationSource: 'fallback' as const, explanationWarning: 'AI explanation unavailable' }))
  }
}
