<script setup lang="ts">
interface Props {
  accept?: string
  label?: string
  hint?: string
  loading?: boolean
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.pptx,.pdf,.docx',
  label: 'Drop your file here or click to browse',
  hint: 'PPTX, PDF, DOCX up to 50MB',
  multiple: false,
})

const emit = defineEmits<{
  (e: 'file', file: File): void
  (e: 'files', files: File[]): void
}>()

const isDragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (!files.length) return
  if (props.multiple) emit('files', files)
  else emit('file', files[0] as File)
}

function onFileInput(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  if (props.multiple) emit('files', files)
  else emit('file', files[0] as File)
}

function openPicker() {
  inputRef.value?.click()
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-10 text-center transition-colors"
    :class="{ 'border-primary bg-accent': isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="openPicker"
  >
    <input ref="inputRef" type="file" class="sr-only" :accept="props.accept" :multiple="props.multiple" @change="onFileInput" />
    <svg class="mb-3 h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
    <p class="text-sm font-medium text-foreground">{{ loading ? 'Uploading...' : props.label }}</p>
    <p class="mt-1 text-xs text-muted-foreground">{{ props.hint }}</p>
  </div>
</template>
