# Code Quality Remediation Plan and Multi-Agent Workflow

Date: 2026-07-10
Source review: `docs/code-quality-review-2026-07-10.md`
Baseline commit: `91d5965037c6292fefa49f5834f1960da4c49053`
Initial state: planned; implementation has not started

## Objective

Resolve CQ-01 through CQ-12 without live guarded writes, without losing the existing dirty-worktree changes, and without allowing an implementation worker to sign off its own work.

The workflow follows the bounded-backlog swarm model, adapted to this repository. The repository does not contain the ADG SQL backlog, `agent:loop`, audit-event commands, or an enforced `ADG_WRITE_SCOPE` hook, so this plan and the adjacent status JSON are the source of truth. Write scopes are review controls rather than sandbox-enforced controls.

## Non-negotiable controls

- Do not run a live `--confirm` command. Use fake invokers, offline fixtures, and dry-runs.
- Do not add credentials, real SOAP payloads, config files, generated logs, or `.env` files.
- The parent/orchestrator alone updates `code-quality-remediation-status.json`, integrates overlapping paths, stages/commits, and edits already-dirty files.
- A worker gets one bounded packet, writes only within its declared scope, and stops if a new path is required.
- A different read-only verifier reviews and tests each wave.
- Failed checks remain visible. A packet returns to `in_progress`; it is not weakened or silently deferred.
- Concurrent packets must have disjoint write scopes. Shared paths are scheduled in separate waves.
- Format-only changes are last and separate from behavioral changes.
- The public WSDL may be read for diagnostics/schema confirmation. Network availability is recorded separately from deterministic local gates.

## Baseline protection

The plan was created on `main` with user-owned changes already present in:

- `.github/workflows/ci.yml`
- `docs/api-coverage-matrix.md`
- `fixtures/coverage/api-surfaces.json`
- `.claude/commands/feature-parity-adg.md`
- `DEFINITION_OF_DONE.md`
- `docs/code-quality-review-2026-07-10.md`
- `docs/commercial-cli-marketing-platform-report.md`

Before implementation, the parent must record `git status --short`, save the baseline diff, and preferably checkpoint the user work on an appropriate branch/commit. Workers must not edit the three already-modified integration files; the parent reconciles them after worker delivery.

## Definition of resolved

A finding moves through `planned -> in_progress -> implemented -> verified`. It is resolved only when:

1. its implementation acceptance criteria pass;
2. its targeted tests pass;
3. an independent verifier has reviewed the diff and rerun the evidence;
4. the final release gate remains green; and
5. documentation and fixtures describe the resulting behavior.

`blocked` requires a concrete dependency, failed command, missing contract detail, or user decision. It is not a synonym for unfinished.

## Finding-by-finding remediation

### CQ-01 — Request integrity and trusted authentication

Priority/risk: P1 / L3 sensitive
Complexity: medium, approximately 1–2 implementation days
Packets: PKT-01 and PKT-04

Root cause:

- `materializePayload()` creates explicit fields and then `Object.assign(payload, body)` overwrites them.
- `withAuth()` adds configured credentials first and spreads the user payload afterward.
- `Object.assign` also exposes structural keys such as `__proto__`; a polluted prototype can affect resource lookup without appearing in serialized own properties.
- The same ambiguous payload drives the confirmation token and live request.

Implementation:

1. Add a centralized top-level payload-key validator.
2. Reject `resellerID`, `apiKey`, `__proto__`, `prototype`, and `constructor` in typed bodies and raw data.
3. For typed bodies, reject keys that collide with any explicit positional or option parameter other than `body`.
4. Use separate body and explicit-field objects; merge body first and explicit typed values last as defense in depth.
5. Change auth assembly to `{ ...payload, resellerID, apiKey }` so trusted config is final even if a caller bypasses validation.
6. Return `ERR_PAYLOAD_COLLISION` with field names only—never rejected values.
7. Preserve body-only confirmation resources such as hosting purchase `domain` and SSL purchase `commonName`.
8. Document that raw callers must supply credentials through environment/config/global flags, not `--data`.

Tests:

