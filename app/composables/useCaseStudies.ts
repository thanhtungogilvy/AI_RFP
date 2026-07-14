import type { CaseStudy } from '~/types/case-study'

export const useCaseStudies = () => {
  const caseStudies = ref<CaseStudy[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAll = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<CaseStudy[]>('/api/case-studies')
      caseStudies.value = data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to fetch case studies'
    } finally {
      loading.value = false
    }
  }

  const upload = async (file: File) => {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await $fetch<CaseStudy>('/api/case-studies/upload', {
        method: 'POST',
        body: formData,
      })
      caseStudies.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to upload case study'
      throw e
    } finally {
      loading.value = false
    }
  }

  const search = async (query: string) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<CaseStudy[]>('/api/case-studies/search', {
        query: { q: query },
      })
      caseStudies.value = data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to search case studies'
    } finally {
      loading.value = false
    }
  }

  return { caseStudies, loading, error, fetchAll, upload, search }
}
