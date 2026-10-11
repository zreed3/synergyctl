# Code Quality Review

Date: 2026-07-10

## Executive summary

The repository has a sound core direction: strict TypeScript, a centralized typed operation catalog, explicit write guards, default redaction, deterministic builds, and a clean production dependency audit. The current type check, test suite, build, live WSDL doctor check, and production dependency audit all pass.

The review nevertheless found four high-priority defects in code paths not covered by the current tests:

1. Request bodies can overwrite configured authentication and explicit positional parameters.
2. Some CLI syntax failures emit non-JSON errors and root-level failures can exit successfully.
3. rewriting an existing config file can leave credentials readable by other users.
4. `@file` support for CSR values attempts to parse PEM text as JSON and therefore fails.

The main structural issue is that eight of the twelve tests exercise two command-tree scaffolds that are not used or exported by the shipped CLI. This creates maintenance cost while leaving the production CLI boundary under-tested.

## Scope and verification

Reviewed:

- CLI registration and process exit behavior
- auth/config loading and config persistence
- SOAP client construction and error handling
- payload parsing, typed operation registration, limits, and write guards
- output shaping and redaction
- the 114-operation catalog
- tests, build configuration, CI contract checks, fixtures, and agent documentation

Commands run:

```sh
npm run check
npm test
npm run build
node dist/bin.js --json doctor
npm audit --omit=dev --json
```

Results:

- TypeScript check: passed
- Tests: 12 passed across 3 files
- Build and declaration generation: passed
- Live WSDL: reachable, HTTP 200, 143 WSDL operations detected
- Catalog consistency probe: 114 operations; no duplicate CLI paths, duplicate SOAP operation names, positional mismatches, or duplicate parameter flags
- Production dependency audit: 0 known vulnerabilities

No authenticated live API calls or guarded live writes were performed.

## Prioritized findings

| ID | Priority | Area | Summary |
| --- | --- | --- | --- |
| CQ-01 | P1 | Request integrity | JSON bodies can overwrite auth and explicit parameters |
| CQ-02 | P1 | CLI contract | Parser errors bypass JSON output; some root failures exit 0 |
| CQ-03 | P1 | Credential storage | Existing config permissions are not tightened to `0600` |
| CQ-04 | P1 | File input | CSR `@file` input is incorrectly parsed as JSON |
| CQ-05 | P2 | Validation | Invalid numbers become `null` in serialized requests |
| CQ-06 | P2 | Safety UX | Human dry-runs omit the confirmation token |
| CQ-07 | P2 | Diagnostics/CI | `doctor` reports success when the WSDL is unreachable |
| CQ-08 | P2 | Networking | Custom API endpoints are constructed incorrectly |
| CQ-09 | P2 | Reliability | WSDL initialization errors escape SOAP error normalization |
| CQ-10 | P2 | Test architecture | Most tests cover unused command scaffolds, not the shipped CLI |
| CQ-11 | P2 | Schema quality | Typed commands still accept largely unvalidated JSON bodies |
| CQ-12 | P3 | Maintenance | Version/docs/fixtures and dependency tooling can drift |

## Detailed findings

### CQ-01 — JSON bodies can overwrite auth and explicit parameters (P1)

Evidence:

- `src/soap-client.ts:60-64` adds auth first and spreads the payload afterward. A payload containing `resellerID` or `apiKey` wins.
- `src/commands/register.ts:70-74` assigns body fields over fields already materialized from positional arguments.

Confirmed probes:

```text
domains register example.com --body '{"apiKey":"body-key","resellerID":"body-id"}' --dry-run
=> payload uses body-id/body-key instead of configured credentials

domains register cli.example --body '{"domainName":"body.example"}' --dry-run
=> payload and confirmation token use body.example
```

Impact:

- A supposedly typed command can act on a different resource from the positional value shown in the command line.
- Raw or body-backed requests can authenticate as values supplied in the payload instead of the credentials selected by config resolution.
- Reviewers cannot safely infer the final request from explicit CLI arguments.

Recommendation:

1. Reject reserved auth keys in all user payloads.
2. Construct authenticated payloads as `{ ...payload, resellerID, apiKey }` so trusted auth is final.
3. Reject body keys that collide with explicit positionals/options, or merge the body first and explicit typed fields last.
4. Add unit and CLI integration tests covering both collision cases.

### CQ-02 — Parser errors bypass JSON output; some root failures exit 0 (P1)

Evidence:

- `src/cli.ts:130-135` treats every error whose code starts with `commander.` as successful.
- Commander writes parser failures before the application error formatter handles them.

Confirmed probes:

| Command | Exit | Output |
| --- | ---: | --- |
| `synergyctl --json --definitely-unknown` | 0 | human error on stderr; no JSON |
| `synergyctl --json nonesuch` | 0 | human error on stderr; no JSON |
| `synergyctl --json domains info` | 1 | human error on stderr; no JSON |
| `synergyctl --json init --reseller-id x` | 1 | human error on stderr; no JSON |

Impact:

- Automation can interpret an invalid invocation as success.
- `--json` does not provide a stable machine-readable failure contract for syntax errors.

