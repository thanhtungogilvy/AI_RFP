import { computed, ref } from 'vue'

export function createActionState<const T extends string>(actions: readonly T[]) {
  const active = ref<T | null>(null)

  return {
    active,
    loading: computed(() => active.value !== null),
    isActive: (action: T) => computed(() => active.value === action),
    async run<R>(action: T, operation: () => Promise<R>): Promise<R> {
      if (!actions.includes(action)) throw new Error(`Unknown action: ${action}`)
      active.value = action
      try {
        return await operation()
      } finally {
        active.value = null
      }
    },
  }
}
