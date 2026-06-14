export type JsonRecord = Record<string, unknown>;

export interface CliCommandBuilder {
  command(name: string, description?: string): CliCommandBuilder;
  description(text: string): CliCommandBuilder;
  option(flags: string, description?: string, defaultValue?: unknown): CliCommandBuilder;
  action(handler: CommandHandler): CliCommandBuilder;
  alias?(name: string): CliCommandBuilder;
  addCommand?(child: CliCommandBuilder): CliCommandBuilder;
}

export interface CommandContext {
  args: JsonRecord;
  name: string;
}

export type CommandHandler = (context: CommandContext) => unknown | Promise<unknown>;

export interface ServiceDeps {
  account?: {
    balance?: ServiceAction;
  };
  domains?: {
    pricing?: ServiceAction;
  };
  products?: {
    list?: ServiceAction;
    get?: ServiceAction;
    metadata?: ServiceAction;
  };
  hosting?: {
    list?: ServiceAction;
    get?: ServiceAction;
    bulk?: ServiceAction;
    purchase?: ServiceAction;
    suspend?: ServiceAction;
    unsuspend?: ServiceAction;
    packages?: ServiceAction;
    password?: ServiceAction;
    package?: ServiceAction;
    tempUrl?: ServiceAction;
    firewall?: ServiceAction;
    recreate?: ServiceAction;
    terminate?: ServiceAction;
    login?: ServiceAction;
  };
  ssl?: {
    pricing?: ServiceAction;
    status?: ServiceAction;
    csr?: ServiceAction;
    decode?: ServiceAction;
    purchase?: ServiceAction;
    reissue?: ServiceAction;
    cancel?: ServiceAction;
    renew?: ServiceAction;
    resend?: ServiceAction;
    list?: ServiceAction;
    beacon?: ServiceAction;
    checkTxt?: ServiceAction;
  };
  m365?: {
    client?: {
      list?: ServiceAction;
      get?: ServiceAction;
      create?: ServiceAction;
      update?: ServiceAction;
      cancel?: ServiceAction;
    };
    subscription?: {
      list?: ServiceAction;
      get?: ServiceAction;
      create?: ServiceAction;
      update?: ServiceAction;
      cancel?: ServiceAction;
      renew?: ServiceAction;
    };
  };
}

export type ServiceAction = (args?: JsonRecord) => unknown | Promise<unknown>;

export interface WriteGuardOptions {
  confirmWrite?: boolean;
  confirm?: boolean | string;
  force?: boolean;
}

export class GuardedWriteError extends Error {
  constructor(readonly commandName: string) {
    super(
      `Refusing to run ${commandName} without an explicit write guard. Set confirmWrite=true, confirm=true, or force=true.`
    );
    this.name = "GuardedWriteError";
  }
}

function createDelegatedHandler(name: string, run: ServiceAction | undefined): CommandHandler {
  return ({ args }) => {
    if (!run) {
      throw new Error(`Command ${name} is not wired to an implementation.`);
    }
    return run(args);
  };
}

export function guardedWrite<T>(
  commandName: string,
  options: WriteGuardOptions | undefined,
  action: () => T | Promise<T>
): T | Promise<T> {
  const allowed =
    options?.force === true || options?.confirmWrite === true || options?.confirm === true;

  if (!allowed) {
    throw new GuardedWriteError(commandName);
  }

  return action();
}

export interface CommandSpec {
  name: string;
  description: string;
  alias?: string;
  options?: Array<{ flags: string; description?: string; defaultValue?: unknown }>;
  children?: CommandSpec[];
  handler?: CommandHandler;
}

