export type AppErrorCode =
  | 'BAD_REQUEST'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: AppErrorCode,
    public readonly publicMessage: string,
    public override readonly cause?: unknown,
  ) {
    super(publicMessage)
    this.name = 'AppError'
  }

  toH3(requestId?: string) {
    return createError({
      statusCode: this.statusCode,
      statusMessage: this.publicMessage,
      data: { code: this.code, ...(requestId ? { requestId } : {}) },
    })
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected server error occurred.', error)
}

export function dependencyUnavailable(message: string, cause?: unknown): AppError {
  return new AppError(503, 'DEPENDENCY_UNAVAILABLE', message, cause)
}

export function databaseFailure(cause?: unknown): AppError {
  return new AppError(500, 'INTERNAL_ERROR', 'The database request could not be completed.', cause)
}
