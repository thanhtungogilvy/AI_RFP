<script setup lang="ts">
import type { CaseStudy } from '~/types/case-study'
import { getCaseStudyPreview } from '~/utils/caseStudyPreview'

interface Props {
  caseStudy: CaseStudy
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
    <div class="mb-2 flex items-start justify-between gap-2">
      <h3 class="text-sm font-semibold text-foreground leading-snug">{{ caseStudy.title }}</h3>
      <StatusBadge :status="caseStudy.status" />
    </div>
    <p class="text-xs text-muted-foreground mb-1">
      <span class="font-medium text-foreground">{{ caseStudy.client }}</span> &middot; {{ caseStudy.industry }}
    </p>
    <p class="mt-2 text-xs text-muted-foreground line-clamp-2">{{ getCaseStudyPreview(caseStudy) }}</p>
    <div class="mt-3 flex flex-wrap gap-1">
      <span
        v-for="tag in caseStudy.tags.slice(0, 4)"
        :key="tag"
        class="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
      >
        {{ tag }}
      </span>
    </div>
    <p class="mt-3 text-xs text-muted-foreground">
      {{ caseStudy.slides.length }} slides &middot; Uploaded {{ new Date(caseStudy.uploadedAt).toLocaleDateString() }}
    </p>
  </div>
</template>