- Auth, positional, typed-option, and structural-key collision cases.
- Valid supplemental body and body-only confirmation-resource cases.
- Raw auth collision rejected before invoker construction.
- Fake-invoker live-path assertion that auth and guard resource match the exact request.
- Executable JSON errors contain no submitted credential value.

Acceptance:

- User input cannot replace auth or explicit typed arguments.
- Guard token and serialized request always identify the same resource.
- Structural keys cannot alter payload prototypes.
- Non-colliding bodies and raw calls continue to work.
- No regression test reaches the live API.

Dependencies/rollback:

- Coordinate `register.ts` with CQ-04, CQ-05, and CQ-11.
- Coordinate `soap-client.ts` with CQ-08 and CQ-09.
- Reverting collision rejection is possible, but auth-last assembly must remain.

### CQ-02 — Stable CLI error and exit contract

Priority/risk: P1
Complexity: medium, approximately 1–2 days
Packet: PKT-02

Root cause:

- `run()` treats all `commander.*` errors as success.
- Commander can print before the application catch boundary.
- JSON mode is normally populated in `preAction`, which does not run after parse failure.
- `exitOverride()` is configured after child creation, and generated groups use `new Command()` plus `addCommand()`, which may not inherit the root error/output settings.

Implementation:

1. Configure exit override and output handling before any child commands are created.
2. Make generated groups inherit settings by using `current.command(name)` or explicitly copying inherited settings before `addCommand()`.
3. Suppress Commander's default parser-error printing and format exactly once in `run()`.
4. Detect `--json` from the original argv for parse-failure paths.
5. Treat only help/version signals as exit 0; map all other parser failures to `ERR_CLI` and exit 1.
6. Retain `bin.ts` only as an unexpected top-level rejection boundary and prevent duplicate output.

Tests:

- Unknown root option/command, generated subcommand error, missing positional, missing required option, missing option value, and excess argument.
- `--json` before and after a subcommand.
- `--help`, explicit `help`, and `--version` remain successful.
- Assert exit code, stdout/stderr channel, one valid JSON document, and no duplicate error.

Acceptance:

- Every syntax failure exits 1.
- Every JSON syntax failure emits exactly one structured stdout error and no human parser message.
- Human failures emit one concise stderr error.
- Help/version exit 0.
- Generated commands cannot terminate outside `run()`.

Dependencies/rollback:

- Shares `register.ts` group creation with PKT-01, so it starts only after PKT-01 is integrated or limits its change to an agreed helper.
- A silent parser failure is the main regression risk; exhaustive error-path tests are required before merge.

### CQ-03 — Atomic, permission-safe config persistence

Priority/risk: P1 / L3 credential handling
Complexity: medium, approximately 1 day
Packet: PKT-03

Implementation:

1. Create the destination directory where needed; new application-owned directories use `0700`.
2. Create an exclusive temporary file in the same directory with `0600`.
3. Write the complete TOML, flush, close, and atomically rename over the destination.
4. Explicitly `chmod` the final file to `0600` after rename.
5. Remove temporary files on pre-rename failure and preserve the old config.
6. Normalize failures as `ERR_CONFIG_WRITE` without including credentials.
7. Do not blindly chmod an arbitrary existing parent supplied through `--config`.

Tests:

- Existing `0644` file becomes `0600`.
- New file is `0600`; a newly created default app directory is `0700`.
- Written TOML reloads correctly.
- Simulated write failure leaves the prior file intact and removes temporary files.
- Repeated writes never produce partial TOML.
- POSIX mode assertions are platform-gated.

Acceptance:

- Every successful write ends with a `0600` file.
- No credential-bearing temporary file is broader than `0600`.
- Failed writes do not corrupt the last valid config.
- Errors contain no secret values.

Risk/rollback:

Atomic replacement replaces a destination symlink instead of following it. That is the safer behavior and should be documented. The change is isolated to config persistence.

### CQ-04 — Separate JSON and text file inputs

Priority/risk: P1
Complexity: small–medium, approximately 0.5–1 day
Packet: PKT-01

Implementation:

1. Replace the overloaded helper with `readJsonValue` and `readTextValue`.
2. JSON `@file` input reads UTF-8 and then parses JSON.
3. Text `@file` input returns exact UTF-8 text, preserving PEM newlines and terminal newline.
4. Route body/raw data through JSON reading and `csr`/`newCSR` through text reading.
5. Distinguish `ERR_FILE_READ` from `ERR_JSON_PARSE`; include label/path, never content.

Tests/acceptance:

- Inline and file-based PEM inputs arrive unchanged at a fake invoker.
- Reissue dry-run succeeds with a PEM file and keeps it redacted.
- Missing file returns `ERR_FILE_READ`; malformed JSON file returns `ERR_JSON_PARSE`.
- Valid body/data behavior remains compatible.

Dependencies:

Must be implemented with or after CQ-05 because both change `utils.ts`, and with CQ-01 because both change `register.ts`.

### CQ-05 — Strict scalar and array parsing

Priority/risk: P2
Complexity: small
Packet: PKT-01

Implementation:

1. Convert numeric input once and reject non-finite results with `ERR_NUMBER_PARSE`.
2. Normalize malformed JSON-array syntax and non-string members to `ERR_ARRAY_PARSE`.
3. Add only constraints verified by the authoritative API contract. Do not invent ranges from summaries.
4. Where verified, represent integer/min/max constraints in parameter metadata or operation schemas and validate before guard evaluation.

Tests/acceptance:

- `--years nope`, `Infinity`, and other non-finite input fail before dry-run/invoker creation.
- No successful request or dry-run serializes `NaN` as `null`.
- Malformed arrays consistently return `ERR_ARRAY_PARSE`.
- Existing verified maximum limits still work at boundary and fail above boundary.

### CQ-06 — Human-mode safety metadata

Priority/risk: P2
Complexity: small
Packet: PKT-02

Implementation:

1. Render redacted result metadata in human mode instead of discarding it.
2. Use an explicit, stable human section for `dryRun`, `expectedConfirm`, `guard`, `raw`, and live markers.
3. Keep the JSON envelope unchanged.
4. Ensure metadata passes through the same redaction policy as data.

Tests/acceptance:

- Human dry-run visibly prints the exact confirmation token.
- Human live/raw markers are present where applicable.
- Secret-like metadata is redacted.
- String-only human results remain readable and snapshot-stable.

### CQ-07 — Diagnostic versus strict health-check semantics

Priority/risk: P2
Complexity: medium
Packets: PKT-02, PKT-10, and parent integration PKT-11

Implementation:

1. Preserve plain `doctor` as an offline-friendly diagnostic report.
2. Add `doctor --strict` for CI/release use; fail non-zero when required WSDL reachability/status checks fail.
3. Do not make missing credentials a strict failure because doctor explicitly does not require auth.
4. Bound fetch time with `AbortSignal.timeout`; record status/failure category safely.
5. Update `smoke`, CI, AGENTS, README, and both mirrored skills to use/describe strict mode where release health is intended.

Tests/acceptance:

- Plain doctor reports unreachable WSDL without hanging.
- Strict doctor returns a structured failure/non-zero exit for timeout, connection failure, or non-success status.
- Reachable WSDL succeeds in strict mode.
- Deterministic tests mock fetch; the live WSDL check remains a separately recorded read-only probe.

Dependencies:

Shares `cli.ts` with CQ-02/CQ-12 and output behavior with CQ-06; the same worker owns all three behavioral changes.

### CQ-08 — Separate base, WSDL, and SOAP endpoint URLs

Priority/risk: P2
Complexity: medium
Packet: PKT-04

Root cause:

One `apiUrl` currently represents three different concepts, and the client appends `:443/server.php` to the complete string.

Implementation:

1. Model API base, WSDL URL, and optional SOAP endpoint override separately in config/types.
2. Trust the WSDL `soap:address` by default.
3. Support an explicit SOAP endpoint override for mocks/proxies; construct/validate it with `URL` rather than string concatenation.
4. Preserve protocol, hostname, selected port, and intended pathname.
5. Validate protocols and return `ERR_CONFIG_URL` for malformed values.
6. Update help/docs only if a new public override flag/environment variable is introduced.

