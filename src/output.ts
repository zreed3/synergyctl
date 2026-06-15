import { asSynergyctlError } from "./errors.js";
import { redact } from "./redact.js";
import type { CommandErrorShape, CommandResult, OutputMode } from "./types.js";

export function success(data: unknown, meta?: Record<string, unknown>): CommandResult {
  return { ok: true, data, ...(meta ? { meta } : {}) };
}

export function errorShape(error: unknown): CommandErrorShape {
  const normalized = asSynergyctlError(error);
  return {
    ok: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.operation ? { operation: normalized.operation } : {}),
      retryable: normalized.retryable,
      ...(normalized.details ? { details: normalized.details } : {})
    }
  };
}

export function printResult(
  result: CommandResult,
  options: { mode: OutputMode; includeSecrets?: boolean }
): void {
  const printable = {
    ...result,
    data: redact(result.data, options.includeSecrets),
    ...(result.meta ? { meta: redact(result.meta, options.includeSecrets) } : {})
  };
  if (options.mode === "json") {
    process.stdout.write(`${JSON.stringify(printable, null, 2)}\n`);
    return;
  }
  if (typeof printable.data === "string") {
    process.stdout.write(`${printable.data}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(printable.data, null, 2)}\n`);
}

export function printError(error: unknown, mode: OutputMode): void {
  const shaped = redact(errorShape(error)) as CommandErrorShape;
  if (mode === "json") {
    process.stdout.write(`${JSON.stringify(shaped, null, 2)}\n`);
  } else {
    process.stderr.write(`${shaped.error.code}: ${shaped.error.message}\n`);
  }
}
