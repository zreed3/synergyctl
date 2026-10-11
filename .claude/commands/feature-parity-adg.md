# feature parity adg

Run an evidence-first feature parity audit against an included Markdown specification.

Expected use:

```text
/feature-parity-adg @path/to/spec.md
/feature-parity-adg spec=@path/to/spec.md output=docs/feature-parity-audit.md
/feature-parity-adg spec=@path/to/spec.md adg=dry-run
```

Treat `$ARGUMENTS` as the full user-supplied instruction string. If it contains a bare file reference, treat that as the specification. If no specification path or pasted Markdown specification is present, ask for the spec and stop.

## Mission

Compare the included specification with this repository and produce audit-grade feature parity evidence, implementation plans, backlog items, work-log records, and an ADG append package. The default outcome is approval-ready artifacts, not live ADG mutation.

Use Claude Code like an engineering harness:

- Explore first, then plan, then audit.
- Keep context tight and high signal. Load files just in time with `rg`, file paths, and targeted reads instead of dumping the whole repo into context.
- Work in small, concrete chunks with fast verification loops.
- Treat prompts as executable programs: explicit roles, inputs, outputs, gates, and checks.
- Let the model generate, but make verification the bottleneck. Every decision needs evidence.
- Prefer examples, schemas, and exact output formats over broad prose.
- Ask only for blocking missing context. Otherwise infer from repository evidence and record assumptions.
- Keep autonomy on a leash: no billable, destructive, credential-changing, service-changing, customer-email-triggering, or live ADG append action without explicit user approval.

## Repository Rules

Before audit work, read:

- `AGENTS.md`
- `README.md`
- `package.json`
- `docs/api-coverage-matrix.md`
- `fixtures/coverage/api-surfaces.json`

Honor these repo-specific constraints:

- Prefer typed `synergyctl` commands over `request call`.
- Use `--json` whenever command output must be parsed.
- Never pass live `--confirm` unless the user explicitly asked for that exact live operation.
- Use `--dry-run` first for billable, destructive, credential-changing, service-changing, or customer-email-triggering operations.
- Do not expose or commit credentials, SOAP payloads containing secrets, generated logs, `.env` files, or local config files.
- If the operation/catalog surface changes, keep `docs/api-coverage-matrix.md` and `fixtures/coverage/api-surfaces.json` aligned.
- If agent workflow rules change, keep Codex and Claude skills aligned.

## Execution Model

Do not simulate 50 named agents in prose. Use actual Claude Code subagents only when they reduce context load or improve independent verification. If subagents are unavailable, run the same workstreams sequentially in the main session.

Scale effort to task complexity:

- Small spec or narrow audit: main agent plus optional reviewer.
- Medium audit: up to 4 focused subagents.
- Large audit: up to 8 focused subagents, split by independent domains.
- Never spawn broad or duplicate investigations. Each subagent must have a bounded objective, allowed files/tools, output schema, and stop condition.

Recommended workstreams:

1. Spec extraction: requirements, business rules, acceptance criteria, workflows, integrations, permissions.
2. Repo inventory: CLI commands, operation catalog, command trees, shared runtime, docs, tests, fixtures, skills, CI.
3. Parity mapping: spec requirement to implementation evidence.
4. Risk review: security, live-operation safety, credential handling, data impact, rollback.
5. Delivery planning: implementation plan, tests, docs, sequencing.
6. Backlog and ADG package: append-only package with duplicate checks.
7. Fresh-context review: adversarial review of gaps, evidence, and proposed backlog.

## Phase 0 - Bootstrap

1. Run `git status --short` and note unrelated user changes. Do not revert user work.
2. Read the repository rules listed above.
3. Parse `$ARGUMENTS` into:
   - `spec`: path, pasted Markdown, or attachment reference.
   - `output`: optional report path.
   - `adg`: one of `none`, `dry-run`, or `live-confirmed`; default `none`.
   - `implementation`: `audit-only` by default. Do not edit runtime code unless explicitly requested.
