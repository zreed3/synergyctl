# synergyctl

`synergyctl` is a guardrailed command-line interface for the Synergy Wholesale SOAP/WSDL API.

It is designed for humans and agents that need repeatable, machine-readable workflows for domains, DNS, hosting, SSL certificates, Microsoft 365, and account metadata without turning dangerous writes into casual one-liners.

## Install

```sh
npm install
npm run build
node dist/bin.js --json doctor
```

For local development, run the built binary directly:

```sh
node dist/bin.js --help
node dist/bin.js --json operations list
```

## Auth

Synergy Wholesale requires API access to be enabled, a whitelisted connecting IP address, a reseller ID, and an API key.

Auth resolution is intentionally boring:

1. `SYNERGY_RESELLER_ID`, `SYNERGY_API_KEY`, and optional `SYNERGY_API_URL`
2. `~/.config/synergyctl/config.toml`
3. one-off flags such as `--reseller-id` and `--api-key`

Create a config file with:

```sh
synergyctl init --reseller-id "$SYNERGY_RESELLER_ID" --api-key "$SYNERGY_API_KEY"
```

## Examples

```sh
synergyctl --json doctor
synergyctl --json domains list --limit 100 --page 1
synergyctl --json domains check example.com.au --years 1
synergyctl --json dns records list example.com.au
synergyctl --json hosting get <identifier>
synergyctl --json ssl list
synergyctl --json m365 clients list
```

Guarded writes require a preview or an exact confirmation token:

```sh
synergyctl --json domains renew example.com.au --years 1 --dry-run
synergyctl --json domains renew example.com.au --years 1 --confirm renewDomain:example.com.au
```

## Safety Model

- `--json` emits JSON to stdout; diagnostics go to stderr.
- Secrets are redacted by default, including API keys, passwords, EPP/domain passwords, private keys, certificates, CSRs, and contact fields.
- Billable, destructive, service-changing, credential-changing, and customer-email-triggering operations are guarded.
- WSDL-only or undocumented operations are only available through `request call --experimental`.
- CI never performs authenticated live writes.

## API Sources

The public command surface follows Synergy Wholesale API Documentation v3.17. The live WSDL is used for reachability and operation discovery checks, but it is not treated as the sole product contract because it still exposes stale and undocumented operations.

## License

This repository is source-available under PolyForm Noncommercial 1.0.0.

Required notice: `Copyright (c) 2026 Otterblock Pty Ltd (ABN 91 614 672 794 · ACN 614 672 794). All rights reserved.`

See `LICENSE` and `NOTICE`.
