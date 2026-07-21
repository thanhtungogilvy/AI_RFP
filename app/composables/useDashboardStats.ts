interface DashboardStats {
  caseStudiesIndexed: number
  rfpsUploaded: number
  proposalsGenerated: number
}

const EMPTY_STATS: DashboardStats = {
  caseStudiesIndexed: 0,
  rfpsUploaded: 0,
  proposalsGenerated: 0,
}

export const useDashboardStats = () => {
  const stats = ref<DashboardStats>({ ...EMPTY_STATS })
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching'] as const)

  const fetch = () => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<DashboardStats>('/api/stats/counts')
      stats.value = data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch dashboard stats'
      stats.value = { ...EMPTY_STATS }
    }
  })

  return {
    stats,
    error,
    fetch,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
  }
}
