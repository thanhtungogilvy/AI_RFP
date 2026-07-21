import { ensureRequestId } from '../utils/request-id'

export default defineEventHandler((event) => {
  const requestId = ensureRequestId(event)
  setResponseHeader(event, 'X-Request-ID', requestId)
})
