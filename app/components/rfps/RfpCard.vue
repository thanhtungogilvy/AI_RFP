<script setup lang="ts">
import type { RfpDocument } from '~/types/rfp'

interface Props {
  rfp: RfpDocument
}

defineProps<Props>()
defineEmits<{ (e: 'analyze', id: string): void }>()
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
    <div class="mb-2 flex items-start justify-between gap-2">
      <h3 class="text-sm font-semibold text-foreground leading-snug">{{ rfp.title }}</h3>
      <StatusBadge :status="rfp.status" />
    </div>
    <p class="text-xs text-muted-foreground">
      <span class="font-medium text-foreground">{{ rfp.client }}</span> &middot; {{ rfp.industry }}
    </p>
    <p v-if="rfp.deadline" class="mt-1 text-xs text-muted-foreground">
      Deadline: <span class="text-foreground">{{ new Date(rfp.deadline).toLocaleDateString() }}</span>
    </p>
    <div class="mt-4 flex items-center gap-2">
      <NuxtLink
        v-if="rfp.status === 'analyzed'"
        :to="`/rfps/${rfp.id}/recommendations`"
        class="inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        View Recommendations
      </NuxtLink>
      <Button v-else-if="rfp.status === 'uploaded' || rfp.status === 'error'" size="sm" @click="$emit('analyze', rfp.id)">
        {{ rfp.status === 'error' ? 'Retry analysis' : 'Analyze RFP' }}
      </Button>
      <span v-else class="text-xs text-muted-foreground">Uploaded {{ new Date(rfp.uploadedAt).toLocaleDateString() }}</span>
    </div>
  </div>
</template>
