import type { RfpDocument } from '~/types/rfp'
import { dbGetRfps } from '../../services/supabase/db'

const MOCK: RfpDocument[] = [
  {
    id: 'rfp-001',
    title: 'Core Banking System Modernisation RFP',
    client: 'ABC Bank',
    industry: 'Banking & Finance',
    deadline: '2025-09-30',
    fileName: 'abc-bank-core-banking-rfp.pdf',
    uploadedAt: '2025-07-10T09:00:00Z',
    status: 'analyzed',
  },
  {
    id: 'rfp-002',
    title: 'AI Customer Engagement Platform',
    client: 'RetailCo Vietnam',
    industry: 'Retail',
    deadline: '2025-08-15',
    fileName: 'retailco-ai-engagement-rfp.pdf',
    uploadedAt: '2025-07-12T14:00:00Z',
    status: 'uploaded',
  },
]

export default defineEventHandler(async () => {
  return (await dbGetRfps()) ?? MOCK
})
