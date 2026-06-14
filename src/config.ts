import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "smol-toml";
import { SynergyctlError } from "./errors.js";
import type { AuthSource, GlobalOptions, LoadedConfig } from "./types.js";

export const DEFAULT_API_URL = "https://api.synergywholesale.com";

interface FileConfig {
  resellerID?: string;
  apiKey?: string;
  apiUrl?: string;
}

function defaultConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configHome, "synergyctl", "config.toml");
}

function valueFrom(
  values: Array<[unknown, AuthSource]>
): { value: string | undefined; source: AuthSource } {
  for (const [value, source] of values) {
    if (typeof value === "string" && value.length > 0) {
      return { value, source };
    }
  }
  return { value: undefined, source: "missing" };
}

function toWsdlUrl(apiUrl: string): string {
  if (apiUrl.includes("?wsdl")) {
    return apiUrl;
  }
  return `${apiUrl.replace(/\/+$/, "")}/?wsdl`;
}

async function readConfigFile(path: string): Promise<FileConfig> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = parse(raw) as Record<string, unknown>;
    return {
      resellerID: typeof parsed.resellerID === "string" ? parsed.resellerID : undefined,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : undefined,
      apiUrl: typeof parsed.apiUrl === "string" ? parsed.apiUrl : undefined
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw new SynergyctlError("ERR_CONFIG_READ", `Unable to read config file at ${path}`, {
      details: String(error)
    });
  }
}

export async function loadConfig(options: GlobalOptions = {}): Promise<LoadedConfig> {
  const configPath = options.config ?? defaultConfigPath();
  const fileConfig = await readConfigFile(configPath);

  const reseller = valueFrom([
    [process.env.SYNERGY_RESELLER_ID, "env"],
    [fileConfig.resellerID, "config"],
    [options.resellerId, "flag"]
  ]);
  const apiKey = valueFrom([
    [process.env.SYNERGY_API_KEY, "env"],
    [fileConfig.apiKey, "config"],
    [options.apiKey, "flag"]
  ]);
  const apiUrl = valueFrom([
    [process.env.SYNERGY_API_URL, "env"],
    [fileConfig.apiUrl, "config"],
    [options.apiUrl, "flag"],
    [DEFAULT_API_URL, "config"]
  ]);

  return {
    resellerID: reseller.value,
    apiKey: apiKey.value,
    apiUrl: apiUrl.value ?? DEFAULT_API_URL,
    wsdlUrl: toWsdlUrl(apiUrl.value ?? DEFAULT_API_URL),
    configPath,
    authSource: {
      resellerID: reseller.source,
      apiKey: apiKey.source,
      apiUrl: apiUrl.source
    }
  };
}

export async function writeConfig(
  path: string | undefined,
  config: Required<Pick<FileConfig, "resellerID" | "apiKey">> & Pick<FileConfig, "apiUrl">
): Promise<string> {
  const configPath = path ?? defaultConfigPath();
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  const body = stringify({
    resellerID: config.resellerID,
    apiKey: config.apiKey,
    apiUrl: config.apiUrl ?? DEFAULT_API_URL
  });
  await writeFile(configPath, body, { mode: 0o600 });
  return configPath;
}
