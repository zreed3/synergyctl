import soap from "soap";
import { SynergyctlError } from "./errors.js";
import type { LoadedConfig } from "./types.js";

export interface SoapInvoker {
  call(operation: string, payload: Record<string, unknown>): Promise<unknown>;
  listOperations(): Promise<string[]>;
}

export class SynergySoapClient implements SoapInvoker {
  private clientPromise?: Promise<soap.Client>;

  constructor(private readonly config: LoadedConfig) {}

  private client(): Promise<soap.Client> {
    this.clientPromise ??= soap.createClientAsync(this.config.wsdlUrl, {
      endpoint: `${this.config.apiUrl.replace(/\/+$/, "")}:443/server.php`
    });
    return this.clientPromise;
  }

  async call(operation: string, payload: Record<string, unknown>): Promise<unknown> {
    const client = await this.client();
    const methodName = `${operation}Async`;
    const method = (client as unknown as Record<string, unknown>)[methodName];
    if (typeof method !== "function") {
      throw new SynergyctlError("ERR_OPERATION_UNKNOWN", `WSDL operation not found: ${operation}`, {
        operation
      });
    }
    try {
      const result = (await method.call(client, { request: payload })) as unknown[];
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw new SynergyctlError("ERR_SOAP_REQUEST", `SOAP request failed for ${operation}`, {
        operation,
        retryable: true,
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async listOperations(): Promise<string[]> {
    const client = await this.client();
    const description = client.describe() as Record<string, Record<string, Record<string, unknown>>>;
    return Object.values(description)
      .flatMap((service) => Object.values(service))
      .flatMap((port) => Object.keys(port))
      .sort();
  }
}

export function withAuth(config: LoadedConfig, payload: Record<string, unknown>): Record<string, unknown> {
  if (!config.resellerID || !config.apiKey) {
    throw new SynergyctlError(
      "ERR_AUTH_MISSING",
      "Missing Synergy Wholesale credentials. Set SYNERGY_RESELLER_ID and SYNERGY_API_KEY, or run synergyctl init."
    );
  }
  return {
    resellerID: config.resellerID,
    apiKey: config.apiKey,
    ...payload
  };
}
