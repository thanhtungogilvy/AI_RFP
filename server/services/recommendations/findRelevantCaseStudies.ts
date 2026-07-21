import type { CaseStudyRecommendation, MatchedSlideExcerpt } from '~/types/recommendation'
import type { RfpAnalysis } from '~/types/rfp'
import type { CaseStudy } from '~/types/case-study'
import { buildRecommendationQuery, generateEmbedding } from '../embeddings/generateEmbedding'
import { dbMatchCaseStudySlides, type VectorSlideMatch } from '../supabase/db'
import { explainRecommendations } from './explainRecommendations'

const MAX_RESULTS = 5
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

function reasons(analysis: RfpAnalysis, slides: MatchedSlideExcerpt[]): string[] {
  const strongest = slides[0]
  const found = analysis.searchKeywords.filter(keyword => slides.some(slide => slide.excerpt.toLowerCase().includes(keyword.toLowerCase())))
  return [
    strongest ? `Strongest evidence: slide ${strongest.slideIndex}${strongest.title ? `, ${strongest.title}` : ''} — ${strongest.excerpt}` : '',
    found.length ? `Matched RFP keywords: ${found.join(', ')}` : '',
  ].filter(Boolean)
}

function toRecommendation(
  analysis: RfpAnalysis, match: VectorSlideMatch[], selected: boolean,
): CaseStudyRecommendation {
  const sorted = [...match].sort((a, b) => b.similarity - a.similarity).slice(0, MAX_SLIDES)
  const excerpts = sorted.map(slide => ({ slideIndex: slide.slideIndex, title: slide.slideTitle, excerpt: excerpt(slide.slideContent), similarity: round(slide.similarity) }))
  const similarities = sorted.map(slide => slide.similarity)
  return {
    id: `${analysis.rfpId}:${sorted[0]!.caseStudyId}`,
    rfpId: analysis.rfpId,
    caseStudyId: sorted[0]!.caseStudyId,
    caseStudyTitle: sorted[0]!.caseStudyTitle,
    caseStudyClient: sorted[0]!.caseStudyClient,
    caseStudyIndustry: sorted[0]!.caseStudyIndustry,
    relevanceScore: round(0.7 * similarities[0]! + 0.3 * mean(similarities)),
    confidenceScore: round(mean(similarities)),
    reasons: reasons(analysis, excerpts),
    matchedRequirements: analysis.searchKeywords.filter(keyword => excerpts.some(slide => slide.excerpt.toLowerCase().includes(keyword.toLowerCase()))),
    matchedSlideExcerpts: excerpts,
    explanationSource: 'fallback',
    selected,
  }
}

function keywordRecommendations(analysis: RfpAnalysis, caseStudies: CaseStudy[]): CaseStudyRecommendation[] {
  const keywords = terms(analysis)
  const scored = caseStudies.map(caseStudy => {
    const matches = caseStudy.slides.map(slide => {
      const text = normalize([slide.title, slide.content, ...slide.tags].join(' ')).toLowerCase()
      const count = keywords.filter(keyword => text.includes(keyword)).length
      return { slide, count }
    }).filter(item => item.count > 0)
    const metadata = normalize([caseStudy.title, caseStudy.client, caseStudy.industry, caseStudy.summary, ...caseStudy.tags].join(' ')).toLowerCase()
    const score = matches.reduce((sum, item) => sum + item.count, 0) + keywords.filter(keyword => metadata.includes(keyword)).length
    return { caseStudy, matches, score }
  }).filter(item => item.score > 0)
  const maximum = Math.max(0, ...scored.map(item => item.score))
  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS).map((entry, index) => {
    const slideMatches: VectorSlideMatch[] = entry.matches.sort((a, b) => b.count - a.count).slice(0, MAX_SLIDES).map(match => ({
      slideId: `${entry.caseStudy.id}:${match.slide.slideIndex}`, caseStudyId: entry.caseStudy.id,
      caseStudyTitle: entry.caseStudy.title, caseStudyClient: entry.caseStudy.client, caseStudyIndustry: entry.caseStudy.industry,
      slideIndex: match.slide.slideIndex, slideTitle: match.slide.title, slideContent: match.slide.content,
      similarity: match.count / maximum,
    }))
    if (!slideMatches.length) slideMatches.push({ slideId: entry.caseStudy.id, caseStudyId: entry.caseStudy.id, caseStudyTitle: entry.caseStudy.title, caseStudyClient: entry.caseStudy.client, caseStudyIndustry: entry.caseStudy.industry, slideIndex: 0, slideTitle: '', slideContent: entry.caseStudy.summary || entry.caseStudy.title, similarity: entry.score / maximum })
    return toRecommendation(analysis, slideMatches, index === 0)
  })
}

export interface RecommendationDependencies {
  generateEmbedding: typeof generateEmbedding
  matchSlides: typeof dbMatchCaseStudySlides
  explain: typeof explainRecommendations
}
const defaultDependencies: RecommendationDependencies = { generateEmbedding, matchSlides: dbMatchCaseStudySlides, explain: explainRecommendations }

export async function findRelevantCaseStudies(
  analysis: RfpAnalysis, caseStudies: CaseStudy[], deps: RecommendationDependencies = defaultDependencies,
): Promise<CaseStudyRecommendation[]> {
  let ranked: CaseStudyRecommendation[]
  try {
    const query = buildRecommendationQuery(analysis)
    if (!query) ranked = keywordRecommendations(analysis, caseStudies)
    else {
      const matches = await deps.matchSlides(await deps.generateEmbedding(query))
      if (!matches.length) return []
      const groups = new Map<string, VectorSlideMatch[]>()
      for (const match of matches) groups.set(match.caseStudyId, [...(groups.get(match.caseStudyId) ?? []), match])
      ranked = [...groups.values()].map((group, index) => toRecommendation(analysis, group, index === 0))
        .sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, MAX_RESULTS).map((item, index) => ({ ...item, selected: index === 0 }))
    }
  } catch (error) {
    console.error('Semantic case-study recommendation failed; using keyword fallback', error)
    ranked = keywordRecommendations(analysis, caseStudies)
  }

  if (!ranked.length) return []
  try {
    const explanations = await deps.explain(analysis, ranked)
    const byId = new Map(explanations.map(item => [item.caseStudyId, item]))
    return ranked.map(item => ({
      ...item,
      reasons: [byId.get(item.caseStudyId)!.reason],
      matchedRequirements: byId.get(item.caseStudyId)!.matchedRequirements,
      confidenceScore: byId.get(item.caseStudyId)!.confidence,
      explanationSource: 'ai' as const,
      explanationWarning: undefined,
    }))
  } catch (error) {
    console.error('AI recommendation explanation failed; using deterministic explanation', error)
    return ranked.map(item => ({ ...item, explanationSource: 'fallback' as const, explanationWarning: 'AI explanation unavailable' }))
  }
}
