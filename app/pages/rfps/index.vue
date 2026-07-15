<script setup lang="ts">
const { rfps, loading, fetchAll } = useRfps()
import { demoRfps } from '~/utils/demoData'
const displayRfps = computed(() => rfps.value.length ? rfps.value : demoRfps)

onMounted(fetchAll)
</script>

<template>
  <AppShell>
    <PageHeader title="RFP Documents" description="Uploaded RFP documents ready for AI analysis.">
      <template #actions>
        <NuxtLink to="/rfps/upload">
          <Button size="sm">Upload RFP</Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="h-36 animate-pulse rounded-lg bg-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="!rfps.length" class="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Demo RFP shown. <NuxtLink class="font-medium underline" to="/rfps/upload">Upload RFP</NuxtLink> to start a real analysis.</div>

    <!-- Grid -->
    <div v-if="displayRfps.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <RfpCard v-for="rfp in displayRfps" :key="rfp.id" :rfp="rfp" />
    </div>
  </AppShell>
</template>
