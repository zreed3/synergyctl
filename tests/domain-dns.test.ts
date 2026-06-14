import assert from "node:assert/strict";
import { test } from "vitest";

import {
  GuardedWriteError,
  type CliCommandBuilder,
  type CommandContext,
  guardedWrite,
} from "../src/commands/services.js";
import {
  buildDomainDnsCommandTree,
  domainDnsCommandNames,
  registerDomainDnsCommands,
  type DomainDnsCommandSpec,
} from "../src/commands/domain-dns.js";

class FakeBuilder implements CliCommandBuilder {
  readonly calls: Array<{
    path: string;
    description?: string;
    alias?: string;
    options: Array<{ flags: string; description?: string; defaultValue?: unknown }>;
    hasAction: boolean;
  }> = [];

  constructor(private readonly root: FakeBuilder | null = null, private readonly path: string[] = []) {}

  command(name: string, description?: string): CliCommandBuilder {
    const nextPath = [...this.path, name];
    const root = this.root ?? this;
    root.calls.push({ path: nextPath.join(" "), description, options: [], hasAction: false });
    return new FakeBuilder(root, nextPath);
  }

  description(text: string): CliCommandBuilder {
    const current = (this.root ?? this).calls.at(-1);
    if (current) current.description = text;
    return this;
  }

  option(flags: string, description?: string, defaultValue?: unknown): CliCommandBuilder {
    const current = (this.root ?? this).calls.at(-1);
    if (current) current.options.push({ flags, description, defaultValue });
    return this;
  }

  action(handler: (context: CommandContext) => unknown): CliCommandBuilder {
    const current = (this.root ?? this).calls.at(-1);
    if (current) current.hasAction = typeof handler === "function";
    return this;
  }

  alias(name: string): CliCommandBuilder {
    const current = (this.root ?? this).calls.at(-1);
    if (current) current.alias = name;
    return this;
  }

  addCommand(): CliCommandBuilder {
    return this;
  }
}

function findLeaf(tree: DomainDnsCommandSpec[], path: string[]): DomainDnsCommandSpec | undefined {
  let nodes: DomainDnsCommandSpec[] = tree;
  let node: DomainDnsCommandSpec | undefined;

  for (const segment of path) {
    node = nodes.find((candidate) => candidate.name === segment || candidate.alias === segment);
    if (!node) {
      return undefined;
    }
    nodes = node.children ?? [];
  }

  return node;
}

test("buildDomainDnsCommandTree exposes the expected domain and dns command surface", () => {
  const tree = buildDomainDnsCommandTree();

  assert.deepEqual(
    tree.map((command) => command.name),
    ["domains", "dns"],
  );
  assert.ok(findLeaf(tree, ["domains", "list"]));
  assert.ok(findLeaf(tree, ["domains", "register"]));
  assert.ok(findLeaf(tree, ["domains", "cor"]));
  assert.ok(findLeaf(tree, ["dns", "records"]));
  assert.ok(findLeaf(tree, ["dns", "dnssec"]));
  assert.equal(findLeaf(tree, ["domains", "cor"])?.alias, "correction");

  assert.deepEqual(domainDnsCommandNames.domains.includes("renew"), true);
});

test("read commands bypass the write guard", async () => {
  const tree = buildDomainDnsCommandTree({
    domains: {
      list: async () => ({ invoked: true }),
    },
  });
  const list = findLeaf(tree, ["domains", "list"]);

  assert.ok(list?.handler);
  const result = await list.handler?.({ args: {}, name: "list" });

  assert.equal((result as { invoked?: boolean }).invoked, true);
});

test("guarded write commands refuse to run without confirmation", async () => {
  const tree = buildDomainDnsCommandTree({
    domains: {
      register: async () => ({ invoked: true }),
    },
  });
  const register = findLeaf(tree, ["domains", "register"]);

  assert.ok(register?.handler);
  await assert.rejects(
    async () => register.handler?.({ args: {}, name: "register" }),
    GuardedWriteError,
  );

  const allowed = await guardedWrite("domains register", { confirmWrite: true }, () => "ok");
  assert.equal(allowed, "ok");
});

test("mutating commands run when the write guard is granted", async () => {
  const tree = buildDomainDnsCommandTree({
    domains: {
      register: async (args) => {
        assert.equal(args?.domain, "example.com");
        return { invoked: true };
      },
    },
  });
  const register = findLeaf(tree, ["domains", "register"]);

  assert.ok(register?.handler);
  const result = await register.handler?.({
    args: { domain: "example.com", confirmWrite: true },
    name: "register",
  });

  assert.equal((result as { invoked?: boolean }).invoked, true);
});

test("registerDomainDnsCommands attaches to a commander-like builder", () => {
  const builder = new FakeBuilder();
  registerDomainDnsCommands(builder);

  assert.ok(builder.calls.some((entry) => entry.path === "domains"));
  assert.ok(builder.calls.some((entry) => entry.path === "domains register"));
  assert.ok(builder.calls.some((entry) => entry.path === "domains cor"));
  assert.ok(builder.calls.some((entry) => entry.path === "dns records"));
  assert.equal(builder.calls.find((entry) => entry.path === "domains cor")?.alias, "correction");
});
