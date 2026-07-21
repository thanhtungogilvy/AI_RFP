import { describe, expect, it } from 'vitest'
import { createActionState } from '~/utils/actionState'

describe('createActionState', () => {
  it('exposes the active action while an operation is pending and clears it afterward', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => { resolve = done })
    const state = createActionState(['fetching', 'uploading'] as const)

    const operation = state.run('uploading', () => pending)
    expect(state.loading.value).toBe(true)
    expect(state.isActive('uploading').value).toBe(true)

    resolve()
    await operation
    expect(state.loading.value).toBe(false)
    expect(state.isActive('uploading').value).toBe(false)
  })
})
