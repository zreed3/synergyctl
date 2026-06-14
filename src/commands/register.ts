import { Command } from "commander";
import { loadConfig } from "../config.js";
import { SynergyctlError } from "../errors.js";
import { enforceGuard, expectedConfirmToken, isGuarded } from "../guards.js";
import { success } from "../output.js";
import { findOperation, OPERATIONS, PUBLIC_OPERATION_NAMES } from "../operations.js";
import { SynergySoapClient, withAuth, type SoapInvoker } from "../soap-client.js";
import { optionKey, optionName, parseValue, readJsonish } from "../utils.js";
import type { CommandResult, GlobalOptions, OperationDefinition, ParamDefinition } from "../types.js";

export interface RegisterOptions {
  invokerFactory?: (config: Awaited<ReturnType<typeof loadConfig>>) => SoapInvoker;
}

type ActionRunner = (result: CommandResult, includeSecrets?: boolean) => void;

function ensureGroup(root: Command, names: string[]): Command {
  let current = root;
  for (const name of names) {
    const existing = current.commands.find((command) => command.name() === name);
    if (existing) {
      current = existing;
      continue;
    }
    const child = new Command(name);
    current.addCommand(child);
    current = child;
  }
  return current;
}

function addOptions(command: Command, params: ParamDefinition[]): void {
  for (const param of params.filter((item) => !item.positional)) {
    const flags = optionName(param);
    if (param.type === "boolean") {
      command.option(flags, param.description);
    } else {
      command.option(flags, param.description);
    }
  }
  command.option("--include-secrets", "Print secret response fields for this command.");
}

function positionalNames(params: ParamDefinition[]): string[] {
  return params.filter((param) => param.positional).map((param) => param.name);
}

async function materializePayload(definition: OperationDefinition, args: unknown[], opts: Record<string, unknown>): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  const positionals = definition.params.filter((param) => param.positional);
  for (const [index, param] of positionals.entries()) {
    const value = args[index];
    if (value !== undefined) {
      payload[param.name] = parseValue(value, param);
    }
  }
  for (const param of definition.params.filter((item) => !item.positional)) {
    if (param.name === "dryRun" || param.name === "confirm") {
      continue;
    }
    const value = opts[optionKey(param)];
    if (value === undefined) {
      if (param.required) {
        throw new SynergyctlError("ERR_REQUIRED_OPTION", `Missing required option ${param.flag ?? param.name}`, {
          operation: definition.operation
        });
      }
      continue;
    }
    if (param.type === "json" && param.name === "body") {
      const body = await readJsonish(value, "body");
      if (body && typeof body === "object" && !Array.isArray(body)) {
        Object.assign(payload, body);
      } else {
        throw new SynergyctlError("ERR_BODY_OBJECT", "--body must resolve to a JSON object", {
          operation: definition.operation
        });
      }
      continue;
    }
    if (param.name === "csr" || param.name === "newCSR") {
      payload[param.name] = await readJsonish(value, param.name);
      continue;
    }
    payload[param.name] = parseValue(value, param);
  }
  return payload;
}

function applyLimits(definition: OperationDefinition, payload: Record<string, unknown>): void {
  if (definition.operation === "listDomains" && Number(payload.limit) > 500) {
    throw new SynergyctlError("ERR_LIMIT_EXCEEDED", "listDomains has a documented maximum limit of 500", {
      operation: definition.operation
    });
  }
  if (definition.operation === "listHosting" && Number(payload.limit) > 1000) {
    throw new SynergyctlError("ERR_LIMIT_EXCEEDED", "listHosting has a documented maximum limit of 1000", {
      operation: definition.operation
    });
  }
  if (definition.operation === "bulkCheckDomain" && Array.isArray(payload.domainList) && payload.domainList.length > 30) {
    throw new SynergyctlError("ERR_LIMIT_EXCEEDED", "bulkCheckDomain accepts up to 30 domains", {
      operation: definition.operation
    });
  }
}

function responseStatus(response: unknown): string | undefined {
  if (!response || typeof response !== "object") {
    return undefined;
  }
  const status = (response as Record<string, unknown>).status;
  return typeof status === "string" ? status : undefined;
}

function isApiErrorStatus(status: string | undefined): boolean {
  return Boolean(status?.startsWith("ERR_"));
}