Recommendation:

- Treat only help and version signals as successful (`commander.helpDisplayed` and the version signal); all other Commander errors should exit 1.
- Configure Commander output/error handling so parse failures are routed through `printError` when `--json` is present.
- Test the executable with a child process and assert stdout, stderr, and exit status.

### CQ-03 — Existing config permissions are not tightened to `0600` (P1)

Evidence:

- `src/config.ts:98-104` passes `mode: 0o600` to `writeFile`, but that mode is used only when creating a file. It does not change an existing file's permissions.

Confirmed probe:

```text
create config.toml as 0644 -> writeConfig(...) -> resulting mode remains 0644
```

Impact:

The API key can remain readable by other local users even after `synergyctl init` rewrites the file.

Recommendation:

- Explicitly `chmod(configPath, 0o600)` after a successful write.
- Prefer an atomic write: create a temporary file in the same directory with `0600`, flush/close it, then rename it over the target.
- Verify final file and parent-directory modes in tests, including the pre-existing-file case.

### CQ-04 — CSR `@file` input is incorrectly parsed as JSON (P1)

Evidence:

- `src/commands/register.ts:81-83` routes `csr` and `newCSR` through `readJsonish`.
- `src/utils.ts:22-30` applies `JSON.parse` to every `@file` value.
- The operation descriptions promise `CSR string or @file` in `src/operations.ts:355-364`.

Confirmed probe:

```text
synergyctl --json ssl csr decode --csr @request.csr
=> ERR_BODY_READ: Unable to read JSON body ... No number after minus sign ...
```

Impact:

Normal PEM CSR files cannot be used by decode or reissue commands despite the documented interface.

Recommendation:

- Split the helper into distinct functions, for example `readJsonValue` and `readTextValue`.
- Read CSR files as UTF-8 text without JSON parsing and preserve the PEM content.
- Use distinct error codes for file I/O and content parsing.

### CQ-05 — Invalid numbers become `null` in serialized requests (P2)

Evidence:

- `src/utils.ts:63-66` uses `Number(value)` without checking `Number.isFinite`.
- JSON serialization converts `NaN` to `null`.

Confirmed probe:

```text
synergyctl --json domains renew example.com --years nope --dry-run
=> success with "years": null
```

Impact:

Invalid user input passes local validation, produces a misleading successful dry-run, and is deferred to the remote API.

Recommendation:

- Reject non-finite values with a stable `ERR_NUMBER_PARSE` error.
- Add integer/minimum/range constraints where the API contract defines them (for example positive page, limit, years, and quantity values).
- Wrap malformed JSON-array parsing in `ERR_ARRAY_PARSE`; `parseArray` currently lets `JSON.parse` syntax errors surface as `ERR_UNEXPECTED`.

### CQ-06 — Human dry-runs omit the confirmation token (P2)

Evidence:

- The token is stored in result metadata at `src/commands/register.ts:149-159`.
- Human output prints only `printable.data` at `src/output.ts:36-40`; it discards `meta`.

Confirmed probe:

```text
synergyctl domains renew example.com.au --years 1 --dry-run
=> payload is shown, but expectedConfirm is absent
```

Impact:

The default human workflow cannot complete the documented dry-run-then-confirm sequence without switching to JSON or manually deriving the token.

Recommendation:

Render relevant metadata in human mode, especially `expectedConfirm`, `dryRun`, `guard`, and live/raw markers. Add a snapshot or integration test for human dry-run output.

### CQ-07 — `doctor` reports success when the WSDL is unreachable (P2)

Evidence:

- `src/cli.ts:38-69` catches fetch failures and still prints a successful result.
- `package.json:27`, CI, and the repository instructions use `doctor` as a smoke/release check.

Confirmed probe:

```text
SYNERGY_API_URL=http://127.0.0.1:9 synergyctl --json doctor
=> { "ok": true, ... "reachable": false } and exit 0
```

Impact:

CI/release checks do not fail when the primary dependency is unreachable, and callers must inspect a nested boolean to detect failure.

Recommendation:

- Decide between diagnostic and health-check semantics explicitly. A useful split is `doctor` for a detailed report plus `doctor --strict` (or `healthcheck`) for non-zero exit on failed required checks.
- Make CI use strict mode.
- Add an `AbortSignal.timeout(...)` to prevent indefinite fetch waits and report the failure reason without exposing secrets.

### CQ-08 — Custom API endpoints are constructed incorrectly (P2)

Evidence:

- `src/soap-client.ts:15-18` appends `:443/server.php` to the complete `apiUrl` string.

Examples:

```text
https://host:8443/base -> https://host:8443/base:443/server.php
http://127.0.0.1:9000 -> http://127.0.0.1:9000:443/server.php
```

Impact:

`--api-url` cannot reliably target local mocks, alternate ports, proxies, or base paths. This also makes integration testing harder.

Recommendation:

- Build URLs with the `URL` API.
- Prefer the service endpoint described by the WSDL unless an explicit SOAP endpoint override is supplied.
- If the Synergy endpoint must always be `/server.php`, replace only the pathname while preserving the selected protocol, host, and port.

