import type { RfpDocument } from '~/types/rfp'

export const useRfps = () => {
  const rfps = ref<RfpDocument[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAll = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<RfpDocument[]>('/api/rfps')
      rfps.value = data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to fetch RFPs'
    } finally {
      loading.value = false
    }
  }

  const upload = async (file: File, meta: { title: string; client: string; industry: string }) => {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', meta.title)
      formData.append('client', meta.client)
      formData.append('industry', meta.industry)
      const data = await $fetch<RfpDocument>('/api/rfps/upload', {
        method: 'POST',
        body: formData,
      })
      rfps.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.message ?? 'Failed to upload RFP'
      throw e
    } finally {
      loading.value = false
    }
  }

  const analyze = async (rfpId: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/rfps/${rfpId}/analyze`, { method: 'POST' })
    } catch (e: any) {
      error.value = e.message ?? 'Failed to analyze RFP'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { rfps, loading, error, fetchAll, upload, analyze }
}
