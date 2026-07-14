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

export function buildRfpAnalysisPrompt(rfpText: string): string {
  return `
Analyze the following RFP document and extract:
1. A concise summary (2-3 sentences)
2. A list of specific requirements with category, description, and priority (high/medium/low)
3. Key themes (array of strings)

RFP Document:
---
${rfpText}
---

Respond with JSON in this exact format:
{
  "summary": "string",
  "requirements": [{ "id": "string", "category": "string", "description": "string", "priority": "high|medium|low" }],
  "keyThemes": ["string"]
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
