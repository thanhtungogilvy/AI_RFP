import type { RfpDocument } from '~/types/rfp'

export const useRfps = () => {
  const rfps = ref<RfpDocument[]>([])
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching', 'uploading', 'analyzing'] as const)

  const fetchAll = () => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<RfpDocument[]>('/api/rfps')
      rfps.value = data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch RFPs'
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
      const data = await $fetch<RfpDocument>('/api/rfps/upload', {
        method: 'POST',
        body: formData,
      })
      rfps.value.unshift(data)
      return data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to upload RFP'
      throw caught
    }
  })

  const analyze = (rfpId: string) => actionState.run('analyzing', async () => {
    error.value = null
    try {
      await $fetch(`/api/rfps/${rfpId}/analyze`, { method: 'POST' })
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to analyze RFP'
      throw caught
    }
  })

  return {
    rfps, error, fetchAll, upload, analyze,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
    uploading: actionState.isActive('uploading'),
    analyzing: actionState.isActive('analyzing'),
  }
}
