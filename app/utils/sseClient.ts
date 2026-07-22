export interface SseProgressEvent {
  type: 'progress'
  step: string
  message: string
}

export interface SseDoneEvent<T> {
  type: 'done'
  data: T
}

export interface SseErrorEvent {
  type: 'error'
  message: string
}

export type SseEvent<T> = SseProgressEvent | SseDoneEvent<T> | SseErrorEvent

export interface SseClient<T> {
  onProgress: (cb: (step: string, message: string) => void) => SseClient<T>
  onDone: (cb: (data: T) => void) => SseClient<T>
  onError: (cb: (message: string) => void) => SseClient<T>
  close: () => void
}

export function openSseStream<T>(url: string): SseClient<T> {
  const es = new EventSource(url)
  let progressCb: ((step: string, message: string) => void) | null = null
  let doneCb: ((data: T) => void) | null = null
  let errorCb: ((message: string) => void) | null = null

  es.onmessage = (ev) => {
    let parsed: SseEvent<T>
    try {
      parsed = JSON.parse(ev.data) as SseEvent<T>
    } catch {
      return
    }

    if (parsed.type === 'progress') {
      progressCb?.(parsed.step, parsed.message)
    } else if (parsed.type === 'done') {
      doneCb?.(parsed.data)
      es.close()
    } else if (parsed.type === 'error') {
      errorCb?.(parsed.message)
      es.close()
    }
  }

  es.onerror = () => {
    errorCb?.('Connection lost')
    es.close()
  }

  const client: SseClient<T> = {
    onProgress(cb) { progressCb = cb; return client },
    onDone(cb) { doneCb = cb; return client },
    onError(cb) { errorCb = cb; return client },
    close() { es.close() },
  }

  return client
}
