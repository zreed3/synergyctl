import {
  guardedWrite,
  type CliCommandBuilder,
  type CommandContext,
  type JsonRecord,
  type WriteGuardOptions,
} from "./services.js";

export type DomainDnsAction = (args?: JsonRecord) => unknown | Promise<unknown>;

export interface DomainDnsDeps {
  domains?: {
    list?: DomainDnsAction;
    info?: DomainDnsAction;
    check?: DomainDnsAction;
    bulkCheck?: DomainDnsAction;
    pricing?: DomainDnsAction;
    register?: DomainDnsAction;
    transfer?: DomainDnsAction;
    renew?: DomainDnsAction;
    restore?: DomainDnsAction;
    nameServers?: DomainDnsAction;
    contacts?: DomainDnsAction;
    hosts?: DomainDnsAction;
    lock?: DomainDnsAction;
    autoRenew?: DomainDnsAction;
    idProtection?: DomainDnsAction;
    domainCategories?: DomainDnsAction;
    cor?: DomainDnsAction;
  };
  dns?: {
    zones?: DomainDnsAction;
    records?: DomainDnsAction;
    mailForwards?: DomainDnsAction;
    simpleUrlForwards?: DomainDnsAction;
    dnssec?: DomainDnsAction;
  };
}

export interface DomainDnsCommandSpec {
  name: string;
  description: string;
  alias?: string;
  options?: Array<{ flags: string; description?: string; defaultValue?: unknown }>;
  children?: DomainDnsCommandSpec[];
  handler?: (context: CommandContext) => unknown | Promise<unknown>;
}

function createDelegatedHandler(
  name: string,
  run: DomainDnsAction | undefined,
): (context: CommandContext) => unknown | Promise<unknown> {
  return ({ args }) => {
    if (!run) {
      throw new Error(`Command ${name} is not wired to an implementation.`);
    }
    return run(args);
  };
}

