import { readFile } from "node:fs/promises";
import { SynergyctlError } from "./errors.js";
import type { ParamDefinition } from "./types.js";

export function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function optionName(param: ParamDefinition): string {
  return param.flag ?? `--${camelToKebab(param.name)}${param.type === "boolean" ? "" : ` <${param.name}>`}`;
}

export function optionKey(param: ParamDefinition): string {
  return param.name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export async function readJsonish(value: unknown, label: string): Promise<unknown> {
  if (typeof value !== "string") {
    return value;
  }
  const input = value.trim();
  if (input.startsWith("@")) {
    const filePath = input.slice(1);
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as unknown;
    } catch (error) {
      throw new SynergyctlError("ERR_BODY_READ", `Unable to read JSON body from ${filePath}`, {
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  if (input.startsWith("{") || input.startsWith("[")) {
    try {
      return JSON.parse(input) as unknown;
    } catch (error) {
      throw new SynergyctlError("ERR_JSON_PARSE", `Invalid JSON for ${label}`, {
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return input;
}

export function parseArray(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new SynergyctlError("ERR_ARRAY_PARSE", "Expected an array of strings");
    }
    return parsed;
  }
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseValue(value: unknown, param: ParamDefinition): unknown {
  if (value === undefined) {
    return value;
  }
  switch (param.type) {
    case "number":
      return Number(value);
    case "boolean":
      return Boolean(value);
    case "array":
      return Array.isArray(value) ? value : parseArray(String(value));
    default:
      return value;
  }
}
