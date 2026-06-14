import assert from "node:assert/strict";
import { test } from "vitest";

import {
  GuardedWriteError,
  buildServiceCommandTree,
  guardedWrite,
  registerServiceCommands,
  serviceCommandNames,
  type CliCommandBuilder,
  type CommandContext
} from "../src/commands/services.js";

class FakeBuilder implements CliCommandBuilder {
  readonly calls: Array<{
    path: string;
    description?: string;
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

  alias(): CliCommandBuilder {
    return this;
  }

  addCommand(): CliCommandBuilder {
    return this;
  }
}

function findLeaf(tree: ReturnType<typeof buildServiceCommandTree>, path: string[]): unknown {
  let nodes: any[] = tree;
  let node: any;
  for (const segment of path) {
    node = nodes.find((candidate) => candidate.name === segment);
    if (!node) return undefined;
    nodes = node.children ?? [];
  }
  return node;
}

test("buildServiceCommandTree exposes the requested command surface", () => {
  const tree = buildServiceCommandTree();

  assert.ok(findLeaf(tree, ["account", "balance"]));
  assert.ok(findLeaf(tree, ["domains", "pricing"]));
  assert.ok(findLeaf(tree, ["products", "metadata"]));
  assert.ok(findLeaf(tree, ["hosting", "purchase"]));
  assert.ok(findLeaf(tree, ["hosting", "temp-url"]));
  assert.ok(findLeaf(tree, ["ssl", "check-txt"]));
  assert.ok(findLeaf(tree, ["m365", "client", "list"]));
  assert.ok(findLeaf(tree, ["m365", "subscription", "renew"]));

  assert.deepEqual(serviceCommandNames.hosting.includes("terminate"), true);
});

test("registerServiceCommands is compatible with a commander-like builder", () => {
  const builder = new FakeBuilder();
  registerServiceCommands(builder);

  assert.ok(builder.calls.some((entry) => entry.path === "account"));
  assert.ok(builder.calls.some((entry) => entry.path === "hosting purchase"));
  assert.ok(builder.calls.some((entry) => entry.path === "ssl check-txt"));
  assert.ok(builder.calls.some((entry) => entry.path === "m365 subscription renew"));

  const hostingPurchase = builder.calls.find((entry) => entry.path === "hosting purchase");
  assert.ok(hostingPurchase?.options.some((option) => option.flags === "--confirm-write"));
});

test("guardedWrite blocks billable or destructive writes without an explicit guard", async () => {
  assert.throws(() => guardedWrite("hosting purchase", {}, () => "ok"), GuardedWriteError);

  const result = guardedWrite("hosting purchase", { confirmWrite: true }, () => "ok");
  assert.equal(result, "ok");

  const asyncResult = await guardedWrite("ssl renew", { confirm: true }, async () => "done");
  assert.equal(asyncResult, "done");
});
