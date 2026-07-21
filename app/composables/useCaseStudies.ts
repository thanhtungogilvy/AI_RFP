import type { CaseStudy } from '~/types/case-study'

export const useCaseStudies = () => {
  const caseStudies = ref<CaseStudy[]>([])
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching', 'searching', 'uploading'] as const)

  const fetchAll = () => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<CaseStudy[]>('/api/case-studies')
      caseStudies.value = data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch case studies'
    }
  })

  const upload = (file: File, meta: { title: string; client: string; industry: string }) => actionState.run('uploading', async () => {
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', meta.title)
      formData.append('client', meta.client)
      formData.append('industry', meta.industry)
      const data = await $fetch<CaseStudy>('/api/case-studies/upload', {
        method: 'POST',
        body: formData,
      })
      caseStudies.value.unshift(data)
      return data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to upload case study'
      throw caught
    }
  })

  const search = (query: string) => actionState.run('searching', async () => {
    error.value = null
    try {
      const data = await $fetch<CaseStudy[]>('/api/case-studies/search', {
        query: { q: query },
      })
      caseStudies.value = data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to search case studies'
    }
  })

  return {
    caseStudies, error, fetchAll, upload, search,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
    searching: actionState.isActive('searching'),
    uploading: actionState.isActive('uploading'),
  }
}