Tests/acceptance:

- Default production WSDL continues to construct a usable client.
- Alternate HTTP/HTTPS hosts, explicit ports, paths, and endpoint overrides are represented exactly.
- No URL contains a second port or `base:443` pathname artifact.
- Local fake WSDL/client tests require no credentials.

Risk/rollback:

Endpoint behavior is contract-sensitive. Retain a compatibility test for the current production URL and avoid guessing an alternate service path.

### CQ-09 — Normalize and bound SOAP initialization/request failures

Priority/risk: P2
Complexity: medium
Packet: PKT-04

Implementation:

1. Normalize WSDL initialization failures separately as `ERR_WSDL_LOAD` with retryable context.
2. Keep request failures as `ERR_SOAP_REQUEST` and unknown operations as non-retryable `ERR_OPERATION_UNKNOWN`.
3. Clear a rejected cached client promise so a later programmatic attempt can initialize again.
4. Bound WSDL download and SOAP request duration using supported node-soap/Axios options.
5. Never automatically replay a write. Retry metadata is guidance to the caller, not permission to repeat a guarded operation.
6. Apply the same normalization to `listOperations()`.

Tests/acceptance:

- WSDL rejection, timeout, TLS/DNS-style failure, request rejection, and unknown operation map to the expected stable codes.
- A failed initialization can be retried on the same client instance.
- Concurrent initialization still creates at most one active client promise.
- No code automatically reinvokes a failed write.

Dependencies:

CQ-08 and CQ-09 share one worker because they redesign `soap-client.ts`; trusted auth finalization from CQ-01 lands in the same packet.

### CQ-10 — Replace unreachable scaffolds with production tests

Priority/risk: P2
Complexity: medium
Packets: PKT-09 and parent integration PKT-11

Implementation:

1. Confirm with repository-wide search that the two hand-built command trees have no runtime/public consumers.
2. Delete `src/commands/services.ts`, `src/commands/domain-dns.ts`, and their two fake-builder test files.
3. Add catalog-derived invariants: unique paths/operations/options, positional agreement/order, read/write guard consistency, resource-field validity, command discoverability, and schema coverage for every body-backed operation.
4. Add executable integration tests for CQ-01 through CQ-08 using only offline/dry-run commands.
5. Run executable tests after build, either through a dedicated `test:cli` script or an explicit CI step.
6. Parent replaces the stale coverage-matrix/fixture surfaces with `catalog-contract` and `cli-integration` without losing current user edits.

Tests/acceptance:

- No source/test reference to the deleted scaffolds remains.
- Expected operation count is derived from `OPERATIONS`, not hard-coded.
- Removing a mounted command, weakening a guard, duplicating a path, or leaving a body operation without a schema fails tests.
- All regression probes exercise the shipped CLI boundary.
- Check, tests, build, and diff check pass after deletion.

Risk/rollback:

Undocumented source-path consumers are possible but unlikely because neither file is exported. The parent must confirm with `rg`; restoring the four files is an isolated rollback.

### CQ-11 — Contract schemas for all body-backed typed operations

Priority/risk: P2 / L3 billable/service payloads
Complexity: large
Packets: PKT-05 through PKT-08 plus PKT-08I

Scope:

There are 26 affected operations:

- Domains (10): `domainRegister`, `transferDomain`, `renewDomain`, `restoreDomain`, `updateContact`, `updateXXXMembershipDetails`, `initiateAUCOR`, `createDomainCategory`, `updateDomainCategory`, `initiateCorrection`.
- DNS (8): `addDNSRecord`, `updateDNSRecord`, `addMailForward`, `deleteMailForward`, `addSimpleURLForward`, `deleteSimpleURLForward`, `DNSSECAddDS`, `DNSSECRemoveDS`.
- Hosting/SSL/M365 (8): `hostingPurchaseService`, `hostingRecreateService`, `SSL_generateCSR`, `SSL_purchaseSSLCertificate`, `SSL_renewSSLCertificate`, `subscriptionCreateClient`, `subscriptionUpdateClient`, `subscriptionPurchase`.

