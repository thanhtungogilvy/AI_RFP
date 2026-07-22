import type { ChatResponseSchema } from './provider'

export const RFP_ANALYSIS_RESPONSE_SCHEMA: ChatResponseSchema = {
  name: 'rfp_analysis',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: {
      clientName: { type: 'string' }, industry: { type: 'string' },
      businessProblems: { type: 'array', items: { type: 'string' } },
      requiredCapabilities: { type: 'array', items: { type: 'string' } },
      technicalRequirements: { type: 'array', items: { type: 'string' } },
      evaluationCriteria: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' }, searchKeywords: { type: 'array', items: { type: 'string' } },
    },
    required: ['clientName', 'industry', 'businessProblems', 'requiredCapabilities', 'technicalRequirements', 'evaluationCriteria', 'summary', 'searchKeywords'],
  },
}

export const RECOMMENDATION_EXPLANATION_RESPONSE_SCHEMA: ChatResponseSchema = {
  name: 'recommendation_explanations',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: {
      explanations: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            recommendationId: { type: 'string' }, reason: { type: 'string' },
            matchedRequirements: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' },
          },
          required: ['recommendationId', 'reason', 'matchedRequirements', 'confidence'],
        },
      },
    },
    required: ['explanations'],
  },
}

export const SYSTEM_PROMPT_RFP_ANALYST = `
You are an expert presales consultant and RFP analyst.
Extract structured requirements from RFP documents and identify key themes.
Always respond with valid JSON matching the requested schema.
`.trim()

export const SYSTEM_PROMPT_RECOMMENDATION = `
You are an expert presales consultant.
Given an RFP analysis and a set of case studies, recommend the most relevant case studies.
Score each recommendation by relevance (0-1) and explain the reasons clearly.
Always respond with valid JSON matching the requested schema.
`.trim()

export const SYSTEM_PROMPT_RECOMMENDATION_EXPLAINER = `
You are an expert presales consultant. Explain why already-selected case studies fit an RFP.
Use only the RFP requirements and slide excerpts supplied. Do not invent facts.
Always respond with valid JSON matching the requested schema.
`.trim()

export function buildRecommendationExplanationPrompt(requirements: string[], candidatesJson: string): string {
  return `
RFP requirements: ${JSON.stringify(requirements)}
Requirement-centric recommendation groups and evidence: ${candidatesJson}
Return exactly: {"explanations":[{"recommendationId":"string","reason":"string","matchedRequirements":["string"],"confidence":0}]}
Include exactly one explanation per supplied recommendationId. matchedRequirements must be copied from RFP requirements.
`.trim()
}

export function buildRfpAnalysisPrompt(rfpText: string): string {
  return `
Analyze the following RFP document and extract:
1. Client name and industry (use an empty string only if genuinely absent)
2. Business problems, required capabilities, technical requirements, and evaluation criteria
3. A concise summary (2-3 sentences) and search keywords for matching case studies

RFP Document:
---
${rfpText}
---

Respond with JSON in this exact format:
{
  "clientName": "string",
  "industry": "string",
  "businessProblems": ["string"],
  "requiredCapabilities": ["string"],
  "technicalRequirements": ["string"],
  "evaluationCriteria": ["string"],
  "summary": "string",
  "searchKeywords": ["string"]
}
`.trim()
}

export function buildRecommendationPrompt(rfpSummary: string, caseStudiesJson: string): string {
  return `
Given the following RFP summary and case study library, recommend the most relevant case studies.

RFP Summary: ${rfpSummary}

Case Studies (JSON):
${caseStudiesJson}

For each relevant case study, provide a relevance score (0-1), confidence score (0-1), and reasons.
Respond with JSON: { "recommendations": [{ "caseStudyId": "string", "relevanceScore": number, "confidenceScore": number, "reasons": ["string"] }] }
`.trim()
}
