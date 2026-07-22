<script setup lang="ts">
import type { RfpDocument } from '~/types/rfp'

const route = useRoute()
const { fetchById, loading, error } = useRfps()
const rfp = ref<RfpDocument | null>(null)

onMounted(async () => {
  try {
    rfp.value = await fetchById(String(route.params.id))
  } catch {
    // The composable exposes the error state.
  }
})
</script>

<template>
  <AppShell>
    <PageHeader :title="rfp?.title ?? 'RFP Document'" description="RFP document details.">
      <template #actions>
        <NuxtLink to="/rfps"><Button variant="outline" size="sm">Back to RFPs</Button></NuxtLink>
        <NuxtLink v-if="rfp" :to="`/rfps/${rfp.id}/edit`"><Button size="sm">Edit</Button></NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="h-48 max-w-2xl animate-pulse rounded-lg bg-muted" />
    <div v-else-if="error" class="max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{{ error }}</div>
    <div v-else-if="rfp" class="max-w-2xl space-y-6">
      <section class="rounded-lg border border-border bg-card">
        <dl class="divide-y divide-border text-sm">
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">Client</dt><dd class="font-medium text-foreground">{{ rfp.client }}</dd></div>
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">Industry</dt><dd class="text-foreground">{{ rfp.industry || 'Not specified' }}</dd></div>
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">Deadline</dt><dd class="text-foreground">{{ rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : 'Not specified' }}</dd></div>
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">File</dt><dd class="text-foreground">{{ rfp.fileName }}</dd></div>
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">Status</dt><dd><StatusBadge :status="rfp.status" /></dd></div>
          <div class="grid grid-cols-[9rem_1fr] gap-4 p-4"><dt class="text-muted-foreground">Uploaded</dt><dd class="text-foreground">{{ new Date(rfp.uploadedAt).toLocaleString() }}</dd></div>
        </dl>
      </section>

      <div class="flex flex-wrap gap-2">
        <NuxtLink v-if="rfp.status === 'analyzed'" :to="`/rfps/${rfp.id}/recommendations`"><Button>View Recommendations</Button></NuxtLink>
        <NuxtLink :to="`/rfps/${rfp.id}/debug`"><Button variant="outline">Debug</Button></NuxtLink>
      </div>
    </div>
  </AppShell>
</template>