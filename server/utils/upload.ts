import { readMultipartFormData as parseH3Multipart, type H3Event, type MultiPartData } from 'h3'

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export async function readBoundedMultipartFormData(event: H3Event, limit = MAX_UPLOAD_BYTES): Promise<MultiPartData[] | undefined> {
  const request = event.node.req as typeof event.node.req & { rawBody?: Buffer }
  const declaredLength = Number.parseInt(request.headers['content-length'] || '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw createError({ statusCode: 413, statusMessage: 'Multipart request exceeds 50 MiB limit' })
  }

  request.rawBody = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
    }
    const onData = (value: Buffer | string) => {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      total += chunk.length
      if (total > limit) {
        cleanup()
        request.pause()
        reject(createError({ statusCode: 413, statusMessage: 'Multipart request exceeds 50 MiB limit' }))
        return
      }
      chunks.push(chunk)
    }
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks, total)) }
    const onError = (error: Error) => { cleanup(); reject(error) }
    request.on('data', onData)
    request.on('end', onEnd)
    request.on('error', onError)
  })
  return parseH3Multipart(event)
}

export function storageObjectName(fileName: string, maxLength = 180): string {
  const basename = fileName.replace(/\\/g, '/').split('/').pop() || 'upload'
  const safe = basename.replace(/[\u0000-\u001f\u007f]/g, '_').replace(/[^A-Za-z0-9._-]/g, '_') || 'upload'
  return safe.length <= maxLength ? safe : safe.slice(0, maxLength)
}
