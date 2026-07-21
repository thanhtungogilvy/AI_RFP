interface RequestIdEvent {
  context: Record<string, unknown>
}

export function ensureRequestId(event: RequestIdEvent): string {
  const existing = event.context.requestId
  if (typeof existing === 'string' && existing.trim()) return existing
  const requestId = crypto.randomUUID()
  event.context.requestId = requestId
  return requestId
}
