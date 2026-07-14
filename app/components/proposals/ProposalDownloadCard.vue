<script setup lang="ts">
import type { ProposalGeneration } from '~/types/proposal'

interface Props {
  proposal: ProposalGeneration
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-6">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-base font-semibold text-foreground">{{ proposal.title }}</h2>
      <StatusBadge :status="proposal.status" />
    </div>

    <p class="text-xs text-muted-foreground mb-6">
      Generated {{ new Date(proposal.createdAt).toLocaleString() }}
    </p>

    <div class="flex flex-wrap gap-3">
      <a
        v-if="proposal.pptxUrl"
        :href="proposal.pptxUrl"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        download
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download PPTX
      </a>
      <a
        v-if="proposal.pdfUrl"
        :href="proposal.pdfUrl"
        class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        download
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download PDF
      </a>
      <span v-if="!proposal.pptxUrl && !proposal.pdfUrl" class="text-sm text-muted-foreground">
        Files not yet available.
      </span>
    </div>
  </div>
</template>
