import { getRequestURL, send, setResponseHeader, setResponseHeaders, setResponseStatus } from 'h3'
import { logError } from './utils/logger'
import { ensureRequestId } from './utils/request-id'

function codeForStatus(statusCode: number): string {
  if (statusCode === 400) return 'BAD_REQUEST'
  if (statusCode === 404) return 'NOT_FOUND'
  if (statusCode === 413 || statusCode === 422) return 'VALIDATION_ERROR'
  if (statusCode === 503) return 'DEPENDENCY_UNAVAILABLE'
  return 'INTERNAL_ERROR'
}

export default defineNitroErrorHandler(async (error, event, { defaultHandler }) => {
  const requestId = ensureRequestId(event)
  const existing = typeof error.data === 'object' && error.data !== null ? error.data : {}
  error.data = { ...existing, code: (existing as { code?: string }).code ?? codeForStatus(error.statusCode ?? 500), requestId }
  setResponseHeader(event, 'X-Request-ID', requestId)
  logError('request_failed', error, {
    requestId,
    route: getRequestURL(event).pathname,
    status: error.statusCode ?? 500,
  })
  const response = await defaultHandler(error, event, { silent: true })
  setResponseHeaders(event, response.headers)
  setResponseStatus(event, response.status, response.statusText)
  return send(event, JSON.stringify(response.body, null, 2))
})