4. If dependencies are missing, run `npm install`.
5. Establish evidence conventions:
   - Code evidence: `path:line`, symbol name, and short behavior note.
   - Test evidence: test file, test name, or command output.
   - CLI evidence: command run with `--json` where possible.
   - Spec evidence: section heading or requirement id from the included spec.

## Phase 1 - Specification Extraction

Read the spec fully, then produce a normalized inventory. Assign stable ids:

- `REQ-###` for functional requirements.
- `BR-###` for business rules.
- `AC-###` for acceptance criteria.
- `WF-###` for workflows or state transitions.
- `INT-###` for integrations and APIs.
- `PERM-###` for roles, permissions, visibility, or entitlement rules.
- `NFR-###` for safety, reliability, performance, audit, or compliance requirements.

For each item, capture:

```text
id:
type:
source:
requirement:
acceptance_signal:
dependencies:
ambiguity:
```

Rules:

- Preserve concrete language from the spec, but do not over-quote.
- Split compound requirements into separately testable units.
- Mark ambiguous items instead of inventing meaning.
- Treat untestable marketing claims as context unless they imply observable behavior.

Gate 1 passes only when every extracted requirement has a source and an acceptance signal or an explicit ambiguity note.

## Phase 2 - Implementation Inventory

Discover implementation details from the repo, not memory. Start with targeted commands:

```bash
rg --files
rg -n "command|operation|guard|dry-run|confirm|redact|doctor|request call|operations list" src tests docs skills .claude
npm run build
node dist/bin.js --json operations list
node dist/bin.js --json doctor
```

If a command fails because credentials, network, or local config are unavailable, record the failure and continue with static evidence.

Inventory these surfaces:

- CLI entry and command registration: `src/bin.ts`, `src/cli.ts`, `src/commands/register.ts`.
- Typed operation catalog: `src/operations.ts`.
- Domain, DNS, hosting, SSL, M365, account, and product command trees.
- Runtime guardrails: config, SOAP client, guards, redaction, output, errors.
- Tests: `tests/**/*.test.ts`.
- Human docs, agent docs, skills, fixtures, CI, and coverage matrix.

Output schema:

```text
surface:
files:
implemented_behaviors:
tests_or_checks:
known_limits:
evidence:
```

## Phase 3 - Parity Matrix

Map every extracted item to implementation evidence.

Use these statuses:

- `implemented`: behavior is present and has evidence.
- `partial`: some behavior exists, but requirement is incomplete.
- `missing`: no implementation evidence found.
- `not-applicable`: requirement is outside this repo's stated scope.
- `needs-clarification`: spec ambiguity blocks a reliable decision.
- `blocked-by-live-system`: verification requires credentials, WSDL reachability, billing, customer email, or another live dependency.

Output schema:

```text
requirement_id:
status:
confidence: high | medium | low
spec_evidence:
implementation_evidence:
test_evidence:
gap:
decision_reason:
```

Rules:

- No evidence means no implementation credit.
- Do not claim consensus percentages unless independent subagent findings actually exist.
- Prefer line references and command outputs over summaries.
- Note stale docs, missing tests, and fixture drift as parity risks.

Gate 2 passes only when every requirement has a status, confidence, and evidence or a clear blocked reason.

## Phase 4 - Gap Enrichment

For each `partial`, `missing`, `needs-clarification`, or `blocked-by-live-system` item, answer:

Functional:

- What behavior is missing?
- What user outcome is blocked?
- What workflows are impacted?

Technical:

- Which services, command trees, operations, schemas, or runtime helpers are impacted?
- Which APIs or SOAP operations change?
- Are migrations or fixture updates required?

Risk:

- Security impact?
- Data impact?
- Credential, billing, destructive, service-changing, or customer-email risk?
- Rollback and dry-run strategy?

Delivery:

- Dependencies?
- Suggested sequence?
- Effort estimate?
- Required tests and docs?

Output schema:

```text
gap_id:
requirements:
missing_behavior:
user_impact:
technical_scope:
risk:
rollback:
dependencies:
effort:
evidence:
```

Gate 3 passes only when each gap has risk classification and repository evidence.

## Phase 5 - Implementation Plans

Create implementation plans only for real gaps. Keep plans small and reviewable.

For each plan:

