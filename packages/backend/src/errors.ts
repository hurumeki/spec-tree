// Single error type for service-layer failures so route handlers can branch
// on `err instanceof HttpError` instead of duck-typing a `statusCode` prop.
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, 'not_found', message);
    this.name = 'NotFoundError';
  }
}
