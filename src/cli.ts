import { Command } from "commander";
import { writeConfig, loadConfig } from "./config.js";
import { SynergyctlError, asSynergyctlError } from "./errors.js";
import { printError, printResult, success } from "./output.js";
import { registerOperationCommands, describeOperations, runRawOperation, type RegisterOptions } from "./commands/register.js";
import { SynergySoapClient } from "./soap-client.js";
import type { GlobalOptions } from "./types.js";

export function buildProgram(registerOptions: RegisterOptions = {}): Command {
  const program = new Command();
  const global: GlobalOptions = {};

  const print = (result: ReturnType<typeof success>, includeSecrets?: boolean) =>
    printResult(result, { mode: global.json ? "json" : "human", includeSecrets });

  program
    .name("synergyctl")
    .description("Guardrailed CLI for the Synergy Wholesale SOAP API.")
    .version("0.1.0")
    .option("--json", "Emit stable JSON to stdout.")
    .option("--config <path>", "Config TOML path.")
    .option("--reseller-id <id>", "One-off Synergy reseller ID.")
    .option("--api-key <key>", "One-off Synergy API key.")
    .option("--api-url <url>", "Override Synergy API base URL.")
    .option("--include-secrets", "Allow secret fields in output for commands that can return them.")
    .hook("preAction", (thisCommand) => {
      Object.assign(global, thisCommand.optsWithGlobals());
    });

  program
    .command("doctor")
    .description("Verify config, auth presence, and WSDL reachability without requiring credentials.")
    .action(async () => {
      const config = await loadConfig(global);
      let wsdlReachable = false;
      let wsdlStatus: number | undefined;
      let operationCount: number | undefined;
      try {
        const response = await fetch(config.wsdlUrl, { method: "GET" });
        wsdlStatus = response.status;
        wsdlReachable = response.ok;
        if (response.ok) {
          const text = await response.text();
          operationCount = Array.from(new Set([...text.matchAll(/<operation name="([^"]+)"/g)].map((match) => match[1]))).length;
        }
      } catch {
        wsdlReachable = false;
      }
      print(
        success({
          configPath: config.configPath,
          apiUrl: config.apiUrl,
          wsdlUrl: config.wsdlUrl,
          auth: {
            resellerID: { available: Boolean(config.resellerID), source: config.authSource.resellerID },
            apiKey: { available: Boolean(config.apiKey), source: config.authSource.apiKey },
            apiUrl: { source: config.authSource.apiUrl }
          },
          wsdl: {
            reachable: wsdlReachable,
            status: wsdlStatus,
            operationCount
          },
          setup: {
            apiMustBeEnabled: true,
            connectingIpMustBeWhitelisted: true
          }
        })
      );
    });

  program
    .command("init")
    .description("Write ~/.config/synergyctl/config.toml for normal CLI use.")
    .requiredOption("--reseller-id <id>", "Synergy reseller ID.")
    .requiredOption("--api-key <key>", "Synergy API key.")
    .option("--api-url <url>", "Synergy API base URL.")
    .action(async (opts) => {
      const path = await writeConfig(global.config, {
        resellerID: opts.resellerId,
        apiKey: opts.apiKey,
        apiUrl: opts.apiUrl
      });
      print(success({ path, written: true }));
    });

  const operations = program.command("operations").description("Inspect documented typed operations.");
  operations
    .command("list")
    .description("List first-class documented operations and guard classification.")
    .action(() => {
      print(success(describeOperations()));
    });
  operations
    .command("wsdl")
    .description("List operation names exposed by the live WSDL.")
    .action(async () => {
      const config = await loadConfig(global);
      const invoker = registerOptions.invokerFactory?.(config) ?? new SynergySoapClient(config);
      const operations = await invoker.listOperations();
      print(success({ operations }));
    });

  const request = program.command("request").description("Raw SOAP escape hatch.");
  request
    .command("call <operation>")
    .description("Call an exact WSDL operation with a JSON payload.")
    .option("--data <json-or-file>", "Request payload JSON or @file.json.")
    .option("--experimental", "Allow undocumented/WSDL-only operations.")
    .option("--dry-run", "Preview payload and expected confirmation token.")
    .option("--confirm <token>", "Required for guarded raw or write operations.")
    .option("--include-secrets", "Print secret fields in output.")
    .action(async (operation, opts) => {
      const result = await runRawOperation(operation, opts.data, opts, global, registerOptions);
      print(result, Boolean(opts.includeSecrets ?? global.includeSecrets));
    });

  registerOperationCommands(program, global, registerOptions, print);

  program.exitOverride();
  return program;
}

export async function run(argv: string[], registerOptions: RegisterOptions = {}): Promise<void> {
  const program = buildProgram(registerOptions);
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const raw = error as { code?: unknown; message?: unknown };
    if (
      (typeof raw.code === "string" && raw.code.startsWith("commander.")) ||
      raw.message === program.version()
    ) {
      process.exitCode = 0;
      return;
    }
    const global = program.optsWithGlobals() as GlobalOptions;
    const normalized = asSynergyctlError(error);
    if (normalized.code === "commander.helpDisplayed" || normalized.message === "(outputHelp)") {
      process.exitCode = 0;
      return;
    }
    if (normalized.message.includes("unknown command") || normalized.message.includes("error:")) {
      printError(new SynergyctlError("ERR_CLI", normalized.message), global.json ? "json" : "human");
    } else {
      printError(normalized, global.json ? "json" : "human");
    }
    process.exitCode = 1;
  }
}
