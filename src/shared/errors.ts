export type AppError =
  | { code: 'AUTH_EXPIRED'; message: string }
  | { code: 'AUTH_INVALID_STATE'; message: string }
  | { code: 'PLAN_LIMIT_REACHED'; currentCount: number; maxCount: number }
  | { code: 'UIA_TIMEOUT'; x: number; y: number }
  | { code: 'SCREENSHOT_FAILED'; displayId: string; message: string }
  | { code: 'UPLOAD_FAILED'; stepIndex: number; httpStatus: number; message: string }
  | { code: 'NETWORK_ERROR'; message: string }

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
