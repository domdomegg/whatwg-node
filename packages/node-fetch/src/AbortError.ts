// Will be removed after v14 reaches EOL
export class PonyfillAbortError extends Error {
  constructor(reason?: any) {
    let message = 'The operation was aborted.';
    if (reason) {
      message += ` reason: ${reason}`;
    }
    super(message, {
      cause: reason,
    });
    this.name = 'AbortError';
  }

  get reason() {
    return this.cause;
  }
}
