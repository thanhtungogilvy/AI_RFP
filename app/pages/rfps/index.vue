<script setup lang="ts">
const { rfps, loading, fetchAll } = useRfps()

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
    <EmptyState
      v-else-if="!rfps.length"
      title="No RFPs uploaded"
      description="Upload an RFP document to generate AI-powered recommendations."
    >
      <template #action>
        <NuxtLink to="/rfps/upload">
          <Button size="sm">Upload RFP</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 gap-4">
      <RfpCard v-for="rfp in rfps" :key="rfp.id" :rfp="rfp" />
    </div>
  </AppShell>
</template>
