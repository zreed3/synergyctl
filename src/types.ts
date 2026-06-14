import type { Command } from "commander";

export type OutputMode = "json" | "human";

export type AuthSource = "flag" | "env" | "config" | "missing";

export interface LoadedConfig {
  resellerID?: string;
  apiKey?: string;
  apiUrl: string;
  wsdlUrl: string;
  configPath: string;
  authSource: {
    resellerID: AuthSource;
    apiKey: AuthSource;
    apiUrl: AuthSource;
  };
}

export interface GlobalOptions {
  json?: boolean;
  config?: string;
  resellerId?: string;
  apiKey?: string;
  apiUrl?: string;
  includeSecrets?: boolean;
}

export type OperationKind = "read" | "write";

export type GuardLevel =
  | "none"
  | "billable"
  | "destructive"
  | "service"
  | "credential"
  | "email"
  | "raw";

export interface ParamDefinition {
  name: string;
  flag?: string;
  description: string;
  required?: boolean;
  positional?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "json";
  defaultValue?: unknown;
  secret?: boolean;
}

export interface OperationDefinition {
  group: "account" | "domains" | "dns" | "hosting" | "ssl" | "m365" | "products";
  path: string[];
  command: string;
  operation: string;
  summary: string;
  kind: OperationKind;
  guard: GuardLevel;
  params: ParamDefinition[];
  resourceParams?: string[];
  includeSecrets?: string[];
  deprecated?: boolean;
  hidden?: boolean;
}

export interface CommandContext {
  command: Command;
  global: GlobalOptions;
}

export interface CommandResult {
  ok: true;
  data: unknown;
  meta?: Record<string, unknown>;
}

export interface CommandErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    operation?: string;
    retryable?: boolean;
    details?: unknown;
  };
}
