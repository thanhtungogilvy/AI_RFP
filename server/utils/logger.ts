export type LogValue = string | number | boolean | null | undefined | LogContext | LogValue[]
export interface LogContext {
  [key: string]: LogValue
}

const SENSITIVE_KEY = /(?:api[_-]?key|authorization|content|credential|password|secret|service[_-]?key|token)/i

export function redactLogContext(context: LogContext): LogContext {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => {
    if (SENSITIVE_KEY.test(key)) return [key, '[REDACTED]']
    if (Array.isArray(value)) return [key, value.map(item => typeof item === 'object' && item !== null && !Array.isArray(item) ? redactLogContext(item) : item)]
    if (typeof value === 'object' && value !== null) return [key, redactLogContext(value)]
    return [key, value]
  }))
}

function write(level: 'error' | 'info', event: string, context: LogContext = {}) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...redactLogContext(context) })
  if (level === 'error') console.error(line)
  else console.log(line)
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  write('error', event, {
    ...context,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  })
}

export function logInfo(event: string, context: LogContext = {}) {
  write('info', event, context)
}