Implementation:

1. Create a schema contract/registry foundation using the existing Zod dependency.
2. Obtain required, optional, and conditional fields from the authoritative v3.17 contract/WSDL; do not infer billable fields from summaries.
3. Assign three parallel workers to domain, DNS, and hosting/SSL/M365 schema modules with disjoint files.
4. Use strict schemas and discriminated unions where record/product/extension rules require them.
5. Integrate the registry with `OperationDefinition` and validate the merged unauthenticated payload after collision/parsing but before limits, guard derivation, dry-run, or invoker construction.
6. Return `ERR_BODY_VALIDATION` with safe issue path/code/expected type only; never echo submitted values.
7. Use the normalized payload for the confirmation resource and final request.
8. Keep raw `request call` as the guarded escape hatch; it receives structural/auth-key validation but not typed operation schemas.

Tests/acceptance:

- Registry invariant proves 26/26 coverage.
- Each schema has a valid fixture plus missing-required, wrong-type, and unknown-field cases.
- Representative billable/service commands fail before guard evaluation and invoker construction.
- Valid contract examples serialize to expected SOAP shapes.
- Confirmation tokens use validated resources and validation details remain redacted.
- There is no global schema-bypass flag.

Dependencies/rollback:

- CQ-01, CQ-04, and CQ-05 establish the parsing/collision boundary first.
- Strict schemas may reject valid conditional/new API fields. Mitigate with sourced contract fixtures and explicit schema updates, not permissive fallback.
- Registry integration can be reverted without removing the schema modules, but a release must not claim CQ-11 resolved while bypassed.

### CQ-12 — Single-source release metadata and enforce maintenance gates

Priority/risk: P3
Complexity: medium
Packets: PKT-10 and parent integration PKT-11

Implementation:

1. Make `package.json` the single version source and verify the bundled Node 20 artifact reads it reliably.
2. Add `scripts/cli-fixtures.mjs --check|--write` for built help/version fixtures.
3. Correct both Codex/Claude safety references to match actual success/error envelopes and `ERR_CONFIRM_REQUIRED`.
4. Add mirror-equality checks for agent references.
5. Align `@types/node` with Node 20.
6. Add Biome for lint/format, Knip for unused dependencies, and Vitest V8 coverage, with `biome.json` and `knip.json` as explicit configuration sources.
7. Measure the remediated baseline before setting thresholds; suggested initial global floors are 60% lines/statements and 50% branches/functions, with stronger expectations for guards, redaction, payload parsing, and output.
8. Update CI order: install -> type/lint/format/dependency checks -> build -> unit/integration/fixture/coverage checks -> strict doctor -> production audit -> contract validation.
9. Apply formatting as a separate final mechanical change.

Tests/acceptance:

- CLI/package/fixture versions match from one source.
- Help/version fixture check fails on drift.
- Both safety references are byte-identical and use runtime-verified examples.
- Node 20 typecheck/build/integration pass.
- Lint, format-check, dependency, coverage, and fixture scripts pass in CI.
- Zod is used after CQ-11 rather than removed.

Dependencies/rollback:

CQ-07, CQ-10, and CQ-11 land first. Tooling additions should be separate commits so each can be reverted independently; do not lower exclusions/thresholds to make sign-off green.

## Supplemental safety packet discovered during deep review

### SF-01 — Structured redaction and complete guard matrix

`DEFINITION_OF_DONE.md` independently classifies heuristic redaction as P0. This was not one of CQ-01 through CQ-12, but final production-readiness sign-off would be misleading if it remained open.

Packet: PKT-S1
Priority/risk: P0 / L3 sensitive

Plan:

1. Replace substring matching—especially generic `"key"`—with exact normalized secret field names plus explicit operation/path rules.
2. Decide and document the meaning of `OperationDefinition.includeSecrets`; rename it if needed and wire the metadata into response redaction rather than leaving it unused.
3. Preserve string-level SOAP/JSON/TOML environment-key scrubbing for unstructured error text.
4. Add positive leak-prevention tests and negative tests proving benign names such as `keyword` and `pubkey` are not blindly masked.
5. Test every guard level, read bypass, missing/mismatched/exact tokens, raw documented/experimental paths, and invoker short-circuiting.
6. Never use real secrets in fixtures.

