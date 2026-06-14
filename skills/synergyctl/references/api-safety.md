# synergyctl API Safety

## Auth Precedence

`synergyctl` resolves credentials in this order:

1. Environment variables: `SYNERGY_RESELLER_ID`, `SYNERGY_API_KEY`, optional `SYNERGY_API_URL`.
2. TOML config at `~/.config/synergyctl/config.toml` or `--config <path>`.
3. One-off flags `--reseller-id`, `--api-key`, and `--api-url`.

Prefer environment variables in automation. Do not commit config files or credentials.

## Output Contract

Use `--json` for agent work. Successful commands return:

```json
{
  "ok": true,
  "operation": "domainInfo",
  "data": {},
  "meta": {}
}
```

Failures return:

```json
{
  "ok": false,
  "error": {
    "code": "guard_required",
    "message": "..."
  }
}
```

Secret-like scalar values are redacted by default. Use `--include-secrets` only when the user explicitly asks and the output destination is appropriate.

## Guard Matrix

Guarded operations include:

- Billable actions: registrations, renewals, transfers, SSL purchases, mailbox purchases.
- Destructive actions: deletes, cancellations, record removals, service removals.
- Service-changing actions: DNS updates, nameserver changes, hosting and Microsoft 365 changes.
- Credential-changing actions: password updates, domain auth code retrieval, certificate material.
- Customer-email-triggering actions: any action expected to email a registrant or customer.

For these commands:

1. Run with `--dry-run`.
2. Capture the reported `expectedConfirm` token.
3. Run live only after explicit user approval with `--confirm <operation>:<resource>`.

## Raw Call Limits

The API v3.17 PDF is the public contract. The live WSDL is used for schema and reachability checks. Prefer typed commands for PDF-covered operations. Use `request call --experimental` only for WSDL-only or stale operations and avoid live writes unless the user clearly accepts the risk.
