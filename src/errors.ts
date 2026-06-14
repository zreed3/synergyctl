export class SynergyctlError extends Error {
  readonly code: string;
  readonly operation?: string;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    options: { operation?: string; retryable?: boolean; details?: unknown } = {}
  ) {
    super(message);
    this.name = "SynergyctlError";
    this.code = code;
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

export function asSynergyctlError(error: unknown): SynergyctlError {
  if (error instanceof SynergyctlError) {
    return error;
  }
  if (error instanceof Error) {
    return new SynergyctlError("ERR_UNEXPECTED", error.message, { details: error.stack });
  }
  return new SynergyctlError("ERR_UNEXPECTED", String(error));
}