export function buildServiceCommandTree(deps: ServiceDeps = {}): CommandSpec[] {
  return [
    {
      name: "account",
      description: "Account commands.",
      children: [
        {
          name: "balance",
          description: "Show the current account balance.",
          handler: createDelegatedHandler("account balance", deps.account?.balance)
        }
      ]
    },
    {
      name: "domains",
      description: "Domain commands.",
      children: [
        {
          name: "pricing",
          description: "Show domain pricing and renewal metadata.",
          handler: createDelegatedHandler("domains pricing", deps.domains?.pricing)
        }
      ]
    },
    {
      name: "products",
      description: "Product metadata commands.",
      children: [
        {
          name: "list",
          description: "List products and product families.",
          handler: createDelegatedHandler("products list", deps.products?.list)
        },
        {
          name: "get",
          description: "Get a product record by code or SKU.",
          options: [
            { flags: "--code <code>", description: "Product code or SKU." }
          ],
          handler: createDelegatedHandler("products get", deps.products?.get)
        },
        {
          name: "metadata",
          description: "Get expanded product metadata.",
          options: [
            { flags: "--code <code>", description: "Product code or SKU." }
          ],
          handler: createDelegatedHandler("products metadata", deps.products?.metadata)
        }
      ]
    },
    {
      name: "hosting",
      description: "Hosting management commands.",
      children: [
        {
          name: "list",
          description: "List hosting services.",
          options: [
            { flags: "--customer <customer>", description: "Filter by customer." }
          ],
          handler: createDelegatedHandler("hosting list", deps.hosting?.list)
        },
        {
          name: "get",
          description: "Get a hosting service.",
          options: [{ flags: "--id <id>", description: "Hosting service id." }],
          handler: createDelegatedHandler("hosting get", deps.hosting?.get)
        },
        {
          name: "bulk",
          description: "Run a bulk hosting operation.",
          options: [
            { flags: "--file <file>", description: "Path to a bulk action file." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting bulk", deps.hosting?.bulk)
        },
        {
          name: "purchase",
          description: "Purchase a hosting package.",
          options: [
            { flags: "--package <package>", description: "Package name or id." },
            { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting purchase", deps.hosting?.purchase)
        },
        {
          name: "suspend",
          description: "Suspend a hosting service.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting suspend", deps.hosting?.suspend)
        },
        {
          name: "unsuspend",
          description: "Unsuspend a hosting service.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting unsuspend", deps.hosting?.unsuspend)
        },
        {
          name: "packages",
          description: "List available hosting packages.",
          handler: createDelegatedHandler("hosting packages", deps.hosting?.packages)
        },
        {
          name: "password",
          description: "Update a hosting account password.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting password", deps.hosting?.password)
        },
        {
          name: "package",
          description: "Update a hosting package assignment.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--package <package>", description: "Package name or id." },
            { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting package", deps.hosting?.package)
        },
        {
          name: "temp-url",
          description: "Create or inspect a temporary hosting URL.",
          options: [{ flags: "--id <id>", description: "Hosting service id." }],
          handler: createDelegatedHandler("hosting temp-url", deps.hosting?.tempUrl)
        },
        {
          name: "firewall",
          description: "Update hosting firewall rules.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting firewall", deps.hosting?.firewall)
        },
        {
          name: "recreate",
          description: "Recreate a hosting environment.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting recreate", deps.hosting?.recreate)
        },
        {
          name: "terminate",
          description: "Terminate a hosting service.",
          options: [
            { flags: "--id <id>", description: "Hosting service id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("hosting terminate", deps.hosting?.terminate)
        },
        {
          name: "login",
          description: "Generate a hosting control panel login URL.",
          options: [{ flags: "--id <id>", description: "Hosting service id." }],
          handler: createDelegatedHandler("hosting login", deps.hosting?.login)
        }
      ]
    },
    {
      name: "ssl",
      description: "SSL commands.",
      children: [
        {
          name: "pricing",
          description: "Show SSL pricing.",
          handler: createDelegatedHandler("ssl pricing", deps.ssl?.pricing)
        },
        {
          name: "status",
          description: "Check SSL status.",
          options: [{ flags: "--id <id>", description: "SSL certificate id." }],
          handler: createDelegatedHandler("ssl status", deps.ssl?.status)
        },
        {
          name: "csr",
          description: "Generate or validate a CSR.",
          options: [{ flags: "--domain <domain>", description: "Domain name." }],
          handler: createDelegatedHandler("ssl csr", deps.ssl?.csr)
        },
        {
          name: "decode",
          description: "Decode an SSL certificate or CSR.",
          options: [{ flags: "--input <input>", description: "PEM or base64 payload." }],
          handler: createDelegatedHandler("ssl decode", deps.ssl?.decode)
        },
        {
          name: "purchase",
          description: "Purchase an SSL certificate.",
          options: [
            { flags: "--domain <domain>", description: "Domain name." },
            { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("ssl purchase", deps.ssl?.purchase)
        },
        {
          name: "reissue",
          description: "Reissue an SSL certificate.",
          options: [
            { flags: "--id <id>", description: "SSL certificate id." },
            { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("ssl reissue", deps.ssl?.reissue)
        },
        {
          name: "cancel",
          description: "Cancel an SSL certificate.",
          options: [
            { flags: "--id <id>", description: "SSL certificate id." },
            { flags: "--confirm-write", description: "Allow destructive write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("ssl cancel", deps.ssl?.cancel)
        },
        {
          name: "renew",
          description: "Renew an SSL certificate.",
          options: [
            { flags: "--id <id>", description: "SSL certificate id." },
            { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("ssl renew", deps.ssl?.renew)
        },
        {
          name: "resend",
          description: "Resend SSL validation email.",
          options: [
            { flags: "--id <id>", description: "SSL certificate id." },
            { flags: "--confirm-write", description: "Allow email-triggering write actions.", defaultValue: false }
          ],
          handler: guardedDelegatedHandler("ssl resend", deps.ssl?.resend)
        },
        {
          name: "list",
          description: "List SSL certificates.",
          options: [{ flags: "--customer <customer>", description: "Filter by customer." }],
          handler: createDelegatedHandler("ssl list", deps.ssl?.list)
        },
        {
          name: "beacon",
          description: "Fetch SSL beacon data.",
          options: [{ flags: "--id <id>", description: "SSL certificate id." }],
          handler: createDelegatedHandler("ssl beacon", deps.ssl?.beacon)
        },
        {
          name: "check-txt",
          description: "Check TXT validation records.",
          options: [{ flags: "--domain <domain>", description: "Domain name." }],
          handler: createDelegatedHandler("ssl check-txt", deps.ssl?.checkTxt)
        }
      ]
    },
    {
      name: "m365",
      description: "Microsoft 365 commands.",
      children: [
        {
          name: "client",
          description: "Microsoft 365 client commands.",
          children: [
            {
              name: "list",
              description: "List Microsoft 365 clients.",
              handler: createDelegatedHandler("m365 client list", deps.m365?.client?.list)
            },
            {
              name: "get",
              description: "Get a Microsoft 365 client.",
              options: [{ flags: "--id <id>", description: "Client id." }],
              handler: createDelegatedHandler("m365 client get", deps.m365?.client?.get)
            },
            {
              name: "create",
              description: "Create a Microsoft 365 client.",
              options: [
                { flags: "--name <name>", description: "Client name." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 client create", deps.m365?.client?.create)
            },
            {
              name: "update",
              description: "Update a Microsoft 365 client.",
              options: [
                { flags: "--id <id>", description: "Client id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 client update", deps.m365?.client?.update)
            },
            {
              name: "cancel",
              description: "Cancel a Microsoft 365 client.",
              options: [
                { flags: "--id <id>", description: "Client id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 client cancel", deps.m365?.client?.cancel)
            }
          ]
        },
        {
          name: "subscription",
          description: "Microsoft 365 subscription commands.",
          children: [
            {
              name: "list",
              description: "List Microsoft 365 subscriptions.",
              handler: createDelegatedHandler("m365 subscription list", deps.m365?.subscription?.list)
            },
            {
              name: "get",
              description: "Get a Microsoft 365 subscription.",
              options: [{ flags: "--id <id>", description: "Subscription id." }],
              handler: createDelegatedHandler("m365 subscription get", deps.m365?.subscription?.get)
            },
            {
              name: "create",
              description: "Create a Microsoft 365 subscription.",
              options: [
                { flags: "--client <client>", description: "Client id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 subscription create", deps.m365?.subscription?.create)
            },
            {
              name: "update",
              description: "Update a Microsoft 365 subscription.",
              options: [
                { flags: "--id <id>", description: "Subscription id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 subscription update", deps.m365?.subscription?.update)
            },
            {
              name: "cancel",
              description: "Cancel a Microsoft 365 subscription.",
              options: [
                { flags: "--id <id>", description: "Subscription id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 subscription cancel", deps.m365?.subscription?.cancel)
            },
            {
              name: "renew",
              description: "Renew a Microsoft 365 subscription.",
              options: [
                { flags: "--id <id>", description: "Subscription id." },
                { flags: "--confirm-write", description: "Allow billable write actions.", defaultValue: false }
              ],
              handler: guardedDelegatedHandler("m365 subscription renew", deps.m365?.subscription?.renew)
            }
          ]
        }
      ]
    }
  ];
}

function guardedDelegatedHandler(
  commandName: string,
  run: ServiceAction | undefined
): CommandHandler {
  return (context) => {
    const guardSource = context.args as JsonRecord & WriteGuardOptions;
    return guardedWrite(commandName, guardSource, () => {
      if (!run) {
        throw new Error(`Command ${commandName} is not wired to an implementation.`);
      }
      return run(context.args);
    });
  };
}

export function registerServiceCommands(builder: CliCommandBuilder, deps: ServiceDeps = {}): void {
  const spec = buildServiceCommandTree(deps);
  for (const command of spec) {
    mountCommand(builder, command);
  }
}

function mountCommand(builder: CliCommandBuilder, spec: CommandSpec): CliCommandBuilder {
  const command = builder.command(spec.name, spec.description);

  if (spec.alias && command.alias) {
    command.alias(spec.alias);
  }

  for (const option of spec.options ?? []) {
    command.option(option.flags, option.description, option.defaultValue);
  }

  if (spec.handler) {
    command.action((context: CommandContext) => spec.handler?.(context));
  }

  for (const child of spec.children ?? []) {
    mountCommand(command, child);
  }

  return command;
}

export const serviceCommandNames = {
  account: ["balance"],
  domains: ["pricing"],
  products: ["list", "get", "metadata"],
  hosting: [
    "list",
    "get",
    "bulk",
    "purchase",
    "suspend",
    "unsuspend",
    "packages",
    "password",
    "package",
    "temp-url",
    "firewall",
    "recreate",
    "terminate",
    "login"
  ],
  ssl: [
    "pricing",
    "status",
    "csr",
    "decode",
    "purchase",
    "reissue",
    "cancel",
    "renew",
    "resend",
    "list",
    "beacon",
    "check-txt"
  ],
  m365: {
    client: ["list", "get", "create", "update", "cancel"],
    subscription: ["list", "get", "create", "update", "cancel", "renew"]
  }
} as const;
