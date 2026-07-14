<script setup lang="ts">
const stats = [
  { label: 'Case Studies Indexed', value: '3', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { label: 'RFPs Uploaded', value: '2', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Proposals Generated', value: '1', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

const quickActions = [
  { label: 'Upload Case Study', to: '/case-studies/upload', description: 'Add PPTX files to the knowledge base' },
  { label: 'Upload RFP', to: '/rfps/upload', description: 'Start a new proposal from an RFP document' },
  { label: 'View Knowledge Base', to: '/case-studies', description: 'Browse indexed case studies' },
  { label: 'View RFP Documents', to: '/rfps', description: 'Manage uploaded RFPs' },
]
</script>

<template>
  <AppShell>
    <PageHeader
      title="Dashboard"
      description="Overview of your AI-powered proposal generator."
    />

    <!-- Stats -->
    <div class="mb-8 grid grid-cols-3 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <svg class="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="stat.icon" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-foreground">{{ stat.value }}</p>
          <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <h2 class="mb-3 text-sm font-semibold text-foreground">Quick Actions</h2>
    <div class="grid grid-cols-2 gap-4">
      <NuxtLink
        v-for="action in quickActions"
        :key="action.to"
        :to="action.to"
        class="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent hover:border-primary/30"
      >
        <p class="text-sm font-medium text-foreground">{{ action.label }}</p>
        <p class="mt-1 text-xs text-muted-foreground">{{ action.description }}</p>
      </NuxtLink>
    </div>
  </AppShell>
</template>
