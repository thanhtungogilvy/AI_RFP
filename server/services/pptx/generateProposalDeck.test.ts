import { describe, expect, it } from 'vitest'
import { generateProposalDeck } from './generateProposalDeck'

describe('generateProposalDeck', () => {
  it('generates a valid PPTX buffer without relying on static shape exports', async () => {
    const buffer = await generateProposalDeck({
      title: 'Proposal for Example Bank',
      rfp: {
        id: 'rfp-1', title: 'Modernisation RFP', client: 'Example Bank', industry: 'Banking',
        fileName: 'rfp.pdf', uploadedAt: '2026-07-15T00:00:00.000Z', status: 'analyzed',
      },
      caseStudies: [],
    })

    expect(buffer.subarray(0, 2).toString()).toBe('PK')
  })
})
