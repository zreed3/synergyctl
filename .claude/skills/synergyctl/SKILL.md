---
name: synergyctl
description: "Use synergyctl for safe Synergy Wholesale API work: inspect account, domain, DNS, hosting, SSL, and Microsoft 365 data; dry-run guarded writes; perform explicitly approved writes; or make raw SOAP calls with strict limits."
---

# synergyctl

## Overview

Use this skill when a task needs the Synergy Wholesale API through the `synergyctl` CLI. Prefer typed commands over raw SOAP calls, keep output JSON for agent workflows, and treat every billable, destructive, service-changing, credential-changing, or customer-email-triggering operation as guarded.

## First Commands

1. From the repository, build the CLI if needed with `npm run build`.
2. Check local configuration and WSDL reachability with `node dist/bin.js --json doctor`.
3. List supported typed operations with `node dist/bin.js --json operations list`.
4. Use `--json` for agent-readable output and keep `--include-secrets` off unless the user explicitly asks for secret-bearing output.

## Safe Use

- Use typed commands such as `domains info`, `dns records list`, `hosting list`, `ssl certificate get`, and `m365 subscription get` whenever they cover the task.
- For guarded writes, run `--dry-run` first and show the expected confirmation token.
- Only run a live guarded write when the user explicitly authorizes that operation and resource. Pass `--confirm <operation>:<resource>` exactly as reported by the dry run.
- Never invent Synergy credentials. Read auth from `SYNERGY_RESELLER_ID`, `SYNERGY_API_KEY`, optional `SYNERGY_API_URL`, or the configured TOML file.
- Do not paste secrets, full customer contact details, certificate private keys, auth codes, or passwords into chat output.

## Raw Calls

Use `request call` only when the typed catalog does not expose the needed PDF-documented operation. WSDL-only or stale operations require `--experimental`; do not use them for production changes without explicit user approval.

Examples:

```bash
node dist/bin.js --json request call domainInfo --data '{"domainName":"example.com.au"}'
node dist/bin.js --json request call renewDomain --data '{"domainName":"example.com.au","years":1}' --dry-run
```

## References

Read [references/api-safety.md](references/api-safety.md) for the guard matrix, auth precedence, JSON contract, and raw-call rules.