Acceptance:

- Exact/path-based policy and its limitations are documented.
- Known credential/private/contact fields are redacted recursively in data, metadata, and errors.
- Benign lookalike fields remain visible.
- Every guard level has explicit regression coverage.

Other Definition-of-Done gaps such as a standing live-write audit log and rate-limit policy remain separate product-readiness work; they are not silently included in CQ-01 through CQ-12.

## Multi-agent execution workflow

### Roles

- Parent/orchestrator: owns status, baseline protection, packet assignment, integration, dirty-file reconciliation, and final report.
- Implementation worker: loads only its packet plus directly named files, edits only its write scope, runs narrow checks, and returns a compact handoff.
- Schema workers: use the common schema contract and authoritative API source, but each owns one disjoint schema family.
- Verifier: read-only, independent of the implementation packet, reruns evidence and reviews safety invariants.

### Standard worker handoff

Every worker returns only:

- packet ID and covered findings;
- files changed/deleted;
- checks run with pass/fail;
- acceptance criteria proven;
- unresolved risk or required out-of-scope path;
- concise diff summary.

Workers do not stage, commit, edit the status file, weaken tests, or claim verified.

Implementation-agent task template:

```text
Implement <PACKET-ID> only. Read docs/remediation/code-quality-remediation-plan.md only for
that packet, then read the files named in its writeScope. Do not edit outside writeScope.
Do not run live --confirm operations or use real credentials. Run the packet checks and
report: files changed, pass/fail evidence, acceptance criteria proven, unresolved risks,
and any required out-of-scope path. Do not stage, commit, or edit the status JSON.
```

Verifier-agent task template:

```text
Verify <VERIFY-ID> read-only. Review the integrated diff for its dependent packets, rerun
every listed check and regression probe, and compare results with each finding's acceptance
criteria. Do not edit or weaken code/tests. Return GO or NO-GO with exact failing evidence,
security/behavior regressions, and any unproven criterion.
```

### Wave 0 — Parent preflight

Packet PKT-00:

- preserve/checkpoint the current dirty worktree;
- record baseline SHA/status/diff;
- create or switch to a `codex/` remediation branch only with user work preserved;
- confirm no credentials are present;
- run baseline `check`, `test`, `build`, doctor, and production audit;
- update status from `planned` to `ready`.

### Wave 1 — Core safety, maximum three parallel workers

Run concurrently because scopes are disjoint:

- PKT-01: CQ-01 partial plus CQ-04/CQ-05 — `register.ts`, `utils.ts`, input-integrity tests.
- PKT-02: CQ-02/CQ-06/CQ-07 — `cli.ts`, `output.ts`, CLI/doctor tests.
- PKT-03: CQ-03 — `config.ts`, config tests.

Parent integrates in packet order and resolves any narrow `register.ts` inherited-settings need from PKT-02. VERIFY-1 then reviews/reruns the entire wave.

VERIFY-1 is intermediate for CQ-01 and CQ-07: it may accept the wave's partial implementation evidence, but it cannot move CQ-01 to `verified` before VERIFY-2 or CQ-07 before VERIFY-5.

### Wave 2 — SOAP boundary and supplemental safety

After VERIFY-1:

- PKT-04: CQ-01 auth finalization plus CQ-08/CQ-09 — config/type URL model, `soap-client.ts`, SOAP tests.
- PKT-S1: structured redaction and guard matrix — `redact.ts`, `guards.ts`, dedicated tests.

PKT-04 and PKT-S1 run concurrently after the parent confirms their actual scopes are disjoint. After PKT-04 is integrated, PKT-05 creates the schema contract/helpers and worker guide; it is serialized because it may reuse shared types. VERIFY-2 independently checks the completed wave.

### Wave 3 — Three schema families in parallel

After PKT-05/VERIFY-2:

- PKT-06: ten domain schemas and fixtures.
- PKT-07: eight DNS schemas and fixtures.
- PKT-08: eight hosting/SSL/M365 schemas and fixtures.

Workers may not edit the shared registry. After their handoff, parent-owned PKT-08I performs the registry/type/catalog/registration integration and runs the 26/26 invariant. VERIFY-3 reviews contract sourcing, safe validation errors, and representative serialized payloads.

### Wave 4 — Production tests and dead-code removal

PKT-09 resolves CQ-10 after behavior is stable:

- delete unreachable scaffolds/tests;
- add catalog-contract tests;
- add built-executable integration tests covering final behavior;
- report required coverage-matrix/fixture changes to the parent.

VERIFY-4 confirms no consumer/reference remains and regression probes exercise `dist/bin.js`.

### Wave 5 — Maintenance and parent integration

PKT-10 resolves CQ-12 in bounded substeps: version/fixture generation, mirrored docs, Node type alignment, then tooling. Parent alone reconciles:

- `.github/workflows/ci.yml`;
- `docs/api-coverage-matrix.md`;
- `fixtures/coverage/api-surfaces.json`;
- the accuracy of `DEFINITION_OF_DONE.md`.

Apply format-only output last. VERIFY-5 runs the complete release gate and produces GO/NO-GO with explicit deferrals.

## Verification gates

Narrow packet gate:

```sh
npm run check
npx vitest run tests/<packet-test>.test.ts
npm run build
git diff --check
```

Final deterministic gate after tooling is added:

```sh
npm ci
npm run check
npm run lint
npm run format:check
npm run depcheck
npm run build
npm test
npm run test:cli
npm run test:coverage
npm run fixtures:check
node dist/bin.js --version
npm audit --omit=dev
git diff --check
```

Read-only environment gate:

```sh
node dist/bin.js --json doctor --strict
```

The final verifier also reruns one offline regression probe for every CQ item. A public-WSDL outage is recorded as environmental evidence and does not justify weakening deterministic gates.

## Completion evidence matrix

| Finding | Primary packet(s) | Independent verifier | Required evidence |
| --- | --- | --- | --- |
| CQ-01 | PKT-01, PKT-04 | VERIFY-1/2 | collision, structural-key, auth-last, fake-invoker tests |
| CQ-02 | PKT-02 | VERIFY-1 | parser exit/channel matrix against generated commands |
| CQ-03 | PKT-03 | VERIFY-1 | mode, atomic failure, valid reload tests |
| CQ-04 | PKT-01 | VERIFY-1 | exact PEM and distinct file/JSON errors |
| CQ-05 | PKT-01 | VERIFY-1 | non-finite and malformed-array failures |
| CQ-06 | PKT-02 | VERIFY-1 | human dry-run metadata snapshot |
| CQ-07 | PKT-02 | VERIFY-1/5 | mocked strict failures plus read-only WSDL probe |
| CQ-08 | PKT-04 | VERIFY-2 | default/custom URL table tests |
| CQ-09 | PKT-04 | VERIFY-2 | normalized failure, timeout, cache-reset, no-replay tests |
| CQ-10 | PKT-09 | VERIFY-4 | dead-code search, catalog invariants, built CLI suite |
| CQ-11 | PKT-05–08I | VERIFY-3 | sourced schemas, 26/26 coverage, safe failures |
| CQ-12 | PKT-10 | VERIFY-5 | version/fixture/docs equality and all CI gates |
| SF-01 | PKT-S1 | VERIFY-2/5 | redaction positive/negative and guard-matrix tests |

## Estimated delivery shape

- Core P1/P2 runtime fixes: 3–5 focused implementation days with parallel workers.
- Full 26-operation schema work: 3–6 days depending on authoritative contract complexity.
- Test cleanup/tooling/docs/final integration: 2–3 days.
- Expected total elapsed time with three implementation slots and independent verification: approximately 6–10 working days, subject to API-schema ambiguity and current dirty-worktree reconciliation.

These are planning estimates, not deadlines. Safety findings and contract ambiguity take precedence over schedule.