### CQ-09 — WSDL initialization errors escape SOAP error normalization (P2)

Evidence:

- `src/soap-client.ts:23` awaits client creation before entering the request `try` block.
- `listOperations` has no error normalization.
- A rejected `clientPromise` is cached permanently for the lifetime of the client even though request failures are marked retryable.

Impact:

WSDL/DNS/TLS failures surface as `ERR_UNEXPECTED`, lose operation/retry context, and cannot recover on the same client instance.

Recommendation:

- Wrap client creation and invocation in the same normalization boundary.
- Use separate stable codes for WSDL load and SOAP invocation failures.
- Clear the cached promise after a rejected initialization if retry is supported.
- Add connection and request timeouts.

### CQ-10 — Most tests cover unused command scaffolds, not the shipped CLI (P2)

Evidence:

- `src/cli.ts` mounts `src/commands/register.ts` and the `OPERATIONS` catalog.
- `src/commands/services.ts` (580 lines) and `src/commands/domain-dns.ts` (284 lines) are not imported by the runtime or exported by `src/index.ts`.
- Their two test files provide 8 of the repository's 12 tests.
- The production catalog contains 114 operations, but there is no executable-level command matrix test or broad payload/guard classification test.

Impact:

The suite gives a strong green signal while missing the defects in CQ-01 through CQ-08. Duplicate command names, guard conventions, and structures can drift between the scaffolds and the shipped implementation.

Recommendation:

1. Choose one command model. Remove the unused scaffolds, or formally integrate and export them.
2. Generate command-surface tests from `OPERATIONS` rather than maintaining a second catalog.
3. Add executable integration tests for success, parse failure, JSON/human output, exit codes, required inputs, auth collisions, redaction, and dry-run metadata.
4. Add catalog invariants to CI (unique paths/operations, positional agreement, valid resource fields, guard classification, and parameter constraints).
5. Add coverage reporting and a modest threshold focused on production files.

### CQ-11 — Typed commands still accept largely unvalidated JSON bodies (P2)

Evidence:

- `bodyParam` accepts an arbitrary JSON object, and `materializePayload` only checks that it is a non-array object.
- Body-backed purchases, registrations, transfers, contact updates, DNS changes, and Microsoft 365 actions do not validate required or unknown fields locally.
- `zod` is a production dependency but has no imports in `src` or `tests`.

Impact:

Many errors are discovered only after a remote call, and typoed or missing fields can reach billable/service-changing operations. The commands are typed at the catalog level but not at the payload-schema level.

Recommendation:

- Define per-operation schemas for high-risk body-backed writes first.
- Validate before guard confirmation and include a redacted, normalized payload in the dry-run.
- Either use the existing Zod dependency for this purpose or remove it from production dependencies until it is needed.

### CQ-12 — Version/docs/fixtures and dependency tooling can drift (P3)

Evidence:

- The version is duplicated in `package.json:3`, `src/cli.ts:19`, and `fixtures/cli/version.txt`.
- CI checks that CLI fixture files exist but does not compare generated help/version output with them.
- `skills/synergyctl/references/api-safety.md:17-35` documents a success shape and error code that differ from current runtime output.
- The project targets Node 20 but uses `@types/node` 25, which can allow code that type-checks but is unavailable on the minimum runtime.
- There is no lint/format script, while style already differs across source files.

Impact:

Releases can report inconsistent versions, documentation can mislead agents, and CI can miss stale snapshots or minimum-runtime incompatibilities.

Recommendation:

- Establish one version source and test the CLI value against `package.json`.
- Regenerate or compare CLI fixtures in CI.
- Correct the documented JSON contract using actual fixture output.
- Align `@types/node` with the supported Node major, or test all APIs against Node 20 explicitly.
- Add a lightweight lint/format check and an unused-dependency check.

## Suggested remediation order

### First patch: request and credential safety

- Fix auth/body merge order and reject reserved/colliding keys.
- Make config writes atomic and enforce `0600`.
- Add regression tests for both.

### Second patch: CLI contract and input correctness

- Fix Commander error/exit handling.
- Split JSON and text file readers.
- Reject invalid numbers/arrays.
- Include confirmation metadata in human output.
- Add executable-level tests.

### Third patch: networking and diagnostics

- Correct endpoint URL handling.
- Normalize WSDL/request errors and add timeouts.
- Add strict health-check semantics for CI.

### Fourth patch: simplify and harden maintenance

- Remove or integrate the duplicate command scaffolds.
- Add schemas to high-risk operations.
- Align version, fixtures, docs, Node types, linting, and coverage checks.

## Positive observations

- The guarded-write model is centralized and easy to reason about.
- Dry-run avoids invoker construction and live network calls.
- Default recursive redaction covers credentials, common private material, and contact fields.
- API-reported `ERR_*` statuses are converted into structured application errors.
- The operation catalog is internally consistent across all 114 entries in the checks performed.
- TypeScript strict mode, ESM output, source maps, and declaration generation are configured successfully.
- CI avoids authenticated writes and the production dependency audit is clean.
