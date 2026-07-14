<script setup lang="ts">
type Status = 'processing' | 'indexed' | 'error' | 'uploaded' | 'analyzing' | 'analyzed' | 'pending' | 'generating' | 'completed'

interface Props {
  status: Status
}

const props = defineProps<Props>()

const config: Record<Status, { label: string; classes: string }> = {
  processing:  { label: 'Processing',  classes: 'bg-yellow-100 text-yellow-800' },
  indexed:     { label: 'Indexed',     classes: 'bg-green-100 text-green-800' },
  error:       { label: 'Error',       classes: 'bg-red-100 text-red-800' },
  uploaded:    { label: 'Uploaded',    classes: 'bg-blue-100 text-blue-800' },
  analyzing:   { label: 'Analyzing',   classes: 'bg-yellow-100 text-yellow-800' },
  analyzed:    { label: 'Analyzed',    classes: 'bg-green-100 text-green-800' },
  pending:     { label: 'Pending',     classes: 'bg-gray-100 text-gray-700' },
  generating:  { label: 'Generating',  classes: 'bg-yellow-100 text-yellow-800' },
  completed:   { label: 'Completed',   classes: 'bg-green-100 text-green-800' },
}

const badge = computed(() => config[props.status] ?? { label: props.status, classes: 'bg-gray-100 text-gray-700' })
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="badge.classes">
    {{ badge.label }}
  </span>
</template>
