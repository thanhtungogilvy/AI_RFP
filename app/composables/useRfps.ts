import type { RfpDocument } from '~/types/rfp'

export interface RfpMetadataInput {
  title: string
  client: string
  industry: string
  deadline?: string
}

export const useRfps = () => {
  const rfps = ref<RfpDocument[]>([])
  const error = ref<string | null>(null)
  const actionState = createActionState(['fetching', 'uploading', 'analyzing', 'updating', 'replacing', 'deleting'] as const)

  const fetchAll = () => actionState.run('fetching', async () => {
    error.value = null
    try {
      const data = await $fetch<RfpDocument[]>('/api/rfps')
      rfps.value = data
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch RFPs'
    }
  })

  const upload = (file: File, meta: { title: string; client: string; industry: string; deadline?: string }) => actionState.run('uploading', async () => {
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', meta.title)
      formData.append('client', meta.client)
      formData.append('industry', meta.industry)
      if (meta.deadline) formData.append('deadline', meta.deadline)
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

  const fetchById = (rfpId: string) => actionState.run('fetching', async () => {
    error.value = null
    try {
      return await $fetch<RfpDocument>(`/api/rfps/${rfpId}`)
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to fetch RFP'
      throw caught
    }
  })

  const updateMetadata = (rfpId: string, metadata: RfpMetadataInput) => actionState.run('updating', async () => {
    error.value = null
    try {
      const updated = await $fetch<RfpDocument>(`/api/rfps/${rfpId}`, { method: 'PATCH', body: metadata })
      const index = rfps.value.findIndex(rfp => rfp.id === rfpId)
      if (index >= 0) rfps.value[index] = updated
      return updated
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to update RFP'
      throw caught
    }
  })

  const replaceFile = (rfpId: string, file: File) => actionState.run('replacing', async () => {
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      const updated = await $fetch<RfpDocument>(`/api/rfps/${rfpId}/file`, { method: 'PUT', body: formData })
      const index = rfps.value.findIndex(rfp => rfp.id === rfpId)
      if (index >= 0) rfps.value[index] = updated
      return updated
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to replace RFP file'
      throw caught
    }
  })

  const softDelete = (rfpId: string) => actionState.run('deleting', async () => {
    error.value = null
    try {
      await $fetch(`/api/rfps/${rfpId}`, { method: 'DELETE' })
      rfps.value = rfps.value.filter(rfp => rfp.id !== rfpId)
    } catch (caught: unknown) {
      error.value = caught instanceof Error ? caught.message : 'Failed to delete RFP'
      throw caught
    }
  })

  return {
    rfps, error, fetchAll, fetchById, upload, analyze, updateMetadata, replaceFile, softDelete,
    loading: actionState.loading,
    fetching: actionState.isActive('fetching'),
    uploading: actionState.isActive('uploading'),
    analyzing: actionState.isActive('analyzing'),
    updating: actionState.isActive('updating'),
    replacing: actionState.isActive('replacing'),
    deleting: actionState.isActive('deleting'),
  }
}