```text
plan_id:
gap_ids:
goal:
files_to_change:
implementation_steps:
tests_to_add_or_update:
docs_or_fixture_updates:
dry_run_or_safety_checks:
verification_commands:
out_of_scope:
```

Rules:

- Prefer typed CLI commands and existing operation catalog patterns.
- Include docs and fixture alignment where the public surface changes.
- Include redaction, guardrail, JSON output, and dry-run behavior where relevant.
- Do not propose live writes as verification.
- Split plans that would create large diffs into smaller sequenced units.

## Phase 6 - Backlog And Work Logs

Generate backlog records only after Gates 1-3 pass for the relevant gap.

Backlog schema:

```text
epic:
feature:
story:
tasks:
acceptance_criteria:
risk_class:
implementation_plan:
verification:
traceability:
```

Work log schema:

```json
{
  "type": "WorkLog",
  "timestamp": "<ISO-8601>",
  "source_spec": "<spec path or title>",
  "source_feature": "<requirement ids>",
  "finding": "<gap or parity decision>",
  "decision": "<approved | blocked | needs-clarification>",
  "risk": "<risk class>",
  "approval_chain": ["spec-extraction", "parity-map", "risk-review", "fresh-context-review"],
  "evidence": ["<path:line or command>"]
}
```

Traceability must run:

```text
Spec -> Requirement -> Implementation Evidence -> Gap -> Plan -> Backlog -> WorkLog -> ADG Package
```

Gate 4 passes only when every backlog item has acceptance criteria, risk, implementation plan, verification commands, and traceability.

## Phase 7 - ADG Append Package

Default mode is `adg=none`: generate an append-ready package and stop.

If `adg=dry-run`, locate the ADG target by repository evidence or configured tools, perform duplicate checks, and produce a dry-run package. Do not mutate ADG.

If `adg=live-confirmed`, proceed only when the user explicitly authorized the exact ADG target and action in the current conversation. Even then:

1. Run duplicate checks first.
2. Show the append package.
3. Prefer a dry-run or validation command.
4. Append only if the target supports append-only writes and the user requested live append.

ADG package schema:

```json
{
  "mode": "none | dry-run | live-confirmed",
  "target": "<path/tool/system or unknown>",
  "duplicates_checked": true,
  "items": [
    {
      "type": "Epic | Feature | Story | Task | WorkLog",
      "title": "<title>",
      "body": "<body>",
      "traceability": ["REQ-001", "GAP-001", "PLAN-001"],
      "risk": "<risk class>",
      "evidence": ["<path:line or command>"]
    }
  ]
}
```

Gate 5 passes only when traceability is complete, duplicate checks ran, work logs exist, and the ADG mode is safe for the user's authorization level.

## Phase 8 - Verification

Run the narrowest useful checks for an audit-only task. For implementation changes, run the full release checks unless the user narrowed scope:

```bash
npm run check
npm test
npm run build
node dist/bin.js --json doctor
```

Before publishing, pushing, or release work, also run:

```bash
npm audit --omit=dev
```

If checks fail, report root causes. Do not hide failures by weakening tests, suppressing errors, or changing unrelated code.

## Final Output

Return a concise executive summary first, then the artifacts.

Required sections:

1. `Executive Summary`
2. `Inputs And Assumptions`
3. `Feature Inventory`
4. `Implementation Inventory`
5. `Parity Matrix`
6. `Gap Register`
7. `Risk Register`
8. `Implementation Plans`
9. `Approved Backlog`
10. `Approved Work Logs`
11. `ADG Append Package`
12. `Verification`
13. `Open Questions`

If `output=<path>` is supplied, write one Markdown report to that path and keep generated JSON package blocks inside the report unless the user asked for separate machine-readable files.

Success requires:

- 100% extracted specification coverage or explicit blocked reasons.
- Every parity decision backed by evidence.
- Every gap enriched with functional, technical, risk, and delivery answers.
- Every backlog item has acceptance criteria, implementation plan, risk class, verification, and traceability.
- ADG package is append-only, duplicate-checked, and aligned with authorization.
- No live guarded write or ADG mutation occurs without explicit user approval.
