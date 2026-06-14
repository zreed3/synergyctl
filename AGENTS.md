# Agent Notes

This repository contains the real `synergyctl` CLI plus human docs, agent docs, skills, CI, fixtures, and coverage artifacts.

## First Commands

```sh
npm install
npm run check
npm test
npm run build
node dist/bin.js --json doctor
```

## Working Rules

- Prefer typed commands over `request call`.
- Use `--json` whenever you need to parse output.
- Never pass live `--confirm` for a guarded write unless the user explicitly asked for that specific live action.
- Use `--dry-run` first for billable, destructive, credential-changing, service-changing, or customer-email-triggering operations.
- Do not commit credentials, SOAP payloads containing secrets, generated logs, `.env` files, or local config files.
- Keep `docs/api-coverage-matrix.md` and `fixtures/coverage/api-surfaces.json` aligned when the surface changes.
- Keep Codex and Claude skills aligned when agent workflow rules change.

## Canonical Implementation Files

- `src/cli.ts` and `src/bin.ts` for CLI entry and command registration
- `src/operations.ts` for the typed Synergy Wholesale operation catalog
- `src/commands/register.ts` for generic command mounting and raw request handling
- `src/config.ts`, `src/soap-client.ts`, `src/guards.ts`, `src/redact.ts`, and `src/output.ts` for shared runtime behavior
- `tests/core.test.ts` plus the command-tree tests under `tests/`

## Release Checks

Run these before publishing or pushing:

```sh
npm run check
npm test
npm run build
node dist/bin.js --json doctor
npm audit --omit=dev
```
