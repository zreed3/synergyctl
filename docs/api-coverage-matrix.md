# API Coverage Matrix

| ID | Area | Primary files | Check | Notes |
| --- | --- | --- | --- | --- |
| cli-root | CLI | `src/bin.ts`, `src/cli.ts`, `src/index.ts`, `package.json` | `node dist/bin.js --help` | Binary and root command wiring |
| operation-catalog | CLI/API | `src/operations.ts` | `node dist/bin.js --json operations list` | Public v3.17 typed operation surface and guard classes |
| command-runtime | CLI/API | `src/commands/register.ts` | `tests/core.test.ts` | Generic command mounting, raw calls, dry-run behavior |
| auth-config | Runtime | `src/config.ts` | `tests/core.test.ts` | Env, config TOML, and one-off flag resolution |
| soap-client | Runtime | `src/soap-client.ts` | `node dist/bin.js --json doctor` | WSDL reachability and SOAP invocation |
| guardrails | Runtime | `src/guards.ts`, `src/redact.ts`, `src/output.ts` | `tests/core.test.ts` | Confirmation tokens, JSON envelope, redaction |
| domain-dns-tree | CLI tree | `src/commands/domain-dns.ts` | `tests/domain-dns.test.ts` | Worker-maintained domain/DNS command tree scaffold |
| service-tree | CLI tree | `src/commands/services.ts` | `tests/services.test.ts` | Worker-maintained service command tree scaffold |
| human-docs | Docs | `README.md`, `docs/license-guidance.md` | CI contract validation | Human setup, safety, and license guidance |
| agent-docs | Docs | `AGENTS.md` | CI contract validation | Repository operating rules for future agents |
| codex-skill | Skill | `skills/synergyctl/SKILL.md`, `skills/synergyctl/agents/openai.yaml` | skill validator | Runtime Codex skill for safe CLI use |
| claude-skill | Skill | `.claude/skills/synergyctl/SKILL.md` | CI contract validation | Portable Claude skill for safe CLI use |
| maintenance-skills | Skill | `skills/synergyctl-maintenance/SKILL.md`, `.claude/skills/synergyctl-maintenance/SKILL.md` | CI contract validation | Repo contract maintenance guidance |
| claude-commands | Claude | `.claude/commands/*.md` | CI contract validation | Bootstrap, coverage audit, and license audit commands |
| fixtures | Fixtures | `fixtures/coverage/api-surfaces.json`, `fixtures/cli/*` | CI contract validation | Machine-readable surface inventory and snapshots |
| license-pack | Legal | `LICENSE`, `NOTICE` | CI contract validation | PolyForm Noncommercial and Otterblock notice |
| ci-validation | CI | `.github/workflows/ci.yml` | GitHub Actions | Node checks plus contract validation |