async function executeTyped(
  definition: OperationDefinition,
  args: unknown[],
  opts: Record<string, unknown>,
  global: GlobalOptions,
  registerOptions: RegisterOptions,
  print: ActionRunner
): Promise<void> {
  const config = await loadConfig(global);
  const payload = await materializePayload(definition, args, opts);
  applyLimits(definition, payload);

  const guard = enforceGuard({
    definition,
    payload,
    dryRun: Boolean(opts.dryRun),
    confirm: typeof opts.confirm === "string" ? opts.confirm : undefined
  });

  if (guard.dryRun) {
    print(
      success(
        {
          command: definition.command,
          operation: definition.operation,
          guard: definition.guard,
          payload: withAuth({ ...config, resellerID: config.resellerID ?? "[missing]", apiKey: config.apiKey ?? "[missing]" }, payload)
        },
        { dryRun: true, expectedConfirm: guard.expectedConfirm }
      ),
      Boolean(opts.includeSecrets ?? global.includeSecrets)
    );
    return;
  }

  const invoker = registerOptions.invokerFactory?.(config) ?? new SynergySoapClient(config);
  const response = await invoker.call(definition.operation, withAuth(config, payload));
  const status = responseStatus(response);
  if (isApiErrorStatus(status)) {
    throw new SynergyctlError(status ?? "ERR_API", `Synergy API returned ${status}`, {
      operation: definition.operation,
      details: response
    });
  }
  print(
    success(
      {
        command: definition.command,
        operation: definition.operation,
        status,
        response
      },
      { guard: definition.guard, live: isGuarded(definition) }
    ),
    Boolean(opts.includeSecrets ?? global.includeSecrets)
  );
}

function registerDefinition(
  root: Command,
  definition: OperationDefinition,
  global: GlobalOptions,
  registerOptions: RegisterOptions,
  print: ActionRunner
): void {
  if (definition.hidden) {
    return;
  }
  const parent = ensureGroup(root, [definition.group, ...definition.path]);
  const command = parent.command(definition.command).description(definition.summary);
  addOptions(command, definition.params);
  command.action(async (...values: unknown[]) => {
    const commandInstance = values.at(-1) as Command;
    const args = values.slice(0, positionalNames(definition.params).length);
    await executeTyped(definition, args, commandInstance.optsWithGlobals(), global, registerOptions, print);
  });
}

export function registerOperationCommands(
  root: Command,
  global: GlobalOptions,
  registerOptions: RegisterOptions,
  print: ActionRunner
): void {
  for (const definition of OPERATIONS) {
    registerDefinition(root, definition, global, registerOptions, print);
  }
}

export async function runRawOperation(
  operation: string,
  payloadInput: string | undefined,
  opts: Record<string, unknown>,
  global: GlobalOptions,
  registerOptions: RegisterOptions
): Promise<ReturnType<typeof success>> {
  const config = await loadConfig(global);
  const definition = findOperation(operation);
  if (!definition && !opts.experimental) {
    throw new SynergyctlError(
      "ERR_EXPERIMENTAL_REQUIRED",
      `Operation ${operation} is not a documented typed operation; pass --experimental to use the raw WSDL escape hatch.`,
      { operation }
    );
  }
  const body = payloadInput ? await readJsonish(payloadInput, "data") : {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SynergyctlError("ERR_BODY_OBJECT", "--data must resolve to a JSON object", { operation });
  }
  const guardedDefinition: OperationDefinition =
    definition ?? {
      group: "account",
      path: [],
      command: operation,
      operation,
      summary: "Raw operation",
      kind: "write",
      guard: "raw",
      params: [],
      resourceParams: ["raw"]
    };
  const payload = body as Record<string, unknown>;
  const guard = enforceGuard({
    definition: guardedDefinition,
    payload,
    dryRun: Boolean(opts.dryRun),
    confirm: typeof opts.confirm === "string" ? opts.confirm : undefined,
    raw: true
  });
  if (guard.dryRun) {
    return success(
      {
        operation,
        documented: PUBLIC_OPERATION_NAMES.has(operation),
        payload: withAuth({ ...config, resellerID: config.resellerID ?? "[missing]", apiKey: config.apiKey ?? "[missing]" }, payload)
      },
      { dryRun: true, expectedConfirm: guard.expectedConfirm }
    );
  }
  const invoker = registerOptions.invokerFactory?.(config) ?? new SynergySoapClient(config);
  const response = await invoker.call(operation, withAuth(config, payload));
  return success({ operation, response }, { raw: true, documented: PUBLIC_OPERATION_NAMES.has(operation) });
}

export function describeOperations(): unknown {
  return {
    publicOperationCount: OPERATIONS.length,
    operations: OPERATIONS.map((definition) => ({
      group: definition.group,
      path: [...definition.path, definition.command].join(" "),
      operation: definition.operation,
      kind: definition.kind,
      guard: definition.guard,
      deprecated: Boolean(definition.deprecated)
    }))
  };
}

export function rawConfirmHint(operation: string, data: Record<string, unknown>): string {
  return expectedConfirmToken({
    definition: {
      operation,
      kind: "write",
      guard: "raw",
      resourceParams: ["raw"]
    },
    payload: data,
    raw: true
  });
}
