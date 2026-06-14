import { SynergyctlError } from "./errors.js";
import type { GuardLevel, OperationDefinition } from "./types.js";

export interface GuardInput {
  definition: Pick<OperationDefinition, "operation" | "kind" | "guard" | "resourceParams">;
  payload: Record<string, unknown>;
  dryRun?: boolean;
  confirm?: string;
  raw?: boolean;
}

export const GUARDED_LEVELS = new Set<GuardLevel>([
  "billable",
  "destructive",
  "service",
  "credential",
  "email",
  "raw"
]);

export function isGuarded(definition: Pick<OperationDefinition, "kind" | "guard">): boolean {
  return definition.kind === "write" || GUARDED_LEVELS.has(definition.guard);
}

export function expectedConfirmToken(input: GuardInput): string {
  const resourceFields = input.definition.resourceParams ?? [];
  const resource =
    resourceFields
      .map((field) => input.payload[field])
      .find((value) => typeof value === "string" && value.length > 0) ?? (input.raw ? "raw" : "live");
  return `${input.definition.operation}:${String(resource)}`;
}

export function enforceGuard(input: GuardInput): { dryRun: boolean; expectedConfirm?: string } {
  if (!isGuarded(input.definition)) {
    return { dryRun: false };
  }
  const expected = expectedConfirmToken(input);
  if (input.dryRun) {
    return { dryRun: true, expectedConfirm: expected };
  }
  if (input.confirm !== expected) {
    throw new SynergyctlError(
      "ERR_CONFIRM_REQUIRED",
      `Live ${input.definition.operation} requires --dry-run first or --confirm ${expected}`,
      { operation: input.definition.operation }
    );
  }
  return { dryRun: false, expectedConfirm: expected };
}
