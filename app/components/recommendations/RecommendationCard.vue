<script setup lang="ts">
import type { CaseStudyRecommendation } from '~/types/recommendation'

interface Props {
  recommendation: CaseStudyRecommendation
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'toggle', id: string): void }>()

const scoreColor = computed(() => {
  const s = props.recommendation.relevanceScore
  if (s >= 0.8) return 'text-green-600'
  if (s >= 0.6) return 'text-yellow-600'
  return 'text-muted-foreground'
})
</script>

<template>
  <div
    class="rounded-lg border bg-card p-4 transition-colors"
    :class="recommendation.selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'"
  >
    <div class="flex items-start gap-3">
      <input
        type="checkbox"
        :checked="recommendation.selected"
        class="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
        @change="emit('toggle', recommendation.id)"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-foreground">{{ recommendation.caseStudyTitle }}</h3>
          <span class="shrink-0 text-sm font-bold" :class="scoreColor">
            {{ Math.round(recommendation.relevanceScore * 100) }}%
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ recommendation.caseStudyClient }} &middot; {{ recommendation.caseStudyIndustry }}
        </p>
        <p v-if="recommendation.reasons[0]" class="mt-3 text-xs text-foreground"><span class="font-semibold">Why recommended:</span> {{ recommendation.reasons[0] }}</p>
        <div v-if="recommendation.matchedRequirements.length" class="mt-3 flex flex-wrap gap-1">
          <span v-for="requirement in recommendation.matchedRequirements" :key="requirement" class="rounded bg-secondary px-1.5 py-0.5 text-xs">{{ requirement }}</span>
        </div>
        <ul v-if="recommendation.reasons.length > 1" class="mt-2 space-y-1">
          <li
            v-for="reason in recommendation.reasons"
            :key="reason"
            class="flex items-start gap-1.5 text-xs text-muted-foreground"
          >
            <svg class="mt-0.5 h-3 w-3 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ reason }}
          </li>
        </ul>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ recommendation.explanationSource === 'ai' ? 'AI confidence' : 'Evidence confidence' }}: <span class="font-medium text-foreground">{{ Math.round(recommendation.confidenceScore * 100) }}%</span>
        </p>
        <p v-if="recommendation.explanationWarning" class="mt-2 text-xs text-amber-700">{{ recommendation.explanationWarning }}. Showing deterministic evidence instead.</p>
        <div v-if="recommendation.matchedSlideExcerpts.length" class="mt-3 space-y-2">
          <div v-for="slide in recommendation.matchedSlideExcerpts" :key="slide.slideIndex" class="rounded border border-border p-2 text-xs">
            <p class="font-medium">Slide {{ slide.slideIndex }}{{ slide.title ? `: ${slide.title}` : '' }} · {{ Math.round(slide.similarity * 100) }}%</p>
            <p class="mt-1 text-muted-foreground">{{ slide.excerpt }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
