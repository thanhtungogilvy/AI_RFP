<script setup lang="ts">
defineProps<{
  steps: { id: string; label: string }[]
  currentStep: string | null
  error?: string | null
}>()
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-6">
    <p class="mb-4 text-xs font-semibold text-foreground">Analyzing recommendations...</p>
    <ul class="space-y-3">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="flex items-center gap-3 text-sm"
      >
        <!-- State icon -->
        <span class="flex h-5 w-5 shrink-0 items-center justify-center">
          <!-- error on current step -->
          <template v-if="error && currentStep === step.id">
            <svg class="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </template>
          <!-- active spinner -->
          <template v-else-if="currentStep === step.id">
            <svg class="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </template>
          <!-- done checkmark (steps before current) -->
          <template v-else-if="currentStep && steps.findIndex(s => s.id === currentStep) > index">
            <svg class="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </template>
          <!-- pending dot -->
          <template v-else>
            <span class="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </template>
        </span>

        <!-- Label -->
        <span
          :class="[
            currentStep === step.id ? 'font-medium text-foreground' : 'text-muted-foreground',
            error && currentStep === step.id ? 'text-destructive' : '',
          ]"
        >
          {{ step.label }}
        </span>
      </li>
    </ul>

    <p v-if="error" class="mt-4 text-xs text-destructive">{{ error }}</p>
  </div>
</template>
