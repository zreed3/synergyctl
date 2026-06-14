import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadConfig } from "../src/config.js";
import { enforceGuard, expectedConfirmToken } from "../src/guards.js";
import { redact } from "../src/redact.js";
import { runRawOperation } from "../src/commands/register.js";
import type { LoadedConfig } from "../src/types.js";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.restoreAllMocks();
});

describe("auth config", () => {
  test("uses env before config before flags", async () => {
    const dir = await mkdtemp(join(tmpdir(), "synergyctl-config-"));
    const config = join(dir, "config.toml");
    await writeFile(
      config,
      'resellerID = "from-config"\napiKey = "config-secret"\napiUrl = "https://config.example"\n'
    );
    process.env.SYNERGY_RESELLER_ID = "from-env";

    const loaded = await loadConfig({
      config,
      resellerId: "from-flag",
      apiKey: "flag-secret",
      apiUrl: "https://flag.example"
    });

    expect(loaded.resellerID).toBe("from-env");
    expect(loaded.apiKey).toBe("config-secret");
    expect(loaded.apiUrl).toBe("https://config.example");
    expect(loaded.authSource.resellerID).toBe("env");
    expect(loaded.authSource.apiKey).toBe("config");
  });
});

describe("redaction", () => {
  test("redacts credentials and contact fields by default", () => {
    expect(
      redact({
        apiKey: "secret",
        auth: { apiKey: { available: false, source: "missing" } },
        domainPassword: "epp",
        contacts: { email: "person@example.com", phone: "+61.390245383" }
      })
    ).toEqual({
      apiKey: "[redacted]",
      auth: { apiKey: { available: false, source: "missing" } },
      domainPassword: "[redacted]",
      contacts: { email: "p***@example.com", phone: "+6***83" }
    });
  });
});

describe("write guards", () => {
  const definition = {
    operation: "renewDomain",
    kind: "write" as const,
    guard: "billable" as const,
    resourceParams: ["domainName"]
  };

  test("derives and enforces operation-resource confirmation tokens", () => {
    const payload = { domainName: "example.com.au" };
    expect(expectedConfirmToken({ definition, payload })).toBe("renewDomain:example.com.au");
    expect(() => enforceGuard({ definition, payload })).toThrow(/requires --dry-run/);
    expect(enforceGuard({ definition, payload, dryRun: true })).toMatchObject({
      dryRun: true,
      expectedConfirm: "renewDomain:example.com.au"
    });
    expect(enforceGuard({ definition, payload, confirm: "renewDomain:example.com.au" })).toMatchObject({
      dryRun: false
    });
  });
});

describe("raw request guard", () => {
  test("dry-runs undocumented operations only with experimental flag", async () => {
    const config: LoadedConfig = {
      resellerID: "rid",
      apiKey: "secret",
      apiUrl: "https://api.synergywholesale.com",
      wsdlUrl: "https://api.synergywholesale.com/?wsdl",
      configPath: "/tmp/config.toml",
      authSource: { resellerID: "flag", apiKey: "flag", apiUrl: "config" }
    };
    const invoker = {
      call: vi.fn(),
      listOperations: vi.fn()
    };
    const invokerFactory = vi.fn(() => invoker);

    await expect(
      runRawOperation("sendSMS", "{}", { dryRun: true }, {}, { invokerFactory })
    ).rejects.toThrow(/--experimental/);

    process.env.SYNERGY_RESELLER_ID = "rid";
    process.env.SYNERGY_API_KEY = "secret";
    const result = await runRawOperation("sendSMS", "{}", { dryRun: true, experimental: true }, {}, {
      invokerFactory
    });

    expect(result.meta).toMatchObject({ dryRun: true, expectedConfirm: "sendSMS:raw" });
    expect(invokerFactory).not.toHaveBeenCalled();
  });
});
