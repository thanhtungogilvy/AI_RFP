<script setup lang="ts">
const route = useRoute()

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/case-studies': 'Case Studies',
  '/case-studies/upload': 'Upload Case Study',
  '/rfps': 'RFP Documents',
  '/rfps/upload': 'Upload RFP',
}

const title = computed(() => pageTitles[route.path] ?? 'AI RFP Generator')
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-border bg-card px-6">
    <span class="text-sm font-medium text-foreground">{{ title }}</span>
    <div class="flex items-center gap-3">
      <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        P
      </span>
    </div>
  </header>
</template>
