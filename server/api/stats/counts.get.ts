import { dbCountCaseStudiesIndexed, dbCountProposalsGenerated, dbCountRfpsAnalyzed } from '../../services/supabase/db'
import { isSupabaseConfigured } from '../../services/supabase/client'

interface Dependencies {
  isSupabaseConfigured: typeof isSupabaseConfigured
  countCaseStudiesIndexed: typeof dbCountCaseStudiesIndexed
  countRfpsAnalyzed: typeof dbCountRfpsAnalyzed
  countProposalsGenerated: typeof dbCountProposalsGenerated
}

const defaultDependencies: Dependencies = {
  isSupabaseConfigured,
  countCaseStudiesIndexed: dbCountCaseStudiesIndexed,
  countRfpsAnalyzed: dbCountRfpsAnalyzed,
  countProposalsGenerated: dbCountProposalsGenerated,
}

export async function handleDashboardStats(deps: Dependencies = defaultDependencies) {
  if (!deps.isSupabaseConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Dashboard stats require Supabase configuration',
    })
  }

  const [caseStudiesIndexed, rfpsUploaded, proposalsGenerated] = await Promise.all([
    deps.countCaseStudiesIndexed(),
    deps.countRfpsAnalyzed(),
    deps.countProposalsGenerated(),
  ])

  return {
    caseStudiesIndexed: caseStudiesIndexed ?? 0,
    rfpsUploaded: rfpsUploaded ?? 0,
    proposalsGenerated: proposalsGenerated ?? 0,
  }
}

export default defineEventHandler(() => handleDashboardStats())
