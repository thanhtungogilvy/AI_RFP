<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="mb-6">
    <h1 class="text-xl font-semibold text-foreground">{{ title }}</h1>
    <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-3 flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
