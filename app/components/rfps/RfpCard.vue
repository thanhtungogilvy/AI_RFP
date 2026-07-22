<script setup lang="ts">
import { Bug, Eye, Pencil, Trash2 } from 'lucide-vue-next'
import type { RfpDocument } from '~/types/rfp'

interface Props {
  rfp: RfpDocument
  deleting?: boolean
}

defineProps<Props>()
const emit = defineEmits<{ (e: 'analyze' | 'delete', id: string): void }>()
const deleteOpen = ref(false)

function confirmDelete(id: string) {
  deleteOpen.value = false
  emit('delete', id)
}
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
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <NuxtLink
        :to="`/rfps/${rfp.id}`"
        class="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent"
      >
        <Eye class="mr-1 h-3.5 w-3.5" /> View
      </NuxtLink>
      <NuxtLink
        :to="`/rfps/${rfp.id}/edit`"
        class="inline-flex h-7 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-accent"
      >
        <Pencil class="mr-1 h-3.5 w-3.5" /> Edit
      </NuxtLink>
      <NuxtLink
        :to="`/rfps/${rfp.id}/debug`"
        class="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-accent"
        title="Debug RFP"
      >
        <Bug class="h-3.5 w-3.5" />
        <span class="sr-only">Debug RFP</span>
      </NuxtLink>
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
      <Dialog v-model:open="deleteOpen">
        <DialogTrigger as-child>
          <Button variant="ghost" size="icon" :disabled="deleting" title="Delete RFP">
            <Trash2 class="h-4 w-4 text-destructive" />
            <span class="sr-only">Delete RFP</span>
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete RFP document?</DialogTitle>
            <DialogDescription>This removes the document from active RFPs. You can no longer analyze it or generate proposals from it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose as-child><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" @click="confirmDelete(rfp.id)">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>
