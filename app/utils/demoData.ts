import type { CaseStudy } from '~/types/case-study'
import type { RfpDocument } from '~/types/rfp'

export const demoCaseStudies: CaseStudy[] = [{ id: 'demo-cs-banking', title: 'Core Banking Modernisation', client: 'Example Bank', industry: 'Banking & Finance', summary: 'Cloud migration and resilient digital banking platform.', tags: ['cloud', 'banking'], slides: [], fileName: 'demo-banking.pptx', uploadedAt: new Date().toISOString(), status: 'indexed' }]
export const demoRfps: RfpDocument[] = [{ id: 'demo-rfp-banking', title: 'Digital Banking Transformation RFP', client: 'Example Bank', industry: 'Banking & Finance', fileName: 'demo-rfp.pdf', uploadedAt: new Date().toISOString(), status: 'analyzed' }]

export function statusLabel(status: string): string {
  return ({ uploaded: 'Pending', processing: 'Processing', pending: 'Pending', indexed: 'Indexed', analyzing: 'Processing', analyzed: 'Analyzed', generating: 'Processing', generated: 'Generated', completed: 'Generated', error: 'Failed', failed: 'Failed' } as Record<string, string>)[status] ?? 'Pending'
}