function guardedDelegatedHandler(
  commandName: string,
  run: DomainDnsAction | undefined,
): (context: CommandContext) => unknown | Promise<unknown> {
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

function writeOptions(summary: string): Array<{ flags: string; description?: string; defaultValue?: unknown }> {
  return [
    {
      flags: "--confirm-write",
      description: summary,
      defaultValue: false,
    },
  ];
}

export function buildDomainDnsCommandTree(deps: DomainDnsDeps = {}): DomainDnsCommandSpec[] {
  return [
    {
      name: "domains",
      description: "Domain lifecycle and account commands.",
      children: [
        {
          name: "list",
          description: "List domains.",
          handler: createDelegatedHandler("domains list", deps.domains?.list),
        },
        {
          name: "info",
          description: "Show domain details.",
          handler: createDelegatedHandler("domains info", deps.domains?.info),
        },
        {
          name: "check",
          description: "Check domain availability.",
          handler: createDelegatedHandler("domains check", deps.domains?.check),
        },
        {
          name: "bulk-check",
          description: "Bulk domain availability check.",
          handler: createDelegatedHandler("domains bulk-check", deps.domains?.bulkCheck),
        },
        {
          name: "pricing",
          description: "Show domain pricing.",
          handler: createDelegatedHandler("domains pricing", deps.domains?.pricing),
        },
        {
          name: "register",
          description: "Register a domain.",
          options: writeOptions("Allow billable domain registration."),
          handler: guardedDelegatedHandler("domains register", deps.domains?.register),
        },
        {
          name: "transfer",
          description: "Transfer a domain.",
          options: writeOptions("Allow billable domain transfer."),
          handler: guardedDelegatedHandler("domains transfer", deps.domains?.transfer),
        },
        {
          name: "renew",
          description: "Renew a domain.",
          options: writeOptions("Allow billable domain renewal."),
          handler: guardedDelegatedHandler("domains renew", deps.domains?.renew),
        },
        {
          name: "restore",
          description: "Restore a domain.",
          options: writeOptions("Allow billable domain restore."),
          handler: guardedDelegatedHandler("domains restore", deps.domains?.restore),
        },
        {
          name: "name-servers",
          description: "Update name servers.",
          options: writeOptions("Allow guarded name server changes."),
          handler: guardedDelegatedHandler("domains name-servers", deps.domains?.nameServers),
        },
        {
          name: "contacts",
          description: "Update registrant contacts.",
          options: writeOptions("Allow guarded contact updates."),
          handler: guardedDelegatedHandler("domains contacts", deps.domains?.contacts),
        },
        {
          name: "hosts",
          description: "Update host records.",
          options: writeOptions("Allow guarded host updates."),
          handler: guardedDelegatedHandler("domains hosts", deps.domains?.hosts),
        },
        {
          name: "lock",
          description: "Toggle domain lock.",
          options: writeOptions("Allow guarded domain lock changes."),
          handler: guardedDelegatedHandler("domains lock", deps.domains?.lock),
        },
        {
          name: "auto-renew",
          description: "Toggle auto-renew.",
          options: writeOptions("Allow guarded auto-renew changes."),
          handler: guardedDelegatedHandler("domains auto-renew", deps.domains?.autoRenew),
        },
        {
          name: "id-protection",
          description: "Toggle ID protection.",
          options: writeOptions("Allow guarded ID protection changes."),
          handler: guardedDelegatedHandler("domains id-protection", deps.domains?.idProtection),
        },
        {
          name: "domain-categories",
          description: "Update domain categories.",
          options: writeOptions("Allow guarded domain category changes."),
          handler: guardedDelegatedHandler("domains domain-categories", deps.domains?.domainCategories),
        },
        {
          name: "cor",
          alias: "correction",
          description: "Submit a change of registrant correction.",
          options: writeOptions("Allow guarded COR corrections."),
          handler: guardedDelegatedHandler("domains cor", deps.domains?.cor),
        },
      ],
    },
    {
      name: "dns",
      description: "DNS zone and forwarding commands.",
      children: [
        {
          name: "zones",
          description: "Manage DNS zones.",
          options: writeOptions("Allow guarded DNS zone changes."),
          handler: guardedDelegatedHandler("dns zones", deps.dns?.zones),
        },
        {
          name: "records",
          description: "Manage DNS records.",
          options: writeOptions("Allow guarded DNS record changes."),
          handler: guardedDelegatedHandler("dns records", deps.dns?.records),
        },
        {
          name: "mail-forwards",
          description: "Manage mail forwards.",
          options: writeOptions("Allow guarded mail forward changes."),
          handler: guardedDelegatedHandler("dns mail-forwards", deps.dns?.mailForwards),
        },
        {
          name: "simple-url-forwards",
          description: "Manage simple URL forwards.",
          options: writeOptions("Allow guarded URL forward changes."),
          handler: guardedDelegatedHandler("dns simple-url-forwards", deps.dns?.simpleUrlForwards),
        },
        {
          name: "dnssec",
          description: "Manage DNSSEC.",
          options: writeOptions("Allow guarded DNSSEC changes."),
          handler: guardedDelegatedHandler("dns dnssec", deps.dns?.dnssec),
        },
      ],
    },
  ];
}

export function registerDomainDnsCommands(
  builder: CliCommandBuilder,
  deps: DomainDnsDeps = {},
): void {
  const spec = buildDomainDnsCommandTree(deps);
  for (const command of spec) {
    mountCommand(builder, command);
  }
}

function mountCommand(builder: CliCommandBuilder, spec: DomainDnsCommandSpec): CliCommandBuilder {
  const command = builder.command(spec.name, spec.description);

  if (spec.alias && command.alias) {
    command.alias(spec.alias);
  }

  for (const option of spec.options ?? []) {
    command.option(option.flags, option.description, option.defaultValue);
  }

  if (spec.handler) {
    command.action(spec.handler);
  }

  for (const child of spec.children ?? []) {
    mountCommand(command, child);
  }

  return command;
}

export const domainDnsCommandNames = {
  domains: [
    "list",
    "info",
    "check",
    "bulk-check",
    "pricing",
    "register",
    "transfer",
    "renew",
    "restore",
    "name-servers",
    "contacts",
    "hosts",
    "lock",
    "auto-renew",
    "id-protection",
    "domain-categories",
    "cor",
  ],
  dns: ["zones", "records", "mail-forwards", "simple-url-forwards", "dnssec"],
} as const;
