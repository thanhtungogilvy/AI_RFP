import type { CaseStudy } from '~/types/case-study'

export interface CaseStudyUploadItemInput {
  id: string
  file: File
  title: string
  client: string
  industry: string
}

export interface CaseStudyUploadItemResult {
  id: string
  fileName: string
  status: 'success' | 'error'
  caseStudy?: CaseStudy
  error?: string
}

export interface CaseStudyUploadBatchResponse {
  total: number
  success: number
  failed: number
  results: CaseStudyUploadItemResult[]
}

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

  const uploadBatch = (items: CaseStudyUploadItemInput[]) => actionState.run('uploading', async () => {
    error.value = null
    try {
      const formData = new FormData()
      items.forEach((item) => {
        formData.append('files', item.file)
        formData.append('fileIds', item.id)
        formData.append(`title:${item.id}`, item.title)
        formData.append(`client:${item.id}`, item.client)
        formData.append(`industry:${item.id}`, item.industry)
      })
      const data = await $fetch<CaseStudyUploadBatchResponse>('/api/case-studies/upload', {
        method: 'POST',
        body: formData,
      })
      const succeeded = data.results
        .filter((result) => result.status === 'success' && result.caseStudy)
        .map((result) => result.caseStudy as CaseStudy)
      caseStudies.value.unshift(...succeeded)
      return data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to upload case study'
      throw caught
    }
  })

  const upload = (file: File, meta: { title: string; client: string; industry: string }) =>
    uploadBatch([{ id: `single-${Date.now()}`, file, title: meta.title, client: meta.client, industry: meta.industry }])

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
    caseStudies, error, fetchAll, upload, uploadBatch, search,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
    searching: actionState.isActive('searching'),
    uploading: actionState.isActive('uploading'),
  }
}
